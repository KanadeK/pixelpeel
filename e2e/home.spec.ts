import { afterFixture, beforeFixture } from '../tests/fixtures/png'
import { loadExample, openHome } from './helpers'
import { expect, test } from './test'

test('homepage loads with its local-only promise and upload controls', async ({
  page,
}) => {
  await openHome(page)

  await expect(
    page.getByRole('heading', {
      name: /Peel back UI changes, pixel by pixel/i,
    }),
  ).toBeVisible()
  await expect(
    page.getByText(/Images never leave your browser/i).first(),
  ).toBeVisible()
  await expect(page.getByLabel('Upload Before image')).toBeAttached()
  await expect(page.getByLabel('Upload After image')).toBeAttached()
  await expect(page.getByRole('button', { name: 'Load example' })).toBeVisible()
})

test('Load example opens a ready-to-use comparison workspace', async ({
  page,
}) => {
  await loadExample(page)

  await expect(page.getByText(/example/i).first()).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Overlay', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Blink', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Diff', exact: true }),
  ).toBeVisible()
})

test('repository fixtures can be uploaded as Before and After images', async ({
  page,
}) => {
  await openHome(page)

  await page.getByLabel('Upload Before image').setInputFiles(beforeFixture)
  await expect(page.getByText(beforeFixture.name)).toBeVisible()

  await page.getByLabel('Upload After image').setInputFiles(afterFixture)
  await expect(
    page.getByRole('button', { name: 'Peel', exact: true }),
  ).toBeVisible()
  await expect(page.getByText(beforeFixture.name)).toBeVisible()
  await expect(page.getByText(afterFixture.name)).toBeVisible()
  await expect(page.getByText(/16\s*[×x]\s*12/i).first()).toBeVisible()
})
