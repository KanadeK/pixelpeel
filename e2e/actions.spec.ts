import { expectPngDownload, loadExample, openHome } from './helpers'
import { expect, test } from './test'

test('language can switch between English and Simplified Chinese', async ({
  page,
}) => {
  await openHome(page)

  await page.getByRole('button', { name: '中文' }).click()
  await expect(page.getByRole('button', { name: 'English' })).toBeVisible()

  await page.getByRole('button', { name: 'English' }).click()
  await expect(page.getByRole('button', { name: '中文' })).toBeVisible()
})

test('theme control visibly changes the rendered color scheme', async ({
  page,
}) => {
  await openHome(page)

  const theme = page.getByRole('button', { name: /theme/i })
  await expect(theme).toBeVisible()

  const renderedTheme = () =>
    page.evaluate(() =>
      JSON.stringify({
        background: getComputedStyle(document.body).backgroundColor,
        color: getComputedStyle(document.body).color,
        colorScheme: getComputedStyle(document.documentElement).colorScheme,
      }),
    )
  const before = await renderedTheme()

  await theme.click()
  await expect.poll(renderedTheme).not.toBe(before)
})

test('Copy PR summary writes useful Markdown and announces success', async ({
  page,
}) => {
  await loadExample(page)
  await page.getByRole('button', { name: 'Diff', exact: true }).click()
  await page.getByRole('button', { name: 'Copy PR summary' }).click()

  await expect(
    page.locator('[aria-live]').filter({ hasText: /copied/i }),
  ).toBeVisible()

  const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  expect(clipboard).toContain('Visual comparison generated with PixelPeel.')
  expect(clipboard).toMatch(/- Changed pixels: [\d,]+/)
  expect(clipboard).toMatch(/- Changed area: [\d.]+%/)
  expect(clipboard).toMatch(/- Threshold: \d+/)
  expect(clipboard).toMatch(/- Before: \d+×\d+/)
  expect(clipboard).toMatch(/- After: \d+×\d+/)
})

test('Export diff PNG downloads a non-empty PNG', async ({ page }) => {
  await loadExample(page)
  await page.getByRole('button', { name: 'Diff', exact: true }).click()
  await expectPngDownload(page, 'Export diff PNG', 'diff')
})

test('Export PR report downloads a non-empty PNG', async ({ page }) => {
  await loadExample(page)
  await page.getByRole('button', { name: 'Diff', exact: true }).click()
  await expectPngDownload(page, 'Export PR report', 'report')
})
