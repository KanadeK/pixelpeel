import type { RgbaImageData } from './image-data'

export const MAX_IMAGE_PIXELS = 40_000_000

const HEADER_READ_LIMIT = 1024 * 1024

export type SupportedImageFormat = 'png' | 'jpeg' | 'webp'

export type ImageImportErrorCode =
  | 'unsupported-format'
  | 'invalid-image'
  | 'image-too-large'
  | 'processing-unavailable'
  | 'processing-failed'

export class PixelPeelImageError extends Error {
  readonly code: ImageImportErrorCode
  readonly width: number | undefined
  readonly height: number | undefined

  constructor(
    code: ImageImportErrorCode,
    message: string,
    options: { cause?: unknown; width?: number; height?: number } = {},
  ) {
    super(message, { cause: options.cause })
    this.name = 'PixelPeelImageError'
    this.code = code
    this.width = options.width
    this.height = options.height
  }
}

export interface DecodeImageOptions {
  readonly maxPixels?: number
}

export interface DecodedImage {
  readonly name: string
  readonly size: number
  readonly mimeType: string
  readonly format: SupportedImageFormat
  readonly width: number
  readonly height: number
  readonly imageData: RgbaImageData
}

interface DecodedSource {
  readonly source: CanvasImageSource
  readonly width: number
  readonly height: number
  readonly dispose: () => void
}

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((value, index) => bytes[index] === value)
}

export function detectImageFormat(
  bytes: Uint8Array,
): SupportedImageFormat | undefined {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'png'
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return 'jpeg'
  }
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'webp'
  }
  return undefined
}

function uint16BigEndian(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] ?? 0) * 256 + (bytes[offset + 1] ?? 0)
}

function uint24LittleEndian(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] ?? 0) +
    (bytes[offset + 1] ?? 0) * 256 +
    (bytes[offset + 2] ?? 0) * 65_536
  )
}

function parsePngDimensions(
  bytes: Uint8Array,
): { width: number; height: number } | undefined {
  if (bytes.length < 24) {
    return undefined
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

const JPEG_START_OF_FRAME_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
])

function parseJpegDimensions(
  bytes: Uint8Array,
): { width: number; height: number } | undefined {
  let offset = 2

  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1
      continue
    }

    while (bytes[offset] === 0xff) {
      offset += 1
    }
    const marker = bytes[offset]
    if (marker === undefined) {
      return undefined
    }
    offset += 1

    if (marker === 0xd8 || marker === 0x01) {
      continue
    }
    if (marker === 0xd9 || marker === 0xda || offset + 1 >= bytes.length) {
      return undefined
    }

    const segmentLength = uint16BigEndian(bytes, offset)
    if (segmentLength < 2 || offset + segmentLength > bytes.length) {
      return undefined
    }

    if (JPEG_START_OF_FRAME_MARKERS.has(marker) && segmentLength >= 7) {
      return {
        height: uint16BigEndian(bytes, offset + 3),
        width: uint16BigEndian(bytes, offset + 5),
      }
    }

    offset += segmentLength
  }

  return undefined
}

function parseWebpDimensions(
  bytes: Uint8Array,
): { width: number; height: number } | undefined {
  if (bytes.length < 30) {
    return undefined
  }

  const chunk = String.fromCharCode(
    bytes[12] ?? 0,
    bytes[13] ?? 0,
    bytes[14] ?? 0,
    bytes[15] ?? 0,
  )

  if (chunk === 'VP8X') {
    return {
      width: uint24LittleEndian(bytes, 24) + 1,
      height: uint24LittleEndian(bytes, 27) + 1,
    }
  }

  if (chunk === 'VP8L' && bytes[20] === 0x2f) {
    const bits =
      (bytes[21] ?? 0) |
      ((bytes[22] ?? 0) << 8) |
      ((bytes[23] ?? 0) << 16) |
      ((bytes[24] ?? 0) << 24)
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >>> 14) & 0x3fff) + 1,
    }
  }

  if (
    chunk === 'VP8 ' &&
    bytes[23] === 0x9d &&
    bytes[24] === 0x01 &&
    bytes[25] === 0x2a
  ) {
    return {
      width: ((bytes[26] ?? 0) | ((bytes[27] ?? 0) << 8)) & 0x3fff,
      height: ((bytes[28] ?? 0) | ((bytes[29] ?? 0) << 8)) & 0x3fff,
    }
  }

  return undefined
}

function parseHeaderDimensions(
  bytes: Uint8Array,
  format: SupportedImageFormat,
): { width: number; height: number } | undefined {
  if (format === 'png') {
    return parsePngDimensions(bytes)
  }
  if (format === 'jpeg') {
    return parseJpegDimensions(bytes)
  }
  return parseWebpDimensions(bytes)
}

function assertPixelLimit(
  width: number,
  height: number,
  maxPixels: number,
): void {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new PixelPeelImageError(
      'invalid-image',
      'The image reports invalid dimensions and cannot be used.',
      { width, height },
    )
  }

  if (width > maxPixels / height) {
    const megapixels = (width * height) / 1_000_000
    throw new PixelPeelImageError(
      'image-too-large',
      `This image is ${megapixels.toFixed(1)} MP. PixelPeel supports up to ${(maxPixels / 1_000_000).toFixed(0)} MP per image.`,
      { width, height },
    )
  }
}

function claimsSupportedFormat(file: File): boolean {
  return (
    ['image/png', 'image/jpeg', 'image/webp'].includes(
      file.type.toLowerCase(),
    ) || /\.(?:png|jpe?g|webp)$/i.test(file.name)
  )
}

function invalidImage(cause?: unknown): PixelPeelImageError {
  return new PixelPeelImageError(
    'invalid-image',
    'This file could not be decoded as a valid PNG, JPEG, or WebP image.',
    { cause },
  )
}

async function decodeWithHtmlImage(file: File): Promise<DecodedSource> {
  if (
    typeof Image === 'undefined' ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function' ||
    typeof URL.revokeObjectURL !== 'function'
  ) {
    throw new PixelPeelImageError(
      'processing-unavailable',
      'This browser cannot decode local images in the current context.',
    )
  }

  let objectUrl: string
  try {
    objectUrl = URL.createObjectURL(file)
  } catch (error) {
    throw new PixelPeelImageError(
      'processing-unavailable',
      'This browser could not open the local image.',
      { cause: error },
    )
  }

  const image = new Image()
  image.decoding = 'async'

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(invalidImage())
      image.src = objectUrl
    })
  } catch (error) {
    image.onload = null
    image.onerror = null
    image.src = ''
    URL.revokeObjectURL(objectUrl)
    throw error
  }

  image.onload = null
  image.onerror = null
  let disposed = false

  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    dispose: () => {
      if (!disposed) {
        disposed = true
        image.src = ''
        URL.revokeObjectURL(objectUrl)
      }
    },
  }
}

async function decodeSource(file: File): Promise<DecodedSource> {
  if (typeof createImageBitmap !== 'function') {
    return decodeWithHtmlImage(file)
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch (error) {
    throw invalidImage(error)
  }

  return {
    source: bitmap,
    width: bitmap.width,
    height: bitmap.height,
    dispose: () => bitmap.close(),
  }
}

export async function decodeImageFile(
  file: File,
  options: DecodeImageOptions = {},
): Promise<DecodedImage> {
  const maxPixels = options.maxPixels ?? MAX_IMAGE_PIXELS
  if (!Number.isSafeInteger(maxPixels) || maxPixels <= 0) {
    throw new RangeError('maxPixels must be a positive safe integer')
  }

  let header: Uint8Array
  try {
    const headerBuffer = await file
      .slice(0, Math.min(file.size, HEADER_READ_LIMIT))
      .arrayBuffer()
    header = new Uint8Array(headerBuffer)
  } catch (error) {
    throw invalidImage(error)
  }

  const format = detectImageFormat(header)
  if (!format) {
    if (claimsSupportedFormat(file)) {
      throw invalidImage()
    }
    throw new PixelPeelImageError(
      'unsupported-format',
      'Unsupported image. Choose a PNG, JPEG, or WebP file.',
    )
  }

  const headerDimensions = parseHeaderDimensions(header, format)
  if (headerDimensions) {
    assertPixelLimit(headerDimensions.width, headerDimensions.height, maxPixels)
  }

  const decoded = await decodeSource(file)
  let canvas: HTMLCanvasElement | undefined

  try {
    assertPixelLimit(decoded.width, decoded.height, maxPixels)

    if (typeof document === 'undefined') {
      throw new PixelPeelImageError(
        'processing-unavailable',
        'Canvas image processing is unavailable in the current context.',
      )
    }

    canvas = document.createElement('canvas')
    canvas.width = decoded.width
    canvas.height = decoded.height
    const context = canvas.getContext('2d', { willReadFrequently: true })

    if (!context) {
      throw new PixelPeelImageError(
        'processing-unavailable',
        'Canvas image processing is unavailable in this browser.',
      )
    }

    context.clearRect(0, 0, decoded.width, decoded.height)
    context.drawImage(decoded.source, 0, 0)
    const imageData = context.getImageData(0, 0, decoded.width, decoded.height)

    return {
      name: file.name,
      size: file.size,
      mimeType: file.type,
      format,
      width: decoded.width,
      height: decoded.height,
      imageData,
    }
  } catch (error) {
    if (error instanceof PixelPeelImageError) {
      throw error
    }
    throw new PixelPeelImageError(
      'processing-failed',
      'The image was decoded, but its pixels could not be read. It may be too large for this device.',
      { cause: error, width: decoded.width, height: decoded.height },
    )
  } finally {
    if (canvas) {
      canvas.width = 0
      canvas.height = 0
    }
    decoded.dispose()
  }
}
