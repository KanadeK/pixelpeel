import type { Copy } from '../i18n'

export function drawImageData(
  canvas: HTMLCanvasElement,
  imageData: ImageData,
): void {
  canvas.width = imageData.width
  canvas.height = imageData.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D is not available.')
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.putImageData(imageData, 0, 0)
}

export function imageDataCanvas(imageData: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  drawImageData(canvas, imageData)
  return canvas
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Canvas encoding failed.'))
    }, 'image/png')
  })
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

interface ReportInput {
  before: ImageData
  after: ImageData
  diff: ImageData
  beforeSize: string
  afterSize: string
  changedPixels: number
  percentage: number
  threshold: number
  copy: Copy
  locale: string
}

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

function roundedRect(
  context: CanvasRenderingContext2D,
  rect: Rect,
  radius: number,
): void {
  context.beginPath()
  context.roundRect(rect.x, rect.y, rect.width, rect.height, radius)
}

function drawContained(
  context: CanvasRenderingContext2D,
  imageData: ImageData,
  rect: Rect,
): void {
  const source = imageDataCanvas(imageData)
  const scale = Math.min(rect.width / source.width, rect.height / source.height)
  const width = Math.max(1, source.width * scale)
  const height = Math.max(1, source.height * scale)
  const x = rect.x + (rect.width - width) / 2
  const y = rect.y + (rect.height - height) / 2
  context.drawImage(source, x, y, width, height)
  source.width = 1
  source.height = 1
}

export async function createReportBlob(input: ReportInput): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = 1800
  canvas.height = 1080
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D is not available.')

  const colors = {
    page: '#0b1018',
    panel: '#121a26',
    border: '#283446',
    text: '#f3f7fb',
    muted: '#9aaabc',
    accent: '#35c9c2',
    diff: '#ff3f8e',
  }

  context.fillStyle = colors.page
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = colors.accent
  context.fillRect(0, 0, 12, canvas.height)

  context.fillStyle = colors.text
  context.font = '700 54px ui-sans-serif, system-ui, sans-serif'
  context.fillText('PixelPeel', 88, 92)
  context.fillStyle = colors.muted
  context.font = '400 24px ui-sans-serif, system-ui, sans-serif'
  context.fillText(input.copy.brandTagline, 88, 132)
  context.textAlign = 'right'
  context.fillStyle = colors.accent
  context.font = '600 22px ui-sans-serif, system-ui, sans-serif'
  context.fillText(input.copy.processedLocally, 1712, 100)
  context.textAlign = 'left'

  const gap = 28
  const pageX = 88
  const panelY = 186
  const panelWidth = (canvas.width - pageX * 2 - gap * 2) / 3
  const panelHeight = 510
  const labels = [input.copy.before, input.copy.after, input.copy.diff]
  const images = [input.before, input.after, input.diff]

  images.forEach((imageData, index) => {
    const panel = {
      x: pageX + index * (panelWidth + gap),
      y: panelY,
      width: panelWidth,
      height: panelHeight,
    }
    roundedRect(context, panel, 18)
    context.fillStyle = colors.panel
    context.fill()
    context.strokeStyle = index === 2 ? colors.diff : colors.border
    context.lineWidth = index === 2 ? 3 : 2
    context.stroke()

    context.fillStyle = index === 2 ? colors.diff : colors.text
    context.font = '700 22px ui-sans-serif, system-ui, sans-serif'
    context.fillText(labels[index] ?? '', panel.x + 26, panel.y + 42)
    drawContained(context, imageData, {
      x: panel.x + 24,
      y: panel.y + 70,
      width: panel.width - 48,
      height: panel.height - 96,
    })
  })

  const number = new Intl.NumberFormat(input.locale)
  const metrics = [
    [input.copy.changedPixels, number.format(input.changedPixels)],
    [input.copy.changedPercentage, `${input.percentage.toFixed(2)}%`],
    [input.copy.threshold, input.threshold.toFixed(3)],
    [input.copy.beforeSize, input.beforeSize],
    [input.copy.afterSize, input.afterSize],
  ] as const

  context.fillStyle = colors.text
  context.font = '700 28px ui-sans-serif, system-ui, sans-serif'
  context.fillText(input.copy.diffHeatmap, pageX, 766)

  const metricY = 812
  const metricWidth = (canvas.width - pageX * 2 - gap * 4) / 5
  metrics.forEach(([label, value], index) => {
    const x = pageX + index * (metricWidth + gap)
    context.fillStyle = colors.muted
    context.font = '500 18px ui-sans-serif, system-ui, sans-serif'
    context.fillText(label, x, metricY)
    context.fillStyle = index < 2 ? colors.diff : colors.text
    context.font = '700 29px ui-monospace, SFMono-Regular, Consolas, monospace'
    context.fillText(value, x, metricY + 44)
  })

  context.strokeStyle = colors.border
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(pageX, 930)
  context.lineTo(canvas.width - pageX, 930)
  context.stroke()
  context.fillStyle = colors.muted
  context.font = '400 21px ui-sans-serif, system-ui, sans-serif'
  context.fillText(input.copy.backgroundNote, pageX, 982)
  context.fillStyle = colors.text
  context.font = '600 21px ui-sans-serif, system-ui, sans-serif'
  context.textAlign = 'right'
  context.fillText('PixelPeel', canvas.width - pageX, 982)

  return canvasToBlob(canvas)
}

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.append(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()
  if (!copied) throw new Error('Clipboard copy failed.')
}
