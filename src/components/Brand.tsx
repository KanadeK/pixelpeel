import type { Copy } from '../i18n'

interface BrandProps {
  copy: Copy
  compact?: boolean
}

export function PixelMark() {
  return (
    <span className="pixel-mark" aria-hidden="true">
      <span className="pixel-mark__back" />
      <span className="pixel-mark__front" />
      <span className="pixel-mark__peel" />
    </span>
  )
}

export function Brand({ copy, compact = false }: BrandProps) {
  return (
    <span className="brand">
      <PixelMark />
      <span className="brand__text">
        <strong>PixelPeel</strong>
        {!compact && <span>{copy.brandTagline}</span>}
      </span>
    </span>
  )
}
