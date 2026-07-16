import pixelmatch from 'pixelmatch'

import {
  assertValidImageData,
  createRgbaImageData,
  type RgbaImageData,
} from './image-data'

export const DEFAULT_DIFF_SENSITIVITY = 70
export const DIFF_COLOR = [255, 0, 153] as const

export interface DiffOptions {
  readonly sensitivity?: number
  readonly includeAntiAliased?: boolean
}

export interface DiffResult {
  readonly imageData: RgbaImageData
  readonly changedPixels: number
  readonly totalPixels: number
  /** Percentage alias intended for concise UI consumption. */
  readonly percentage: number
  readonly changedPercentage: number
  readonly sensitivity: number
  /** The mapped 0–1 threshold passed to pixelmatch. */
  readonly threshold: number
  readonly pixelmatchThreshold: number
  readonly width: number
  readonly height: number
}

function clampSensitivity(sensitivity: number): number {
  if (!Number.isFinite(sensitivity)) {
    throw new RangeError('Sensitivity must be a finite number from 0 to 100')
  }
  return Math.min(100, Math.max(0, sensitivity))
}

/**
 * Converts the friendly 0–100 control to pixelmatch's inverse 0–1 threshold.
 * The 0.50–0.01 range keeps both ends useful: low sensitivity ignores small
 * rendering noise, while high sensitivity still avoids a pathological zero.
 */
export function sensitivityToThreshold(sensitivity: number): number {
  const normalized = clampSensitivity(sensitivity) / 100
  return Number((0.5 - normalized * 0.49).toFixed(4))
}

export function calculateChangedPercentage(
  changedPixels: number,
  totalPixels: number,
  precision = 2,
): number {
  if (!Number.isSafeInteger(changedPixels) || changedPixels < 0) {
    throw new RangeError('Changed pixels must be a non-negative safe integer')
  }
  if (!Number.isSafeInteger(totalPixels) || totalPixels <= 0) {
    throw new RangeError('Total pixels must be a positive safe integer')
  }
  if (changedPixels > totalPixels) {
    throw new RangeError('Changed pixels cannot exceed total pixels')
  }
  if (!Number.isInteger(precision) || precision < 0 || precision > 10) {
    throw new RangeError('Precision must be an integer from 0 to 10')
  }

  const multiplier = 10 ** precision
  return (
    Math.round((changedPixels / totalPixels) * 100 * multiplier) / multiplier
  )
}

function isMagentaDiff(data: Uint8ClampedArray, position: number): boolean {
  return (
    data[position] === DIFF_COLOR[0] &&
    data[position + 1] === DIFF_COLOR[1] &&
    data[position + 2] === DIFF_COLOR[2]
  )
}

function includeAlphaDifferences(
  before: RgbaImageData,
  after: RgbaImageData,
  output: Uint8ClampedArray,
  threshold: number,
): number {
  let additionalChanges = 0

  for (let position = 0; position < output.length; position += 4) {
    const beforeAlpha = before.data[position + 3] ?? 0
    const afterAlpha = after.data[position + 3] ?? 0
    const alphaDifference = Math.abs(beforeAlpha - afterAlpha)

    if (alphaDifference / 255 > threshold && !isMagentaDiff(output, position)) {
      output[position] = DIFF_COLOR[0]
      output[position + 1] = DIFF_COLOR[1]
      output[position + 2] = DIFF_COLOR[2]
      output[position + 3] = 255
      additionalChanges += 1
    }
  }

  return additionalChanges
}

export function createDiff(
  before: RgbaImageData,
  after: RgbaImageData,
  options: DiffOptions = {},
): DiffResult {
  assertValidImageData(before)
  assertValidImageData(after)

  if (before.width !== after.width || before.height !== after.height) {
    throw new RangeError('Images must have equal dimensions before diffing')
  }

  const sensitivity = clampSensitivity(
    options.sensitivity ?? DEFAULT_DIFF_SENSITIVITY,
  )
  const pixelmatchThreshold = sensitivityToThreshold(sensitivity)
  const output = createRgbaImageData(before.width, before.height)

  let changedPixels = pixelmatch(
    before.data,
    after.data,
    output.data,
    before.width,
    before.height,
    {
      threshold: pixelmatchThreshold,
      includeAA: options.includeAntiAliased ?? false,
      alpha: 0.16,
      aaColor: [204, 204, 204],
      diffColor: [...DIFF_COLOR],
      diffColorAlt: [...DIFF_COLOR],
      checkerboard: false,
    },
  )

  changedPixels += includeAlphaDifferences(
    before,
    after,
    output.data,
    pixelmatchThreshold,
  )

  const totalPixels = before.width * before.height
  const percentage = calculateChangedPercentage(changedPixels, totalPixels)

  return {
    imageData: output,
    changedPixels,
    totalPixels,
    percentage,
    changedPercentage: percentage,
    sensitivity,
    threshold: pixelmatchThreshold,
    pixelmatchThreshold,
    width: before.width,
    height: before.height,
  }
}
