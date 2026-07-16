import { deflateSync } from 'node:zlib'

type Rgba = readonly [red: number, green: number, blue: number, alpha: number]
type PixelFactory = (x: number, y: number) => Rgba

export type FixtureImage = {
  name: string
  mimeType: 'image/png'
  buffer: Buffer
}

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

const CRC_TABLE = Array.from({ length: 256 }, (_, tableIndex) => {
  let value = tableIndex

  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  }

  return value >>> 0
})

function crc32(input: Buffer): number {
  let crc = 0xffffffff

  for (const byte of input) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8)
  }

  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  const checksum = Buffer.alloc(4)

  length.writeUInt32BE(data.length)
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])))

  return Buffer.concat([length, typeBytes, data, checksum])
}

/**
 * Creates a standards-compliant 8-bit RGBA PNG using only Node built-ins. Keeping
 * this generator in the repository makes uploads deterministic and network-free.
 */
export function createPng(
  width: number,
  height: number,
  pixelAt: PixelFactory,
): Buffer {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 6

  const stride = width * 4 + 1
  const pixels = Buffer.alloc(stride * height)

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * stride
    pixels[rowStart] = 0

    for (let x = 0; x < width; x += 1) {
      const [red, green, blue, alpha] = pixelAt(x, y)
      const offset = rowStart + 1 + x * 4
      pixels[offset] = red
      pixels[offset + 1] = green
      pixels[offset + 2] = blue
      pixels[offset + 3] = alpha
    }
  }

  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(pixels)),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

const background: Rgba = [19, 28, 44, 255]
const beforeAccent: Rgba = [34, 211, 238, 255]
const afterAccent: Rgba = [236, 72, 153, 255]

export const beforeFixture: FixtureImage = {
  name: 'before-fixture.png',
  mimeType: 'image/png',
  buffer: createPng(16, 12, (x, y) =>
    x >= 3 && x <= 8 && y >= 3 && y <= 7 ? beforeAccent : background,
  ),
}

export const afterFixture: FixtureImage = {
  name: 'after-fixture.png',
  mimeType: 'image/png',
  buffer: createPng(16, 12, (x, y) =>
    x >= 5 && x <= 11 && y >= 4 && y <= 8 ? afterAccent : background,
  ),
}
