import { XIcon } from '@phosphor-icons/react'
import { useEffect } from 'react'
import type { Copy } from '../i18n'

interface HelpDialogProps {
  open: boolean
  copy: Copy
  onClose: () => void
}

export function HelpDialog({ open, copy, onClose }: HelpDialogProps) {
  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose, open])

  if (!open) return null

  const shortcuts = [
    ['1  2  3  4', copy.shortcutModes],
    ['F', copy.shortcutFit],
    ['0', copy.shortcutActual],
    ['Space', copy.shortcutBlink],
    ['R', copy.shortcutReset],
    ['Esc', copy.shortcutClose],
  ] as const

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="help-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
      >
        <header>
          <h2 id="help-title">{copy.helpTitle}</h2>
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label={copy.closeHelp}
          >
            <XIcon size={19} weight="bold" aria-hidden="true" />
          </button>
        </header>
        <dl className="shortcut-list">
          {shortcuts.map(([keys, description]) => (
            <div key={keys}>
              <dt>
                {keys.split('  ').map((key) => (
                  <kbd key={key}>{key}</kbd>
                ))}
              </dt>
              <dd>{description}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
