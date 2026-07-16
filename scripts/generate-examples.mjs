import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const output = resolve(root, 'public/examples')

function exampleHtml(variant) {
  const after = variant === 'after'
  const accent = after ? '#db2870' : '#0f8f8a'
  const action = after ? 'Create release' : 'New release'
  const gap = after ? 28 : 20
  const order = after ? '2fr 1fr' : '1fr 2fr'
  const status = after ? 'Ready for review' : 'Draft in progress'
  return `<!doctype html>
  <html>
    <head>
      <style>
        * { box-sizing: border-box; }
        html, body { width: 1200px; height: 760px; margin: 0; overflow: hidden; }
        body { display: grid; grid-template-columns: 220px 1fr; color: #1c2b36; background: #f4f7f9; font-family: "Segoe UI", system-ui, sans-serif; }
        aside { padding: 28px 22px; color: #dfe8ef; background: #111a25; }
        .logo { display: flex; align-items: center; gap: 11px; margin-bottom: 42px; font-weight: 750; }
        .mark { width: 26px; height: 26px; border: 3px solid ${accent}; border-radius: 6px; box-shadow: 7px 7px 0 #2c3b49; }
        nav { display: grid; gap: 7px; }
        nav span { padding: 11px 12px; border-radius: 7px; color: #8fa1b1; font-size: 14px; }
        nav .active { color: #f7fbff; background: #1d2a38; }
        main { padding: 34px 42px; }
        header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 34px; }
        h1 { margin: 0 0 7px; font-size: 32px; letter-spacing: -.04em; }
        header p { margin: 0; color: #718392; font-size: 14px; }
        button { padding: 12px 17px; border: 0; border-radius: 8px; color: white; background: ${accent}; font-weight: 700; }
        .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 24px; }
        .stat { padding: 20px; border: 1px solid #d8e0e6; border-radius: 11px; background: white; }
        .stat span { display: block; color: #718392; font-size: 12px; }
        .stat strong { display: block; margin-top: 8px; font-size: 24px; }
        .content { display: grid; grid-template-columns: ${order}; gap: ${gap}px; }
        .panel { min-height: 382px; padding: 22px; border: 1px solid #d8e0e6; border-radius: 11px; background: white; }
        .panel h2 { margin: 0 0 22px; font-size: 17px; }
        .chart { display: flex; align-items: end; height: 210px; gap: 13px; padding: 18px 10px 0; border-bottom: 1px solid #d8e0e6; }
        .bar { flex: 1; min-width: 20px; border-radius: 5px 5px 0 0; background: ${accent}; opacity: .78; }
        .bar:nth-child(1) { height: ${after ? 48 : 38}%; }
        .bar:nth-child(2) { height: ${after ? 72 : 68}%; }
        .bar:nth-child(3) { height: ${after ? 58 : 82}%; }
        .bar:nth-child(4) { height: ${after ? 90 : 63}%; }
        .activity { display: grid; gap: 11px; }
        .row { display: grid; grid-template-columns: 34px 1fr; align-items: center; gap: 10px; }
        .avatar { width: 34px; height: 34px; border-radius: 50%; background: #dfe7ec; }
        .line { height: 9px; border-radius: 5px; background: #e6ecef; }
        .line.short { width: 64%; margin-top: 7px; background: #edf1f3; }
        .badge { display: inline-block; margin-top: 20px; padding: 7px 9px; border-radius: 6px; color: ${accent}; background: color-mix(in srgb, ${accent} 10%, white); font-size: 12px; font-weight: 700; }
      </style>
    </head>
    <body>
      <aside>
        <div class="logo"><span class="mark"></span>Northstar</div>
        <nav><span class="active">Overview</span><span>Releases</span><span>Environments</span><span>Team</span><span>Settings</span></nav>
      </aside>
      <main>
        <header><div><h1>Release overview</h1><p>Track quality and prepare the next deployment.</p></div><button>${action}</button></header>
        <section class="stats"><div class="stat"><span>Builds</span><strong>${after ? 28 : 24}</strong></div><div class="stat"><span>Pass rate</span><strong>${after ? '96.4%' : '92.8%'}</strong></div><div class="stat"><span>Open reviews</span><strong>${after ? 3 : 5}</strong></div></section>
        <section class="content"><article class="panel"><h2>Deployment activity</h2><div class="chart"><span class="bar"></span><span class="bar"></span><span class="bar"></span><span class="bar"></span></div><span class="badge">${status}</span></article><article class="panel"><h2>Recent changes</h2><div class="activity">${Array.from({ length: after ? 5 : 4 }, (_, i) => `<div class="row"><span class="avatar"></span><div><div class="line"></div><div class="line short" style="width:${55 + i * 7}%"></div></div></div>`).join('')}</div></article></section>
      </main>
    </body>
  </html>`
}

await mkdir(output, { recursive: true })
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 760 } })
  for (const variant of ['before', 'after']) {
    await page.setContent(exampleHtml(variant))
    await page.screenshot({ path: resolve(output, `${variant}.png`) })
  }
} finally {
  await browser.close()
}

console.log(`Generated example PNGs in ${output}`)
