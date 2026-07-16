import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  calculateChangedPercentage,
  createDiff,
  createExportFilename,
  createPrSummary,
  createRgbaImageData,
  decodeImageFile,
  DIFF_COLOR,
  formatFileSize,
  MAX_IMAGE_PIXELS,
  normalizeImageData,
  normalizeImagePair,
  sensitivityToThreshold,
} from './index'
import type { PixelPeelImageError } from './index'

function rgba(
  width: number,
  height: number,
  values: readonly number[],
): ImageData {
  return createRgbaImageData(width, height, new Uint8ClampedArray(values))
}

function pngHeader(width: number, height: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(24)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const view = new DataView(bytes.buffer)
  view.setUint32(16, width)
  view.setUint32(20, height)
  return bytes
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('formatFileSize', () => {
  it('formats byte and binary-derived units readably', () => {
    expect(formatFileSize(0)).toBe('0 B')
    expect(formatFileSize(1023)).toBe('1023 B')
    expect(formatFileSize(1024)).toBe('1 KB')
    expect(formatFileSize(1536)).toBe('1.5 KB')
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5 MB')
  })

  it('rejects invalid sizes', () => {
    expect(() => formatFileSize(-1)).toThrow(RangeError)
    expect(() => formatFileSize(Number.NaN)).toThrow(RangeError)
  })
})

describe('image normalization', () => {
  const red = [255, 0, 0, 255] as const

  it('normalizes both images to the largest width and height', () => {
    const result = normalizeImagePair(
      rgba(1, 2, [...red, ...red]),
      rgba(2, 1, [...red, ...red]),
    )

    expect(result).toMatchObject({
      width: 2,
      height: 2,
      dimensionsDiffer: true,
      alignment: 'center',
    })
    expect(result.before.data).toHaveLength(16)
    expect(result.after.data).toHaveLength(16)
  })

  it('places source pixels at the top left', () => {
    const result = normalizeImageData(rgba(1, 1, red), 2, 2, 'top-left')

    expect(result.offset).toEqual({ x: 0, y: 0 })
    expect([...result.imageData.data.slice(0, 4)]).toEqual(red)
    expect([...result.imageData.data.slice(4)]).toEqual(new Array(12).fill(0))
  })

  it('centers source pixels using integer offsets', () => {
    const result = normalizeImageData(rgba(1, 1, red), 3, 3, 'center')
    const centerPosition = (1 * 3 + 1) * 4

    expect(result.offset).toEqual({ x: 1, y: 1 })
    expect([
      ...result.imageData.data.slice(centerPosition, centerPosition + 4),
    ]).toEqual(red)
  })

  it('keeps padded pixels transparent RGBA', () => {
    const result = normalizeImageData(rgba(1, 1, red), 2, 1, 'top-left')

    expect([...result.imageData.data.slice(4, 8)]).toEqual([0, 0, 0, 0])
  })
})

describe('pixel diff', () => {
  it('returns zero changed pixels for identical images and a grayscale background', () => {
    const image = rgba(1, 1, [20, 100, 220, 255])
    const result = createDiff(image, image)

    expect(result.changedPixels).toBe(0)
    expect(result.percentage).toBe(0)
    expect(result.imageData.data[0]).toBe(result.imageData.data[1])
    expect(result.imageData.data[1]).toBe(result.imageData.data[2])
  })

  it('marks a single changed pixel in magenta', () => {
    const before = rgba(2, 1, [0, 0, 0, 255, 50, 50, 50, 255])
    const after = rgba(2, 1, [255, 255, 255, 255, 50, 50, 50, 255])
    const result = createDiff(before, after)

    expect(result.changedPixels).toBe(1)
    expect([...result.imageData.data.slice(0, 3)]).toEqual([...DIFF_COLOR])
  })

  it('counts transparent-versus-opaque pixels as RGBA differences', () => {
    const transparent = rgba(1, 1, [0, 0, 0, 0])
    const opaqueWhite = rgba(1, 1, [255, 255, 255, 255])

    expect(createDiff(transparent, opaqueWhite).changedPixels).toBe(1)
  })

  it('diffs different source dimensions after normalization', () => {
    const before = rgba(1, 1, [255, 0, 0, 255])
    const after = rgba(2, 1, [255, 0, 0, 255, 0, 0, 255, 255])
    const normalized = normalizeImagePair(before, after, 'top-left')
    const result = createDiff(normalized.before, normalized.after)

    expect(result.totalPixels).toBe(2)
    expect(result.changedPixels).toBe(1)
    expect(result.percentage).toBe(50)
  })

  it('maps higher sensitivity to a lower pixelmatch threshold', () => {
    expect(sensitivityToThreshold(0)).toBe(0.5)
    expect(sensitivityToThreshold(100)).toBe(0.01)
    expect(sensitivityToThreshold(80)).toBeLessThan(sensitivityToThreshold(20))
  })

  it('detects subtle changes only at sufficiently high sensitivity', () => {
    const before = rgba(1, 1, [0, 0, 0, 255])
    const after = rgba(1, 1, [30, 30, 30, 255])

    expect(createDiff(before, after, { sensitivity: 0 }).changedPixels).toBe(0)
    expect(createDiff(before, after, { sensitivity: 100 }).changedPixels).toBe(
      1,
    )
  })

  it('calculates changed percentage against the full normalized canvas', () => {
    expect(calculateChangedPercentage(1, 3)).toBe(33.33)
    expect(calculateChangedPercentage(12_345, 1_000_000)).toBe(1.23)
  })
})

describe('export metadata', () => {
  it('creates local-time timestamped PNG filenames', () => {
    const date = new Date(2026, 6, 15, 14, 30, 0)

    expect(createExportFilename('diff', date)).toBe(
      'pixelpeel-diff-20260715-143000.png',
    )
    expect(createExportFilename('report', date)).toBe(
      'pixelpeel-report-20260715-143000.png',
    )
  })

  it('creates a PR-ready Markdown summary', () => {
    expect(
      createPrSummary({
        changedPixels: 12_345,
        changedPercentage: 1.24,
        threshold: 15,
        before: { width: 1920, height: 1080 },
        after: { width: 1920, height: 1080 },
      }),
    ).toBe(
      [
        'Visual comparison generated with PixelPeel.',
        '',
        '- Changed pixels: 12,345',
        '- Changed area: 1.24%',
        '- Threshold: 15',
        '- Before: 1920×1080',
        '- After: 1920×1080',
      ].join('\n'),
    )
  })
})

describe('browser image decoding', () => {
  it('rejects a corrupt file claiming to be a supported image', async () => {
    const file = new File(['not a png'], 'broken.png', { type: 'image/png' })

    await expect(decodeImageFile(file)).rejects.toMatchObject({
      name: 'PixelPeelImageError',
      code: 'invalid-image',
    })
  })

  it('rejects unsupported formats with a distinct error code', async () => {
    const file = new File(['<svg/>'], 'graphic.svg', { type: 'image/svg+xml' })

    await expect(decodeImageFile(file)).rejects.toMatchObject({
      name: 'PixelPeelImageError',
      code: 'unsupported-format',
    })
  })

  it('enforces the 40 MP limit from the header before browser decoding', async () => {
    const createBitmap = vi.fn()
    vi.stubGlobal('createImageBitmap', createBitmap)
    const file = new File([pngHeader(8000, 5001)], 'huge.png', {
      type: 'image/png',
    })

    await expect(decodeImageFile(file)).rejects.toEqual(
      expect.objectContaining<Partial<PixelPeelImageError>>({
        code: 'image-too-large',
        width: 8000,
        height: 5001,
      }),
    )
    expect(8000 * 5001).toBeGreaterThan(MAX_IMAGE_PIXELS)
    expect(createBitmap).not.toHaveBeenCalled()
  })

  it('uses real browser image loading in the fallback and always releases resources', async () => {
    const createObjectURL = vi.fn(() => 'blob:pixelpeel-test')
    const revokeObjectURL = vi.fn()
    const drawImage = vi.fn()
    const clearRect = vi.fn()
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({
        clearRect,
        drawImage,
        getImageData: () => rgba(1, 1, [10, 20, 30, 255]),
      })),
    }

    class FakeImage {
      naturalWidth = 1
      naturalHeight = 1
      decoding = 'auto'
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      private value = ''

      get src(): string {
        return this.value
      }

      set src(value: string) {
        this.value = value
        if (value) {
          queueMicrotask(() => this.onload?.())
        }
      }
    }

    vi.stubGlobal('createImageBitmap', undefined)
    vi.stubGlobal('Image', FakeImage)
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    vi.stubGlobal('document', {
      createElement: vi.fn(() => canvas),
    })

    const file = new File([pngHeader(1, 1)], 'pixel.png', { type: 'image/png' })
    const decoded = await decodeImageFile(file)

    expect(decoded).toMatchObject({
      name: 'pixel.png',
      format: 'png',
      width: 1,
      height: 1,
    })
    expect([...decoded.imageData.data]).toEqual([10, 20, 30, 255])
    expect(drawImage).toHaveBeenCalledOnce()
    expect(clearRect).toHaveBeenCalledOnce()
    expect(createObjectURL).toHaveBeenCalledWith(file)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:pixelpeel-test')
    expect(canvas).toMatchObject({ width: 0, height: 0 })
  })
})
