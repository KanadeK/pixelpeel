import type { ImageDimensions } from './image-data'

export type ExportKind = 'diff' | 'report'

export interface PrSummaryInput {
  readonly changedPixels: number
  readonly changedPercentage: number
  readonly threshold: number
  readonly before: ImageDimensions
  readonly after: ImageDimensions
}

function pad(value: number): string {
  return value.toString().padStart(2, '0')
}

export function formatTimestamp(date: Date = new Date()): string {
  if (Number.isNaN(date.getTime())) {
    throw new RangeError('A valid date is required')
  }

  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(
    date.getHours(),
  )}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

export function createExportFilename(
  kind: ExportKind,
  date: Date = new Date(),
): string {
  return `pixelpeel-${kind}-${formatTimestamp(date)}.png`
}

function formatThreshold(value: number): string {
  if (!Number.isFinite(value)) {
    throw new RangeError('Threshold must be a finite number')
  }
  return Number.isInteger(value) ? value.toString() : value.toFixed(2)
}

function assertDimensions(dimensions: ImageDimensions, label: string): void {
  if (
    !Number.isSafeInteger(dimensions.width) ||
    !Number.isSafeInteger(dimensions.height) ||
    dimensions.width <= 0 ||
    dimensions.height <= 0
  ) {
    throw new RangeError(`${label} dimensions must be positive safe integers`)
  }
}

export function createPrSummary(input: PrSummaryInput): string {
  if (!Number.isSafeInteger(input.changedPixels) || input.changedPixels < 0) {
    throw new RangeError('Changed pixels must be a non-negative safe integer')
  }
  if (
    !Number.isFinite(input.changedPercentage) ||
    input.changedPercentage < 0 ||
    input.changedPercentage > 100
  ) {
    throw new RangeError('Changed percentage must be between 0 and 100')
  }
  assertDimensions(input.before, 'Before')
  assertDimensions(input.after, 'After')

  return [
    'Visual comparison generated with PixelPeel.',
    '',
    `- Changed pixels: ${input.changedPixels.toLocaleString('en-US')}`,
    `- Changed area: ${input.changedPercentage.toFixed(2)}%`,
    `- Threshold: ${formatThreshold(input.threshold)}`,
    `- Before: ${input.before.width}×${input.before.height}`,
    `- After: ${input.after.width}×${input.after.height}`,
  ].join('\n')
}
