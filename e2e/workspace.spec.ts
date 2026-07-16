import { loadExample, uploadFixturePair } from './helpers'
import { expect, test } from './test'

test('all four comparison modes expose their mode-specific controls', async ({
  page,
}) => {
  await loadExample(page)

  await expect(page.getByLabel('Peel position')).toBeVisible()

  await page.getByRole('button', { name: 'Overlay', exact: true }).click()
  await expect(page.getByLabel('After opacity')).toBeVisible()

  await page.getByRole('button', { name: 'Blink', exact: true }).click()
  await expect(
    page.getByRole('button', { name: /^(Start|Pause) blinking$/ }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Diff', exact: true }).click()
  await expect(page.getByText(/Changed pixels/i).first()).toBeVisible()
})

test('Peel position supports pointer-style input and keyboard adjustment', async ({
  page,
}) => {
  await loadExample(page)

  const slider = page.getByLabel('Peel position')
  await slider.fill('67')
  await expect(slider).toHaveValue('67')

  await slider.focus()
  await slider.press('ArrowRight')
  await expect(slider).toHaveValue('68')
})

test('Overlay controls After opacity from zero to one hundred percent', async ({
  page,
}) => {
  await loadExample(page)
  await page.getByRole('button', { name: 'Overlay', exact: true }).click()

  const opacity = page.getByLabel('After opacity')
  await expect(opacity).toHaveValue('50')
  await opacity.fill('73')
  await expect(opacity).toHaveValue('73')
  await expect(page.getByText(/73%/).first()).toBeVisible()
})

test('Blink can be paused and started again', async ({ page }) => {
  await loadExample(page)
  await page.getByRole('button', { name: 'Blink', exact: true }).click()

  const toggle = page.getByRole('button', { name: /^(Start|Pause) blinking$/ })
  const initialLabel =
    (await toggle.getAttribute('aria-label')) ?? (await toggle.innerText())

  await toggle.click()
  if (/^Start blinking$/i.test(initialLabel.trim())) {
    await expect(
      page.getByRole('button', { name: 'Pause blinking' }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Pause blinking' }).click()
    await expect(
      page.getByRole('button', { name: 'Start blinking' }),
    ).toBeVisible()
  } else {
    await expect(
      page.getByRole('button', { name: 'Start blinking' }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Start blinking' }).click()
    await expect(
      page.getByRole('button', { name: 'Pause blinking' }),
    ).toBeVisible()
  }
})

test('Diff reports non-zero metrics for known changed fixture pixels', async ({
  page,
}) => {
  await uploadFixturePair(page)
  await page.getByRole('button', { name: 'Diff', exact: true }).click()

  await expect(page.getByText(/Changed pixels/i).first()).toBeVisible()
  await expect(page.getByText(/Total pixels/i).first()).toBeVisible()
  await expect(page.getByText(/Changed percentage/i).first()).toBeVisible()

  await expect
    .poll(() => page.locator('body').innerText())
    .toMatch(/Changed pixels\s+(?!0(?:\D|$))[\d,]+/i)
  await expect
    .poll(() => page.locator('body').innerText())
    .toMatch(/Total pixels\s+192\b/i)
  await expect(page.getByText(/16\s*[×x]\s*12/i).first()).toBeVisible()
})
