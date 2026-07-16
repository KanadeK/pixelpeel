const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    throw new RangeError('File size must be a non-negative finite number')
  }

  if (bytes < 1024) {
    return `${Math.round(bytes)} B`
  }

  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    FILE_SIZE_UNITS.length - 1,
  )
  const value = bytes / 1024 ** unitIndex
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(value)

  return `${formatted} ${FILE_SIZE_UNITS[unitIndex]}`
}
