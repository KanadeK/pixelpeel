import {
  GithubLogoIcon,
  KeyboardIcon,
  MoonIcon,
  SunIcon,
  TranslateIcon,
} from '@phosphor-icons/react'
import type { Theme } from '../app-types'
import { type Copy, type Language } from '../i18n'
import { Brand } from './Brand'

interface HeaderProps {
  copy: Copy
  language: Language
  theme: Theme
  compact?: boolean
  onLanguageChange: (language: Language) => void
  onThemeChange: (theme: Theme) => void
  onHelp: () => void
}

export function Header({
  copy,
  language,
  theme,
  compact = false,
  onLanguageChange,
  onThemeChange,
  onHelp,
}: HeaderProps) {
  const nextLanguage: Language = language === 'en' ? 'zh-CN' : 'en'
  const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'

  return (
    <header
      className={compact ? 'site-header site-header--compact' : 'site-header'}
    >
      <a
        className="brand-link"
        href={import.meta.env.BASE_URL}
        aria-label={copy.homeLabel}
      >
        <Brand copy={copy} compact={compact} />
      </a>
      <nav className="header-actions" aria-label={copy.utilityNavigation}>
        <a
          className="icon-button icon-button--labeled github-link"
          href="https://github.com/KanadeK/pixelpeel"
          target="_blank"
          rel="noreferrer"
        >
          <GithubLogoIcon size={18} weight="bold" aria-hidden="true" />
          <span>{copy.github}</span>
        </a>
        <button
          className="icon-button icon-button--labeled"
          type="button"
          onClick={() => onLanguageChange(nextLanguage)}
          aria-label={
            language === 'en' ? copy.switchToChinese : copy.switchToEnglish
          }
        >
          <TranslateIcon size={18} weight="bold" aria-hidden="true" />
          <span>
            {language === 'en' ? copy.switchToChinese : copy.switchToEnglish}
          </span>
        </button>
        <button
          className="icon-button"
          type="button"
          onClick={() => onThemeChange(nextTheme)}
          aria-label={theme === 'dark' ? copy.switchToLight : copy.switchToDark}
          title={theme === 'dark' ? copy.switchToLight : copy.switchToDark}
        >
          {theme === 'dark' ? (
            <SunIcon size={19} weight="bold" aria-hidden="true" />
          ) : (
            <MoonIcon size={19} weight="bold" aria-hidden="true" />
          )}
        </button>
        <button
          className="icon-button"
          type="button"
          onClick={onHelp}
          aria-label={copy.help}
          title={copy.help}
        >
          <KeyboardIcon size={20} weight="bold" aria-hidden="true" />
        </button>
      </nav>
    </header>
  )
}
