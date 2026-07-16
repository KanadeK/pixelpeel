import { readFile, stat } from 'node:fs/promises'

import type { Page } from '@playwright/test'

import { afterFixture, beforeFixture } from '../tests/fixtures/png'
import { expect } from './test'

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

export async function openHome(page: Page): Promise<void> {
  await page.goto('./')
  await expect(page).toHaveTitle(/PixelPeel/i)
}

export async function loadExample(page: Page): Promise<void> {
  await openHome(page)
  await page.getByRole('button', { name: 'Load example' }).click()
  await expect(
    page.getByRole('button', { name: 'Peel', exact: true }),
  ).toBeVisible()
  await expect(page.getByLabel('Peel position')).toBeVisible()
}

export async function uploadFixturePair(page: Page): Promise<void> {
  await openHome(page)
  await page.getByLabel('Upload Before image').setInputFiles(beforeFixture)
  await page.getByLabel('Upload After image').setInputFiles(afterFixture)
  await expect(
    page.getByRole('button', { name: 'Peel', exact: true }),
  ).toBeVisible()
}

export async function expectPngDownload(
  page: Page,
  buttonName: 'Export diff PNG' | 'Export PR report',
  filenameKind: 'diff' | 'report',
): Promise<void> {
  const button = page.getByRole('button', { name: buttonName })
  await expect(button).toBeEnabled()

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    button.click(),
  ])

  expect(download.suggestedFilename()).toMatch(
    new RegExp(`^pixelpeel-${filenameKind}-\\d{8}-\\d{6}\\.png$`),
  )

  const downloadPath = await download.path()
  expect(
    downloadPath,
    'Playwright should persist the completed download',
  ).not.toBeNull()

  if (downloadPath === null) {
    return
  }

  const file = await stat(downloadPath)
  expect(file.size, 'Downloaded PNG should contain image data').toBeGreaterThan(
    PNG_SIGNATURE.length,
  )

  const contents = await readFile(downloadPath)
  expect(contents.subarray(0, PNG_SIGNATURE.length)).toEqual(PNG_SIGNATURE)
}
