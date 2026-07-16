import { useRef, useState, type DragEvent } from 'react'
import {
  ArrowsClockwiseIcon,
  ImageIcon,
  TrashIcon,
  UploadSimpleIcon,
} from '@phosphor-icons/react'
import type { LoadedImage } from '../app-types'
import type { Copy } from '../i18n'
import { formatFileSize } from '../lib'

interface DropZoneProps {
  kind: 'before' | 'after'
  image: LoadedImage | null
  copy: Copy
  onFile: (file: File) => void
  onClear: () => void
}

export function DropZone({
  kind,
  image,
  copy,
  onFile,
  onClear,
}: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const inputLabel = kind === 'before' ? copy.uploadBefore : copy.uploadAfter
  const title = kind === 'before' ? copy.dropBefore : copy.dropAfter
  const kindLabel = kind === 'before' ? copy.before : copy.after

  const takeDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files.item(0)
    if (file) onFile(file)
  }

  if (image) {
    return (
      <section
        className="upload-slot upload-slot--ready"
        aria-label={inputLabel}
      >
        <div className="upload-slot__preview">
          <img src={image.url} alt={`${kindLabel}: ${image.name}`} />
          <span className={`image-kind image-kind--${kind}`}>{kindLabel}</span>
        </div>
        <div className="upload-slot__file">
          <div>
            <strong title={image.name}>{image.name}</strong>
            <span>
              {image.width}×{image.height} · {formatFileSize(image.size)}
            </span>
          </div>
          <div className="upload-slot__actions">
            <button
              className="text-button"
              type="button"
              onClick={() => inputRef.current?.click()}
            >
              <ArrowsClockwiseIcon size={17} weight="bold" aria-hidden="true" />
              {copy.replaceImage}
            </button>
            <button
              className="icon-button icon-button--danger"
              type="button"
              onClick={onClear}
              aria-label={`${copy.clearImage}: ${kindLabel}`}
              title={copy.clearImage}
            >
              <TrashIcon size={17} weight="bold" aria-hidden="true" />
            </button>
          </div>
        </div>
        <input
          ref={inputRef}
          className="visually-hidden"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-label={inputLabel}
          onChange={(event) => {
            const file = event.currentTarget.files?.item(0)
            if (file) onFile(file)
            event.currentTarget.value = ''
          }}
        />
      </section>
    )
  }

  return (
    <div
      className={dragging ? 'upload-slot upload-slot--dragging' : 'upload-slot'}
      onDragEnter={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDragging(false)
        }
      }}
      onDrop={takeDrop}
    >
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        aria-label={inputLabel}
        onChange={(event) => {
          const file = event.currentTarget.files?.item(0)
          if (file) onFile(file)
          event.currentTarget.value = ''
        }}
      />
      <button
        className="drop-target"
        type="button"
        onClick={() => inputRef.current?.click()}
      >
        <span className={`drop-target__icon drop-target__icon--${kind}`}>
          {dragging ? (
            <ImageIcon size={28} weight="duotone" aria-hidden="true" />
          ) : (
            <UploadSimpleIcon size={28} weight="duotone" aria-hidden="true" />
          )}
        </span>
        <span className={`image-kind image-kind--${kind}`}>{kindLabel}</span>
        <strong>{title}</strong>
        <span>{copy.chooseOrDrop}</span>
        <small>{copy.supportedFiles}</small>
      </button>
    </div>
  )
}
