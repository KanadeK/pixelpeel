import { uploadFixturePair } from './helpers'
import { expect, test } from './test'

test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
})

test('mobile layout supports upload, Peel, Diff, and export controls', async ({
  page,
}) => {
  await uploadFixturePair(page)

  await expect(page.getByLabel('Peel position')).toBeVisible()
  await page.getByLabel('Peel position').fill('61')
  await expect(page.getByLabel('Peel position')).toHaveValue('61')

  await page.getByRole('button', { name: 'Diff', exact: true }).click()
  await expect(page.getByText(/Changed pixels/i).first()).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Export diff PNG' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Export PR report' }),
  ).toBeVisible()

  const horizontalOverflow = await page.evaluate(
    () =>
      Math.max(
        document.body.scrollWidth,
        document.documentElement.scrollWidth,
      ) - window.innerWidth,
  )
  expect(horizontalOverflow).toBeLessThanOrEqual(1)
})
