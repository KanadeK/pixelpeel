import { ArrowRightIcon, LockSimpleIcon } from '@phosphor-icons/react'
import type { LoadedImage } from '../app-types'
import type { Copy } from '../i18n'
import { DropZone } from './DropZone'

interface LandingProps {
  copy: Copy
  before: LoadedImage | null
  after: LoadedImage | null
  error: string | null
  status: string
  exampleLoading: boolean
  onFile: (kind: 'before' | 'after', file: File) => void
  onClear: (kind: 'before' | 'after') => void
  onLoadExample: () => void
}

export function Landing({
  copy,
  before,
  after,
  error,
  status,
  exampleLoading,
  onFile,
  onClear,
  onLoadExample,
}: LandingProps) {
  const benefits = [
    [copy.localOnly, copy.localOnlyBody],
    [copy.noAccount, copy.noAccountBody],
    [copy.prReady, copy.prReadyBody],
  ] as const

  return (
    <main className="landing">
      <section className="hero-section">
        <div className="hero-copy">
          <div className="privacy-tag">
            <LockSimpleIcon size={16} weight="fill" aria-hidden="true" />
            <span>{copy.privacyLabel}</span>
          </div>
          <h1>{copy.brandTagline}</h1>
          <p>{copy.heroBody}</p>
        </div>
        <aside className="local-note" aria-label={copy.privacyLabel}>
          <div className="local-note__number">{copy.localSignal}</div>
          <div>
            <strong>{copy.localOnly}</strong>
            <span>{copy.privacyBody}</span>
          </div>
        </aside>
      </section>

      <section className="upload-section" aria-label={copy.screenshotInputs}>
        <div className="upload-section__heading">
          <div>
            <span className="section-kicker">{copy.uploadKicker}</span>
            <h2>{copy.chooseImage}</h2>
          </div>
          <button
            className="button button--secondary"
            type="button"
            onClick={onLoadExample}
            disabled={exampleLoading}
          >
            {exampleLoading ? copy.loadingExample : copy.loadExample}
            {!exampleLoading && (
              <ArrowRightIcon size={18} weight="bold" aria-hidden="true" />
            )}
          </button>
        </div>
        <div className="upload-grid">
          <DropZone
            kind="before"
            image={before}
            copy={copy}
            onFile={(file) => onFile('before', file)}
            onClear={() => onClear('before')}
          />
          <DropZone
            kind="after"
            image={after}
            copy={copy}
            onFile={(file) => onFile('after', file)}
            onClear={() => onClear('after')}
          />
        </div>
        <p
          className="status-message status-message--error"
          role="alert"
          aria-live="polite"
        >
          {error ?? ''}
        </p>
        <p className="status-message" role="status" aria-live="polite">
          {status}
        </p>
      </section>

      <section className="benefit-strip" aria-label={copy.benefitsLabel}>
        {benefits.map(([title, body]) => (
          <div key={title}>
            <strong>{title}</strong>
            <span>{body}</span>
          </div>
        ))}
      </section>
    </main>
  )
}
