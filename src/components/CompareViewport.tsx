import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { CompareMode, PreviewBackground } from '../app-types'
import type { Copy } from '../i18n'
import { drawImageData } from '../utils/canvas'

interface NormalizedView {
  before: ImageData
  after: ImageData
  width: number
  height: number
}

interface DiffView {
  imageData: ImageData
}

interface CompareViewportProps {
  normalized: NormalizedView
  diff: DiffView
  mode: CompareMode
  background: PreviewBackground
  peel: number
  opacity: number
  blinkFrame: 'before' | 'after'
  copy: Copy
  onPeelChange: (value: number) => void
}

export interface CompareViewportHandle {
  fit: () => void
  actual: () => void
  zoomIn: () => void
  zoomOut: () => void
  reset: () => void
}

const MIN_SCALE = 0.05
const MAX_SCALE = 4

function clampScale(value: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value))
}

export const CompareViewport = forwardRef<
  CompareViewportHandle,
  CompareViewportProps
>(function CompareViewport(
  {
    normalized,
    diff,
    mode,
    background,
    peel,
    opacity,
    blinkFrame,
    copy,
    onPeelChange,
  },
  forwardedRef,
) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const beforeRef = useRef<HTMLCanvasElement>(null)
  const afterRef = useRef<HTMLCanvasElement>(null)
  const diffRef = useRef<HTMLCanvasElement>(null)
  const panRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  })
  const fitModeRef = useRef(true)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    if (beforeRef.current) drawImageData(beforeRef.current, normalized.before)
    if (afterRef.current) drawImageData(afterRef.current, normalized.after)
    if (diffRef.current) drawImageData(diffRef.current, diff.imageData)
  }, [diff.imageData, mode, normalized.after, normalized.before])

  const centerScroll = useCallback(() => {
    window.requestAnimationFrame(() => {
      const scroller = scrollerRef.current
      if (!scroller) return
      scroller.scrollLeft = Math.max(
        0,
        (scroller.scrollWidth - scroller.clientWidth) / 2,
      )
      scroller.scrollTop = Math.max(
        0,
        (scroller.scrollHeight - scroller.clientHeight) / 2,
      )
    })
  }, [])

  const fit = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const horizontalPadding = scroller.clientWidth < 700 ? 28 : 72
    const verticalPadding = scroller.clientHeight < 520 ? 28 : 72
    const availableWidth = Math.max(1, scroller.clientWidth - horizontalPadding)
    const availableHeight = Math.max(1, scroller.clientHeight - verticalPadding)
    const next = clampScale(
      Math.min(
        availableWidth / normalized.width,
        availableHeight / normalized.height,
      ),
    )
    fitModeRef.current = true
    setScale(next)
    centerScroll()
  }, [centerScroll, normalized.height, normalized.width])

  const actual = useCallback(() => {
    fitModeRef.current = false
    setScale(1)
    centerScroll()
  }, [centerScroll])

  const zoomBy = useCallback(
    (factor: number) => {
      fitModeRef.current = false
      setScale((current) => clampScale(current * factor))
      centerScroll()
    },
    [centerScroll],
  )

  const reset = useCallback(() => {
    fit()
  }, [fit])

  useImperativeHandle(
    forwardedRef,
    () => ({
      fit,
      actual,
      zoomIn: () => zoomBy(1.2),
      zoomOut: () => zoomBy(1 / 1.2),
      reset,
    }),
    [actual, fit, reset, zoomBy],
  )

  useEffect(() => {
    fit()
    const scroller = scrollerRef.current
    if (!scroller) return
    const observer = new ResizeObserver(() => {
      if (fitModeRef.current) fit()
    })
    observer.observe(scroller)
    return () => observer.disconnect()
  }, [fit])

  const startPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('[data-no-pan]')) return
    const scroller = scrollerRef.current
    if (!scroller) return
    panRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: scroller.scrollLeft,
      scrollTop: scroller.scrollTop,
    }
    scroller.setPointerCapture(event.pointerId)
    scroller.dataset.panning = 'true'
  }

  const movePan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panRef.current
    const scroller = scrollerRef.current
    if (!pan.active || pan.pointerId !== event.pointerId || !scroller) return
    scroller.scrollLeft = pan.scrollLeft - (event.clientX - pan.startX)
    scroller.scrollTop = pan.scrollTop - (event.clientY - pan.startY)
  }

  const endPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const scroller = scrollerRef.current
    if (panRef.current.pointerId !== event.pointerId || !scroller) return
    panRef.current.active = false
    delete scroller.dataset.panning
    if (scroller.hasPointerCapture(event.pointerId)) {
      scroller.releasePointerCapture(event.pointerId)
    }
  }

  const stageStyle = {
    width: `${normalized.width * scale}px`,
    height: `${normalized.height * scale}px`,
  }
  const contentStyle = {
    width: `${normalized.width}px`,
    height: `${normalized.height}px`,
    transform: `scale(${scale})`,
  }

  return (
    <div className="compare-shell">
      <div
        ref={scrollerRef}
        className={`compare-scroller preview-${background}`}
        aria-label={copy.comparisonCanvas}
        onPointerDown={startPan}
        onPointerMove={movePan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
      >
        <div className="compare-stage" style={stageStyle}>
          <div className="compare-content" style={contentStyle}>
            {mode === 'diff' ? (
              <canvas
                ref={diffRef}
                className="compare-layer"
                aria-label={copy.diffHeatmap}
              />
            ) : (
              <>
                <canvas
                  ref={beforeRef}
                  className={
                    mode === 'blink' && blinkFrame === 'after'
                      ? 'compare-layer compare-layer--hidden'
                      : 'compare-layer'
                  }
                  aria-label={copy.before}
                />
                <div
                  className={
                    mode === 'blink' && blinkFrame === 'before'
                      ? 'compare-layer-wrap compare-layer--hidden'
                      : 'compare-layer-wrap'
                  }
                  style={
                    mode === 'peel'
                      ? { clipPath: `inset(0 ${100 - peel}% 0 0)` }
                      : mode === 'overlay'
                        ? { opacity: opacity / 100 }
                        : undefined
                  }
                >
                  <canvas
                    ref={afterRef}
                    className="compare-layer"
                    aria-label={copy.after}
                  />
                </div>
              </>
            )}
          </div>

          {mode === 'peel' && (
            <>
              <div
                className="peel-divider"
                style={{ left: `${peel}%` }}
                aria-hidden="true"
              >
                <span />
              </div>
              <input
                data-no-pan
                className="peel-input"
                type="range"
                min="0"
                max="100"
                value={peel}
                aria-label={copy.peelPosition}
                onChange={(event) =>
                  onPeelChange(event.currentTarget.valueAsNumber)
                }
              />
            </>
          )}

          {mode !== 'diff' && (
            <div className="canvas-labels" aria-hidden="true">
              <span className="canvas-label canvas-label--before">
                {copy.before}
              </span>
              <span className="canvas-label canvas-label--after">
                {copy.after}
              </span>
            </div>
          )}
        </div>
      </div>
      <output className="zoom-readout" aria-live="polite">
        {Math.round(scale * 100)}%
      </output>
    </div>
  )
})
