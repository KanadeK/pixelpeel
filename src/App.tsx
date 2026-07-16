import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import type { Theme } from './app-types'
import { Header } from './components/Header'
import { HelpDialog } from './components/HelpDialog'
import { Landing } from './components/Landing'
import { Workspace } from './components/Workspace'
import { useLoadedImageSlot } from './hooks/useLoadedImageSlot'
import { getCopy, type Copy, type Language } from './i18n'
import {
  createDiff,
  DEFAULT_DIFF_SENSITIVITY,
  normalizeImagePair,
  PixelPeelImageError,
  type ImageAlignment,
} from './lib'

const LANGUAGE_KEY = 'pixelpeel-language'
const THEME_KEY = 'pixelpeel-theme'

function readLanguage(): Language {
  return localStorage.getItem(LANGUAGE_KEY) === 'zh-CN' ? 'zh-CN' : 'en'
}

function readTheme(): Theme {
  return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
}

function errorMessage(error: unknown, copy: Copy): string {
  if (!(error instanceof PixelPeelImageError)) return copy.imageError
  const messages = {
    'unsupported-format': copy.invalidType,
    'invalid-image': copy.invalidImage,
    'image-too-large': copy.imageTooLarge,
    'processing-unavailable': copy.imageError,
    'processing-failed': copy.imageMemory,
  } satisfies Record<typeof error.code, string>
  return messages[error.code]
}

async function exampleFile(path: string, name: string): Promise<File> {
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`)
  if (!response.ok)
    throw new Error(`Example asset failed with ${response.status}`)
  const blob = await response.blob()
  return new File([blob], name, { type: 'image/png' })
}

function App() {
  const beforeSlot = useLoadedImageSlot()
  const afterSlot = useLoadedImageSlot()
  const [language, setLanguage] = useState<Language>(readLanguage)
  const [theme, setTheme] = useState<Theme>(readTheme)
  const [alignment, setAlignment] = useState<ImageAlignment>('center')
  const [sensitivity, setSensitivity] = useState(DEFAULT_DIFF_SENSITIVITY)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [example, setExample] = useState(false)
  const [exampleLoading, setExampleLoading] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const copy = useMemo(() => getCopy(language), [language])

  useEffect(() => {
    document.documentElement.lang = language === 'zh-CN' ? 'zh-CN' : 'en'
    localStorage.setItem(LANGUAGE_KEY, language)
  }, [language])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(THEME_KEY, theme)
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#0b1018' : '#eef3f7')
  }, [theme])

  const loadInto = useCallback(
    async (kind: 'before' | 'after', file: File, fromPaste = false) => {
      setError(null)
      setStatus('')
      try {
        const loaded = await (kind === 'before'
          ? beforeSlot.load(file)
          : afterSlot.load(file))
        if (!loaded) return
        setExample(false)
        if (fromPaste) {
          setStatus(
            kind === 'before'
              ? copy.pasteAddedBefore
              : afterSlot.image
                ? copy.pasteReplacedAfter
                : copy.pasteAddedAfter,
          )
        }
      } catch (loadError) {
        setError(errorMessage(loadError, copy))
      }
    },
    [afterSlot, beforeSlot, copy],
  )

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const item = [...(event.clipboardData?.items ?? [])].find((candidate) =>
        candidate.type.startsWith('image/'),
      )
      const file = item?.getAsFile()
      if (!file) return
      event.preventDefault()
      const kind = beforeSlot.image ? 'after' : 'before'
      void loadInto(kind, file, true)
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [beforeSlot.image, loadInto])

  const loadExample = async () => {
    setExampleLoading(true)
    setError(null)
    setStatus('')
    try {
      const [beforeFile, afterFile] = await Promise.all([
        exampleFile('examples/before.png', 'pixelpeel-example-before.png'),
        exampleFile('examples/after.png', 'pixelpeel-example-after.png'),
      ])
      const loaded = await Promise.all([
        beforeSlot.load(beforeFile),
        afterSlot.load(afterFile),
      ])
      if (loaded.every(Boolean)) setExample(true)
    } catch (loadError) {
      setError(errorMessage(loadError, copy))
    } finally {
      setExampleLoading(false)
    }
  }

  const clearSlot = (kind: 'before' | 'after') => {
    if (kind === 'before') beforeSlot.clear()
    else afterSlot.clear()
    setExample(false)
    setError(null)
    setStatus('')
  }

  const resetImages = () => {
    beforeSlot.clear()
    afterSlot.clear()
    setExample(false)
    setAlignment('center')
    setSensitivity(DEFAULT_DIFF_SENSITIVITY)
    setError(null)
    setStatus('')
  }

  const normalized = useMemo(() => {
    if (!beforeSlot.image || !afterSlot.image) return null
    return normalizeImagePair(
      beforeSlot.image.imageData,
      afterSlot.image.imageData,
      alignment,
    )
  }, [afterSlot.image, alignment, beforeSlot.image])

  const diff = useMemo(() => {
    if (!normalized) return null
    return createDiff(normalized.before, normalized.after, { sensitivity })
  }, [normalized, sensitivity])

  const inWorkspace = Boolean(
    beforeSlot.image && afterSlot.image && normalized && diff,
  )

  return (
    <div className="app-shell">
      <Header
        copy={copy}
        language={language}
        theme={theme}
        compact={inWorkspace}
        onLanguageChange={setLanguage}
        onThemeChange={setTheme}
        onHelp={() => setHelpOpen(true)}
      />

      {beforeSlot.image && afterSlot.image && normalized && diff ? (
        <Workspace
          copy={copy}
          language={language}
          before={beforeSlot.image}
          after={afterSlot.image}
          normalized={normalized}
          diff={diff}
          alignment={alignment}
          sensitivity={sensitivity}
          example={example}
          onAlignmentChange={setAlignment}
          onSensitivityChange={setSensitivity}
          onResetImages={resetImages}
        />
      ) : (
        <Landing
          copy={copy}
          before={beforeSlot.image}
          after={afterSlot.image}
          error={error}
          status={status}
          exampleLoading={exampleLoading}
          onFile={(kind, file) => void loadInto(kind, file)}
          onClear={clearSlot}
          onLoadExample={() => void loadExample()}
        />
      )}

      <HelpDialog
        open={helpOpen}
        copy={copy}
        onClose={() => setHelpOpen(false)}
      />
    </div>
  )
}

export default App
