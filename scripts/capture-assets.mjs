import { spawn } from 'node:child_process'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const url = 'http://127.0.0.1:5199/pixelpeel/'

async function waitForServer() {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // The dev server is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250))
  }
  throw new Error('Timed out waiting for the PixelPeel dev server.')
}

function dataUrl(bytes) {
  return `data:image/png;base64,${bytes.toString('base64')}`
}

const viteBin = resolve(root, 'node_modules/vite/bin/vite.js')
const server = spawn(
  process.execPath,
  [viteBin, '--host', '127.0.0.1', '--port', '5199', '--strictPort'],
  { cwd: root, stdio: 'ignore' },
)

const browser = await chromium.launch()
const tempDiff = resolve(root, '.pixelpeel-capture-diff.png')

try {
  await waitForServer()
  await mkdir(resolve(root, 'docs'), { recursive: true })

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Load example' }).click()
  await page.getByRole('button', { name: 'Diff', exact: true }).click()
  await page.getByText('Changed pixels', { exact: true }).waitFor()
  await page.screenshot({ path: resolve(root, 'docs/screenshot.png') })

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export diff PNG' }).click()
  const download = await downloadPromise
  await download.saveAs(tempDiff)

  const [before, after, diff] = await Promise.all([
    readFile(resolve(root, 'public/examples/before.png')),
    readFile(resolve(root, 'public/examples/after.png')),
    readFile(tempDiff),
  ])

  const social = await browser.newPage({
    viewport: { width: 1280, height: 640 },
  })
  await social.setContent(`<!doctype html><html><head><style>
    *{box-sizing:border-box}html,body{width:1280px;height:640px;margin:0;overflow:hidden}body{padding:48px 58px;color:#eef6fa;background:#0b1018;font-family:"Segoe UI",system-ui,sans-serif}.top{display:flex;align-items:flex-start;justify-content:space-between}.brand{display:flex;align-items:center;gap:16px}.mark{position:relative;width:46px;height:46px}.mark:before,.mark:after{position:absolute;width:30px;height:30px;border:3px solid;border-radius:6px;content:""}.mark:before{top:0;left:0;border-color:#39c6c0;background:#10212a;clip-path:polygon(0 0,100% 0,0 100%)}.mark:after{right:0;bottom:0;z-index:-1;border-color:#ff3f8e;background:#271520}.brand strong{font-size:34px;letter-spacing:-.04em}.local{padding:9px 13px;border:1px solid #356761;border-radius:8px;color:#6edbd5;background:#102522;font:700 14px Consolas,monospace}.tagline{margin:20px 0 28px;color:#9fb0be;font-size:21px}.modes{display:flex;gap:8px}.modes span{padding:7px 10px;border:1px solid #29394a;border-radius:7px;color:#a9bac7;background:#111a25;font:700 12px Consolas,monospace}.modes span:last-child{color:#ff65a3;border-color:#6d2b49}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:30px}.panel{overflow:hidden;border:1px solid #2c3c4e;border-radius:12px;background:#121b27}.panel:last-child{border-color:#803258}.label{display:flex;align-items:center;justify-content:space-between;height:40px;padding:0 14px;color:#b8c6d1;font:700 12px Consolas,monospace}.panel:last-child .label{color:#ff65a3}.panel img{display:block;width:100%;height:245px;object-fit:cover;object-position:top}.footer{display:flex;justify-content:space-between;margin-top:22px;color:#8295a7;font-size:13px}.footer strong{color:#39c6c0}
  </style></head><body><div class="top"><div><div class="brand"><span class="mark"></span><strong>PixelPeel</strong></div><p class="tagline">Peel back UI changes, pixel by pixel.</p><div class="modes"><span>Peel</span><span>Overlay</span><span>Blink</span><span>Diff</span></div></div><span class="local">LOCAL-ONLY</span></div><div class="grid"><div class="panel"><div class="label">BEFORE</div><img src="${dataUrl(before)}"></div><div class="panel"><div class="label">AFTER</div><img src="${dataUrl(after)}"></div><div class="panel"><div class="label">DIFF</div><img src="${dataUrl(diff)}"></div></div><div class="footer"><span>Compare UI screenshots in your browser.</span><strong>PR-ready PNG reports</strong></div></body></html>`)
  await social.screenshot({ path: resolve(root, 'public/social-preview.png') })
} finally {
  await browser.close()
  server.kill()
  await rm(tempDiff, { force: true })
}

console.log('Captured docs/screenshot.png and public/social-preview.png')
