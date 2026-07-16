export interface ImageDimensions {
  readonly width: number
  readonly height: number
}

export type RgbaImageData = ImageData

function assertDimension(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive safe integer`)
  }
}

export function assertValidImageData(image: RgbaImageData): void {
  assertDimension(image.width, 'Image width')
  assertDimension(image.height, 'Image height')

  const expectedLength = image.width * image.height * 4
  if (
    !Number.isSafeInteger(expectedLength) ||
    image.data.length !== expectedLength
  ) {
    throw new RangeError(
      `RGBA buffer length must be ${expectedLength}; received ${image.data.length}`,
    )
  }
}

export function createRgbaImageData(
  width: number,
  height: number,
  data?: Uint8ClampedArray,
): RgbaImageData {
  assertDimension(width, 'Image width')
  assertDimension(height, 'Image height')

  const expectedLength = width * height * 4
  if (!Number.isSafeInteger(expectedLength)) {
    throw new RangeError('Image dimensions are too large')
  }

  const pixels = data
    ? new Uint8ClampedArray(data)
    : new Uint8ClampedArray(expectedLength)
  const image: ImageData =
    typeof ImageData === 'undefined'
      ? { width, height, data: pixels, colorSpace: 'srgb' }
      : new ImageData(pixels, width, height)
  assertValidImageData(image)
  return image
}

export function toNativeImageData(image: RgbaImageData): ImageData {
  assertValidImageData(image)
  return new ImageData(
    new Uint8ClampedArray(image.data),
    image.width,
    image.height,
  )
}
