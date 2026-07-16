import { describe, expect, it } from 'vitest'
import { dictionaries, getCopy, type CopyKey } from './i18n'

describe('i18n dictionaries', () => {
  it('keeps English and Simplified Chinese keys complete and identical', () => {
    const englishKeys = Object.keys(dictionaries.en).sort()
    const chineseKeys = Object.keys(dictionaries['zh-CN']).sort()

    expect(chineseKeys).toEqual(englishKeys)
    expect(englishKeys.length).toBeGreaterThan(80)
  })

  it('provides non-empty critical copy in both languages', () => {
    const criticalKeys: readonly CopyKey[] = [
      'heroTitle',
      'privacyLabel',
      'uploadBefore',
      'uploadAfter',
      'modePeel',
      'modeOverlay',
      'modeBlink',
      'modeDiff',
      'exportDiff',
      'exportReport',
      'copySummary',
    ]

    for (const language of ['en', 'zh-CN'] as const) {
      const copy = getCopy(language)
      for (const key of criticalKeys) {
        expect(copy[key].trim(), `${language}.${key}`).not.toBe('')
      }
    }
  })
})
