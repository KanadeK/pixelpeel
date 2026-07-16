import {
  ArrowsInIcon,
  ArrowUUpLeftIcon,
  CheckerboardIcon,
  CopyIcon,
  DownloadSimpleIcon,
  EyeIcon,
  ImageSquareIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  MoonIcon,
  PauseIcon,
  PlayIcon,
  SunIcon,
} from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CompareMode, LoadedImage, PreviewBackground } from '../app-types'
import type { Copy, Language } from '../i18n'
import {
  createExportFilename,
  createPrSummary,
  formatFileSize,
  type DiffResult,
  type ImageAlignment,
  type NormalizedImagePair,
} from '../lib'
import {
  canvasToBlob,
  copyText,
  createReportBlob,
  downloadBlob,
  imageDataCanvas,
} from '../utils/canvas'
import { CompareViewport, type CompareViewportHandle } from './CompareViewport'

interface WorkspaceProps {
  copy: Copy
  language: Language
  before: LoadedImage
  after: LoadedImage
  normalized: NormalizedImagePair
  diff: DiffResult
  alignment: ImageAlignment
  sensitivity: number
  example: boolean
  onAlignmentChange: (alignment: ImageAlignment) => void
  onSensitivityChange: (sensitivity: number) => void
  onResetImages: () => void
}

const MODES: readonly CompareMode[] = ['peel', 'overlay', 'blink', 'diff']

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName)
  )
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return reduced
}

function modeLabel(copy: Copy, mode: CompareMode): string {
  const labels: Record<CompareMode, string> = {
    peel: copy.modePeel,
    overlay: copy.modeOverlay,
    blink: copy.modeBlink,
    diff: copy.modeDiff,
  }
  return labels[mode]
}

function modeBody(copy: Copy, mode: CompareMode): string {
  const labels: Record<CompareMode, string> = {
    peel: copy.modePeelBody,
    overlay: copy.modeOverlayBody,
    blink: copy.modeBlinkBody,
    diff: copy.modeDiffBody,
  }
  return labels[mode]
}

export function Workspace({
  copy,
  language,
  before,
  after,
  normalized,
  diff,
  alignment,
  sensitivity,
  example,
  onAlignmentChange,
  onSensitivityChange,
  onResetImages,
}: WorkspaceProps) {
  const viewportRef = useRef<CompareViewportHandle>(null)
  const toastTimerRef = useRef<number | null>(null)
  const reducedMotion = useReducedMotion()
  const [mode, setMode] = useState<CompareMode>('peel')
  const [background, setBackground] = useState<PreviewBackground>('checker')
  const [peel, setPeel] = useState(50)
  const [opacity, setOpacity] = useState(50)
  const [blinkSpeed, setBlinkSpeed] = useState(500)
  const [blinkRequested, setBlinkRequested] = useState(() => !reducedMotion)
  const [pageVisible, setPageVisible] = useState(() => !document.hidden)
  const [blinkFrame, setBlinkFrame] = useState<'before' | 'after'>('before')
  const [toast, setToast] = useState<string>('')
  const [exporting, setExporting] = useState(false)

  const showToast = (message: string) => {
    setToast(message)
    if (toastTimerRef.current !== null)
      window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToast(''), 2200)
  }

  useEffect(
    () => () => {
      if (toastTimerRef.current !== null)
        window.clearTimeout(toastTimerRef.current)
    },
    [],
  )

  useEffect(() => {
    const onVisibility = () => setPageVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    if (mode !== 'blink' || !blinkRequested || !pageVisible || reducedMotion)
      return
    const timer = window.setInterval(() => {
      setBlinkFrame((current) => (current === 'before' ? 'after' : 'before'))
    }, blinkSpeed)
    return () => window.clearInterval(timer)
  }, [blinkRequested, blinkSpeed, mode, pageVisible, reducedMotion])

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      const key = event.key.toLowerCase()
      const modeIndex = Number(key) - 1
      if (modeIndex >= 0 && modeIndex < MODES.length) {
        const nextMode = MODES[modeIndex]
        if (nextMode) setMode(nextMode)
        return
      }
      if (key === 'f') viewportRef.current?.fit()
      else if (key === '0') viewportRef.current?.actual()
      else if (key === 'r') viewportRef.current?.reset()
      else if (event.code === 'Space' && mode === 'blink') {
        event.preventDefault()
        setBlinkRequested((current) => !current)
      }
    }
    document.addEventListener('keydown', onShortcut)
    return () => document.removeEventListener('keydown', onShortcut)
  }, [mode])

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(language === 'zh-CN' ? 'zh-CN' : 'en-US'),
    [language],
  )

  const exportDiff = async () => {
    setExporting(true)
    try {
      const canvas = imageDataCanvas(diff.imageData)
      const blob = await canvasToBlob(canvas)
      canvas.width = 1
      canvas.height = 1
      downloadBlob(blob, createExportFilename('diff'))
      showToast(copy.exportReady)
    } catch {
      showToast(copy.exportFailed)
    } finally {
      setExporting(false)
    }
  }

  const exportReport = async () => {
    setExporting(true)
    try {
      const blob = await createReportBlob({
        before: normalized.before,
        after: normalized.after,
        diff: diff.imageData,
        beforeSize: `${before.width}×${before.height}`,
        afterSize: `${after.width}×${after.height}`,
        changedPixels: diff.changedPixels,
        percentage: diff.percentage,
        threshold: sensitivity,
        copy,
        locale: language,
      })
      downloadBlob(blob, createExportFilename('report'))
      showToast(copy.exportReady)
    } catch {
      showToast(copy.exportFailed)
    } finally {
      setExporting(false)
    }
  }

  const copySummary = async () => {
    const summary = createPrSummary({
      changedPixels: diff.changedPixels,
      changedPercentage: diff.percentage,
      threshold: sensitivity,
      before: { width: before.width, height: before.height },
      after: { width: after.width, height: after.height },
    })
    try {
      await copyText(summary)
      showToast(copy.copied)
    } catch {
      showToast(copy.copyFailed)
    }
  }

  const metrics = [
    [copy.changedPixels, numberFormatter.format(diff.changedPixels)],
    [copy.totalPixels, numberFormatter.format(diff.totalPixels)],
    [copy.changedPercentage, `${diff.percentage.toFixed(2)}%`],
    [copy.beforeSize, `${before.width}×${before.height}`],
    [copy.afterSize, `${after.width}×${after.height}`],
    [copy.threshold, `${sensitivity} (${diff.pixelmatchThreshold.toFixed(3)})`],
  ] as const

  const sources: ReadonlyArray<readonly [string, LoadedImage]> = [
    [copy.before, before],
    [copy.after, after],
  ]

  return (
    <main className="workspace">
      <div className="workspace-toolbar">
        <div className="mode-tabs" role="group" aria-label={copy.modes}>
          {MODES.map((item, index) => (
            <button
              key={item}
              className={
                mode === item ? 'mode-tab mode-tab--active' : 'mode-tab'
              }
              type="button"
              aria-label={modeLabel(copy, item)}
              aria-pressed={mode === item}
              onClick={() => setMode(item)}
            >
              <kbd>{index + 1}</kbd>
              {modeLabel(copy, item)}
            </button>
          ))}
        </div>

        <div className="view-tools" role="group" aria-label={copy.view}>
          <button
            className="tool-button tool-button--labeled"
            type="button"
            onClick={() => viewportRef.current?.fit()}
            title={copy.fit}
          >
            <ArrowsInIcon size={17} weight="bold" aria-hidden="true" />
            <span>{copy.fit}</span>
          </button>
          <button
            className="tool-button"
            type="button"
            onClick={() => viewportRef.current?.actual()}
            aria-label={copy.actualSize}
            title={copy.actualSize}
          >
            <span className="actual-glyph">1:1</span>
          </button>
          <button
            className="tool-button"
            type="button"
            onClick={() => viewportRef.current?.zoomOut()}
            aria-label={copy.zoomOut}
            title={copy.zoomOut}
          >
            <MagnifyingGlassMinusIcon
              size={18}
              weight="bold"
              aria-hidden="true"
            />
          </button>
          <button
            className="tool-button"
            type="button"
            onClick={() => viewportRef.current?.zoomIn()}
            aria-label={copy.zoomIn}
            title={copy.zoomIn}
          >
            <MagnifyingGlassPlusIcon
              size={18}
              weight="bold"
              aria-hidden="true"
            />
          </button>
          <button
            className="tool-button"
            type="button"
            onClick={() => viewportRef.current?.reset()}
            aria-label={copy.resetView}
            title={copy.resetView}
          >
            <ArrowUUpLeftIcon size={18} weight="bold" aria-hidden="true" />
          </button>
        </div>

        <div
          className="background-tools"
          role="group"
          aria-label={copy.previewBackground}
        >
          <button
            className={
              background === 'light'
                ? 'tool-button tool-button--active'
                : 'tool-button'
            }
            type="button"
            onClick={() => setBackground('light')}
            aria-label={copy.backgroundLight}
            title={copy.backgroundLight}
          >
            <SunIcon size={18} weight="fill" aria-hidden="true" />
          </button>
          <button
            className={
              background === 'dark'
                ? 'tool-button tool-button--active'
                : 'tool-button'
            }
            type="button"
            onClick={() => setBackground('dark')}
            aria-label={copy.backgroundDark}
            title={copy.backgroundDark}
          >
            <MoonIcon size={18} weight="fill" aria-hidden="true" />
          </button>
          <button
            className={
              background === 'checker'
                ? 'tool-button tool-button--active'
                : 'tool-button'
            }
            type="button"
            onClick={() => setBackground('checker')}
            aria-label={copy.backgroundChecker}
            title={copy.backgroundChecker}
          >
            <CheckerboardIcon size={18} weight="bold" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="workspace-grid">
        <section className="viewport-panel">
          {example && (
            <span className="example-badge">{copy.exampleBadge}</span>
          )}
          <CompareViewport
            ref={viewportRef}
            normalized={normalized}
            diff={diff}
            mode={mode}
            background={background}
            peel={peel}
            opacity={opacity}
            blinkFrame={reducedMotion ? 'before' : blinkFrame}
            copy={copy}
            onPeelChange={setPeel}
          />
        </section>

        <aside className="control-panel">
          <section
            className="control-section source-summary"
            aria-label={copy.screenshotInputs}
          >
            {sources.map(([label, image]) => (
              <div key={label}>
                <span>{label}</span>
                <strong title={image.name}>{image.name}</strong>
                <small>
                  {image.width}×{image.height} · {formatFileSize(image.size)}
                </small>
              </div>
            ))}
          </section>

          <section className="control-section control-section--mode">
            <div className="control-section__heading">
              <div>
                <span>{copy.modes}</span>
                <h2>{modeLabel(copy, mode)}</h2>
              </div>
              <EyeIcon size={22} weight="duotone" aria-hidden="true" />
            </div>
            <p>{modeBody(copy, mode)}</p>

            {mode === 'peel' && (
              <div className="control-value">
                <span>{copy.peelPosition}</span>
                <output>{peel}%</output>
              </div>
            )}

            {mode === 'overlay' && (
              <div className="range-control">
                <span>
                  <label htmlFor="after-opacity">{copy.afterOpacity}</label>
                  <output>{opacity}%</output>
                </span>
                <input
                  id="after-opacity"
                  type="range"
                  min="0"
                  max="100"
                  value={opacity}
                  onChange={(event) =>
                    setOpacity(event.currentTarget.valueAsNumber)
                  }
                />
              </div>
            )}

            {mode === 'blink' && (
              <div className="blink-controls">
                <button
                  className="button button--primary button--full"
                  type="button"
                  onClick={() => setBlinkRequested((current) => !current)}
                >
                  {blinkRequested ? (
                    <PauseIcon size={18} weight="fill" aria-hidden="true" />
                  ) : (
                    <PlayIcon size={18} weight="fill" aria-hidden="true" />
                  )}
                  {blinkRequested ? copy.pauseBlinking : copy.startBlinking}
                </button>
                <span className="field-label">{copy.blinkSpeed}</span>
                <div className="segmented-control">
                  {[250, 500, 1000].map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      className={blinkSpeed === speed ? 'is-active' : ''}
                      onClick={() => setBlinkSpeed(speed)}
                      aria-pressed={blinkSpeed === speed}
                    >
                      {speed} {copy.milliseconds}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === 'diff' && (
              <div className="range-control">
                <span>
                  <label htmlFor="diff-sensitivity">{copy.sensitivity}</label>
                  <output>{sensitivity}</output>
                </span>
                <input
                  id="diff-sensitivity"
                  type="range"
                  min="0"
                  max="100"
                  value={sensitivity}
                  onChange={(event) =>
                    onSensitivityChange(event.currentTarget.valueAsNumber)
                  }
                />
                <small>{copy.sensitivityHint}</small>
              </div>
            )}
          </section>

          {normalized.dimensionsDiffer && (
            <section className="control-section mismatch-notice">
              <div>
                <ImageSquareIcon
                  size={21}
                  weight="duotone"
                  aria-hidden="true"
                />
                <strong>{copy.mismatchTitle}</strong>
              </div>
              <p>{copy.mismatchBody}</p>
              <span className="field-label">{copy.alignment}</span>
              <div className="segmented-control">
                <button
                  type="button"
                  className={alignment === 'center' ? 'is-active' : ''}
                  onClick={() => onAlignmentChange('center')}
                  aria-pressed={alignment === 'center'}
                >
                  {copy.alignCenter}
                </button>
                <button
                  type="button"
                  className={alignment === 'top-left' ? 'is-active' : ''}
                  onClick={() => onAlignmentChange('top-left')}
                  aria-pressed={alignment === 'top-left'}
                >
                  {copy.alignTopLeft}
                </button>
              </div>
            </section>
          )}

          <section
            className="control-section metrics-section"
            aria-label={copy.diffHeatmap}
          >
            <h2>{copy.diffHeatmap}</h2>
            <dl className="metrics-grid">
              {metrics.map(([label, value], index) => (
                <div
                  key={label}
                  className={index < 3 ? 'metric metric--primary' : 'metric'}
                >
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="control-section export-section">
            <h2>{copy.exportTitle}</h2>
            <button
              className="button button--primary button--full"
              type="button"
              onClick={exportDiff}
              disabled={exporting}
            >
              <DownloadSimpleIcon size={18} weight="bold" aria-hidden="true" />
              {copy.exportDiff}
            </button>
            <button
              className="button button--secondary button--full"
              type="button"
              onClick={exportReport}
              disabled={exporting}
            >
              <ImageSquareIcon size={18} weight="bold" aria-hidden="true" />
              {copy.exportReport}
            </button>
            <button
              className="button button--ghost button--full"
              type="button"
              onClick={copySummary}
            >
              <CopyIcon size={18} weight="bold" aria-hidden="true" />
              {copy.copySummary}
            </button>
          </section>

          <p className="background-note">{copy.backgroundNote}</p>
          <button
            className="text-button reset-images"
            type="button"
            onClick={onResetImages}
          >
            {copy.clearAll}
          </button>
        </aside>
      </div>

      <div className="toast-region" aria-live="polite" aria-atomic="true">
        {toast && <div className="toast">{toast}</div>}
      </div>
    </main>
  )
}
