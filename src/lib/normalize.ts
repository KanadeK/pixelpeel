import {
  assertValidImageData,
  createRgbaImageData,
  type RgbaImageData,
} from './image-data'

export type ImageAlignment = 'top-left' | 'center'

export interface ImageOffset {
  readonly x: number
  readonly y: number
}

export interface NormalizedImage {
  readonly imageData: RgbaImageData
  readonly offset: ImageOffset
}

export interface NormalizedImagePair {
  readonly before: RgbaImageData
  readonly after: RgbaImageData
  readonly beforeOffset: ImageOffset
  readonly afterOffset: ImageOffset
  readonly width: number
  readonly height: number
  readonly dimensionsDiffer: boolean
  readonly alignment: ImageAlignment
}

function offsetFor(
  image: RgbaImageData,
  targetWidth: number,
  targetHeight: number,
  alignment: ImageAlignment,
): ImageOffset {
  if (alignment === 'top-left') {
    return { x: 0, y: 0 }
  }

  return {
    x: Math.floor((targetWidth - image.width) / 2),
    y: Math.floor((targetHeight - image.height) / 2),
  }
}

export function normalizeImageData(
  image: RgbaImageData,
  targetWidth: number,
  targetHeight: number,
  alignment: ImageAlignment = 'center',
): NormalizedImage {
  assertValidImageData(image)

  if (targetWidth < image.width || targetHeight < image.height) {
    throw new RangeError(
      'Target dimensions cannot be smaller than the source image',
    )
  }

  const normalized = createRgbaImageData(targetWidth, targetHeight)
  const offset = offsetFor(image, targetWidth, targetHeight, alignment)

  for (let y = 0; y < image.height; y += 1) {
    const sourceStart = y * image.width * 4
    const sourceEnd = sourceStart + image.width * 4
    const targetStart = ((y + offset.y) * targetWidth + offset.x) * 4
    normalized.data.set(
      image.data.subarray(sourceStart, sourceEnd),
      targetStart,
    )
  }

  return { imageData: normalized, offset }
}

export function normalizeImagePair(
  before: RgbaImageData,
  after: RgbaImageData,
  alignment: ImageAlignment = 'center',
): NormalizedImagePair {
  assertValidImageData(before)
  assertValidImageData(after)

  const width = Math.max(before.width, after.width)
  const height = Math.max(before.height, after.height)
  const normalizedBefore = normalizeImageData(before, width, height, alignment)
  const normalizedAfter = normalizeImageData(after, width, height, alignment)

  return {
    before: normalizedBefore.imageData,
    after: normalizedAfter.imageData,
    beforeOffset: normalizedBefore.offset,
    afterOffset: normalizedAfter.offset,
    width,
    height,
    dimensionsDiffer:
      before.width !== after.width || before.height !== after.height,
    alignment,
  }
}
