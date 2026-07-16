import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'

const root = resolve(import.meta.dirname, '..')
const origin = 'http://127.0.0.1:5198'
const appUrl = `${origin}/pixelpeel/`

async function waitForServer() {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(appUrl)
      if (response.ok) return
    } catch {
      // The preview server is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250))
  }
  throw new Error('Timed out waiting for the production preview server.')
}

const viteBin = resolve(root, 'node_modules/vite/bin/vite.js')
const server = spawn(
  process.execPath,
  [viteBin, 'preview', '--host', '127.0.0.1', '--port', '5198', '--strictPort'],
  { cwd: root, stdio: 'ignore' },
)
const browser = await chromium.launch()

try {
  await waitForServer()
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const failedResponses = []
  const externalRequests = []
  const writeRequests = []
  const consoleErrors = []

  page.on('response', (response) => {
    if (response.status() >= 400) {
      failedResponses.push(`${response.status()} ${response.url()}`)
    }
  })
  page.on('request', (request) => {
    const requestUrl = request.url()
    if (
      !requestUrl.startsWith(origin) &&
      !requestUrl.startsWith('blob:') &&
      !requestUrl.startsWith('data:')
    ) {
      externalRequests.push(requestUrl)
    }
    if (!['GET', 'HEAD'].includes(request.method())) {
      writeRequests.push(`${request.method()} ${requestUrl}`)
    }
  })
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(error.message))

  await page.goto(appUrl, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Load example' }).click()
  await page.getByRole('button', { name: 'Diff', exact: true }).click()
  await page.getByText('Changed pixels', { exact: true }).waitFor()

  const failures = [
    ...failedResponses,
    ...externalRequests.map((url) => `external ${url}`),
    ...writeRequests,
    ...consoleErrors.map((message) => `console ${message}`),
  ]
  if (failures.length > 0) {
    throw new Error(`Production verification failed:\n${failures.join('\n')}`)
  }

  console.log(
    'Production preview passed: /pixelpeel/ loaded, 0 resource errors, 0 external requests, 0 write/upload requests, 0 console errors.',
  )
} finally {
  await browser.close()
  server.kill()
}
