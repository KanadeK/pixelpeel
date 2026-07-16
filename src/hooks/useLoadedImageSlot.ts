import { useCallback, useEffect, useRef, useState } from 'react'
import type { LoadedImage } from '../app-types'
import { decodeImageFile } from '../lib'

export interface LoadedImageSlot {
  image: LoadedImage | null
  load: (file: File) => Promise<boolean>
  clear: () => void
}

export function useLoadedImageSlot(): LoadedImageSlot {
  const [image, setImage] = useState<LoadedImage | null>(null)
  const imageRef = useRef<LoadedImage | null>(null)
  const requestRef = useRef(0)

  const replace = useCallback((next: LoadedImage | null) => {
    const previous = imageRef.current
    imageRef.current = next
    setImage(next)
    if (previous) URL.revokeObjectURL(previous.url)
  }, [])

  const load = useCallback(
    async (file: File): Promise<boolean> => {
      const request = requestRef.current + 1
      requestRef.current = request
      const decoded = await decodeImageFile(file)
      if (request !== requestRef.current) return false

      let url: string
      try {
        url = URL.createObjectURL(file)
      } catch (error) {
        throw new Error('Could not create a local image preview.', {
          cause: error,
        })
      }

      replace({
        file,
        name: decoded.name,
        url,
        width: decoded.width,
        height: decoded.height,
        size: decoded.size,
        imageData: decoded.imageData,
      })
      return true
    },
    [replace],
  )

  const clear = useCallback(() => {
    requestRef.current += 1
    replace(null)
  }, [replace])

  useEffect(
    () => () => {
      requestRef.current += 1
      if (imageRef.current) URL.revokeObjectURL(imageRef.current.url)
      imageRef.current = null
    },
    [],
  )

  return { image, load, clear }
}
