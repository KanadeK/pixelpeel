export type CompareMode = 'peel' | 'overlay' | 'blink' | 'diff'

export type PreviewBackground = 'light' | 'dark' | 'checker'

export type Theme = 'light' | 'dark'

export interface LoadedImage {
  file: File
  name: string
  url: string
  width: number
  height: number
  size: number
  imageData: ImageData
}
