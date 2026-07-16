import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { getCopy } from '../i18n'
import { Header } from './Header'
import { Landing } from './Landing'

const copy = getCopy('en')

describe('core UI accessibility', () => {
  it('renders the local-only promise and sends a selected file to Before', async () => {
    const user = userEvent.setup()
    const onFile = vi.fn()
    const file = new File(['pixel'], 'before.png', { type: 'image/png' })

    render(
      <Landing
        copy={copy}
        before={null}
        after={null}
        error={null}
        status=""
        exampleLoading={false}
        onFile={onFile}
        onClear={vi.fn()}
        onLoadExample={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('heading', { name: copy.brandTagline }),
    ).toBeVisible()
    expect(screen.getAllByText(copy.privacyLabel)[0]).toBeVisible()

    await user.upload(screen.getByLabelText(copy.uploadBefore), file)
    expect(onFile).toHaveBeenCalledWith('before', file)
  })

  it('exposes language, theme, and shortcut controls by accessible name', async () => {
    const user = userEvent.setup()
    const onLanguageChange = vi.fn()
    const onThemeChange = vi.fn()
    const onHelp = vi.fn()

    render(
      <Header
        copy={copy}
        language="en"
        theme="dark"
        onLanguageChange={onLanguageChange}
        onThemeChange={onThemeChange}
        onHelp={onHelp}
      />,
    )

    await user.click(screen.getByRole('button', { name: copy.switchToChinese }))
    await user.click(screen.getByRole('button', { name: copy.switchToLight }))
    await user.click(screen.getByRole('button', { name: copy.help }))

    expect(onLanguageChange).toHaveBeenCalledWith('zh-CN')
    expect(onThemeChange).toHaveBeenCalledWith('light')
    expect(onHelp).toHaveBeenCalledOnce()
  })
})
