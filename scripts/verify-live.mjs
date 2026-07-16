import { chromium } from '@playwright/test'

const targetUrl =
  process.env.PIXELPEEL_LIVE_URL ?? 'https://kanadek.github.io/pixelpeel/'
const targetOrigin = new URL(targetUrl).origin

const browser = await chromium.launch()
const context = await browser.newContext({
  acceptDownloads: true,
  permissions: ['clipboard-read', 'clipboard-write'],
})
const page = await context.newPage()

const consoleErrors = []
const pageErrors = []
const failedResponses = []
const externalRequests = []
const writeRequests = []

page.on('console', (message) => {
  if (message.type() === 'error') {
    consoleErrors.push(message.text())
  }
})

page.on('pageerror', (error) => {
  pageErrors.push(error.message)
})

page.on('request', (request) => {
  const requestUrl = new URL(request.url())

  if (requestUrl.origin !== targetOrigin) {
    externalRequests.push(request.url())
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
    writeRequests.push(`${request.method()} ${request.url()}`)
  }
})

page.on('response', (response) => {
  if (response.status() >= 400) {
    failedResponses.push(`${response.status()} ${response.url()}`)
  }
})

const assertEmpty = (label, values) => {
  if (values.length > 0) {
    throw new Error(`${label}:\n${values.join('\n')}`)
  }
}

const verifyDownload = async (buttonName, filenamePattern) => {
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: buttonName }).click()
  const download = await downloadPromise

  if (!filenamePattern.test(download.suggestedFilename())) {
    throw new Error(`Unexpected download name: ${download.suggestedFilename()}`)
  }

  const stream = await download.createReadStream()
  let byteLength = 0

  for await (const chunk of stream) {
    byteLength += chunk.length
  }

  if (byteLength === 0) {
    throw new Error(`${download.suggestedFilename()} was empty`)
  }
}

const response = await page.goto(targetUrl, { waitUntil: 'networkidle' })

if (!response || response.status() !== 200) {
  throw new Error(`Live page returned ${response?.status() ?? 'no response'}`)
}

await page.reload({ waitUntil: 'networkidle' })
if (!/PixelPeel/i.test(await page.title())) {
  throw new Error(`Unexpected page title: ${await page.title()}`)
}

await page.getByRole('button', { name: 'Load example' }).waitFor()
await page.getByRole('button', { name: 'Load example' }).click()
await page.getByText('Changed pixels').waitFor()

await page.getByRole('button', { name: 'Overlay', exact: true }).click()
await page.getByLabel('After opacity').fill('73')
await page.getByRole('button', { name: 'Blink', exact: true }).click()

const blinkToggle = page.getByRole('button', {
  name: /^(Start|Pause) blinking$/,
})
const initialBlinkLabel =
  (await blinkToggle.getAttribute('aria-label')) ??
  (await blinkToggle.innerText())

await blinkToggle.click()

if (/^Start blinking$/i.test(initialBlinkLabel.trim())) {
  await page.getByRole('button', { name: 'Pause blinking' }).click()
} else {
  await page.getByRole('button', { name: 'Start blinking' }).click()
}

await page.getByRole('button', { name: 'Diff', exact: true }).click()

await verifyDownload('Export diff PNG', /^pixelpeel-diff-\d{8}-\d{6}\.png$/)
await verifyDownload('Export PR report', /^pixelpeel-report-\d{8}-\d{6}\.png$/)

await page.getByRole('button', { name: 'Copy PR summary' }).click()
const clipboardText = await page.evaluate(() => navigator.clipboard.readText())

if (!clipboardText.includes('Visual comparison generated with PixelPeel.')) {
  throw new Error('Copied summary did not contain the expected attribution')
}

assertEmpty('Console errors', consoleErrors)
assertEmpty('Page errors', pageErrors)
assertEmpty('Failed responses', failedResponses)
assertEmpty('External requests', externalRequests)
assertEmpty('Write requests', writeRequests)

console.log(`Verified live deployment: ${targetUrl}`)
console.log('Core modes, exports, clipboard, assets, and refresh passed.')
console.log(
  'No console errors, failed resources, external requests, or writes.',
)

await browser.close()
