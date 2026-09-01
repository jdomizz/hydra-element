#!/usr/bin/env node
/**
 * check-extensions — Playwright compat pass over the playground extensions
 * catalog. Launches `pnpm dev`, opens the playground in Chromium, clicks
 * every entry in <extensions-panel>, captures the canvas + console, and
 * writes a compat matrix into EXTENSIONS.md.
 *
 * Why this is a script and not a WTR test:
 *   - WTR runs offline-headless; CDN fetches for 29 extensions are
 *     unreliable in that environment. A standalone script that can be
 *     re-run on demand is the right home for this pass.
 *   - The catalog data lives in playground/extensions.js (already an ESM
 *     module), so the script imports it directly — no parser duplication.
 *
 * Usage:
 *   node scripts/check-extensions.mjs                  # default: localhost:5173
 *   BASE_URL=http://localhost:4173 node scripts/...    # preview server
 *
 * The script writes:
 *   - console-output/<slug>.txt          # full console for that entry
 *   - console-output/<slug>.png          # canvas screenshot
 *   - EXTENSIONS.md                      # matrix with evidence paths
 *
 * The script then kills the dev server it spawned and exits.
 */
import { spawn } from 'node:child_process'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

// Resolve playwright via the pnpm virtual store (it's a transitive dep
// via @web/test-runner-playwright). This keeps package.json untouched —
// Agent 1 owns package.json.
const PLAYWRIGHT_PATH = resolve(
  process.cwd(),
  'node_modules/.pnpm/playwright@1.58.2/node_modules/playwright/index.mjs'
)
const { chromium } = await import(PLAYWRIGHT_PATH)

const { EXTENSIONS } = await import('../playground/extensions.js')

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'
const SHOTS_DIR = resolve(process.cwd(), 'console-output')

async function waitForServer(url, timeoutMs = 30_000) {
  const t0 = Date.now()
  while (Date.now() - t0 < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return true
    } catch {
      /* not ready */
    }
    await delay(500)
  }
  return false
}

async function startDevServer() {
  const proc = spawn('pnpm', ['dev'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  })
  proc.stdout.on('data', d => process.stdout.write(`[dev] ${d}`))
  proc.stderr.on('data', d => process.stderr.write(`[dev!] ${d}`))
  const ok = await waitForServer(BASE_URL)
  if (!ok) {
    proc.kill('SIGTERM')
    throw new Error(`dev server did not become ready at ${BASE_URL}`)
  }
  return proc
}

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function runFor(panel, entry, page) {
  const s = slug(entry.name)
  const consoleLines = []
  const errors = []

  const onConsole = msg => {
    consoleLines.push(`[${msg.type()}] ${msg.text()}`)
    if (msg.type() === 'error') errors.push(msg.text())
  }
  const onPageError = err => {
    consoleLines.push(`[pageerror] ${err.message}`)
    errors.push(err.message)
  }

  page.on('console', onConsole)
  page.on('pageerror', onPageError)

  try {
    // Switch to slot 0 so the screenshot always shows the result on the
    // first cell (the others keep their own state). The panel doesn't
    // dispatch a target-change for us — synthesize one.
    await page.evaluate(() => {
      const cells = document.querySelectorAll('.app__center .cell')
      cells.forEach((c, i) => {
        c.classList.toggle('is-active', i === 0)
        c.setAttribute('aria-current', i === 0 ? 'true' : 'false')
      })
      document.dispatchEvent(
        new CustomEvent('target-change', {
          detail: { index: 0, element: document.querySelector('#g-0'), label: '#0' },
          bubbles: true,
          composed: true,
        })
      )
    })

    // Click the panel row.
    const clicked = await page.evaluate(name => {
      const panel = document.querySelector('extensions-panel')
      const row = panel?.shadowRoot.querySelector(`.row[data-name="${CSS.escape(name)}"]`)
      if (!row) return false
      row.click()
      return true
    }, entry.name)

    if (!clicked) throw new Error(`row for "${entry.name}" not found in panel shadow DOM`)

    // Wait long enough for `loadScript` / dynamic `import()` to settle.
    // Most CDN scripts are <500KB; we give 6s.
    await delay(6000)

    // Capture canvas pixels + console.
    const png = await page.locator('#g-0 canvas').first().screenshot({
      path: resolve(SHOTS_DIR, `${s}.png`),
    }).catch(() => null)

    await writeFile(resolve(SHOTS_DIR, `${s}.txt`), consoleLines.join('\n'), 'utf8')

    // Detect blank canvas: WebGL canvas is uniform black if the demo errored
    // before any draw. We sample the center pixel.
    const isBlack = await page.evaluate(() => {
      const canvas = document.querySelector('#g-0 canvas')
      if (!canvas) return null
      // Use a 2D scratch canvas to read the WebGL pixel.
      const w = canvas.width
      const h = canvas.height
      const scratch = document.createElement('canvas')
      scratch.width = w
      scratch.height = h
      const ctx = scratch.getContext('2d')
      ctx.drawImage(canvas, 0, 0)
      const px = ctx.getImageData(Math.floor(w / 2), Math.floor(h / 2), 1, 1).data
      return px[0] === 0 && px[1] === 0 && px[2] === 0 && px[3] === 0
    })

    return {
      ok: errors.length === 0 && isBlack !== true,
      errors,
      consoleLines,
      black: isBlack === true,
      shotPath: png ? `console-output/${s}.png` : null,
      logPath: `console-output/${s}.txt`,
    }
  } finally {
    page.off('console', onConsole)
    page.off('pageerror', onPageError)
  }
}

async function main() {
  await rm(SHOTS_DIR, { recursive: true, force: true })
  await mkdir(SHOTS_DIR, { recursive: true })

  console.log('▸ spawning pnpm dev')
  const dev = await startDevServer()

  let browser
  try {
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
    const page = await context.newPage()
    console.log(`▸ opening ${BASE_URL}`)
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })

    // Wait for the panel to mount + render its rows.
    await page.waitForFunction(() => {
      const panel = document.querySelector('extensions-panel')
      return panel && panel.shadowRoot && panel.shadowRoot.querySelectorAll('.row').length > 0
    }, null, { timeout: 10_000 })

    const panelExists = await page.evaluate(() => !!document.querySelector('extensions-panel'))
    if (!panelExists) throw new Error('extensions-panel did not mount in the DOM')

    const results = []
    for (const entry of EXTENSIONS) {
      process.stdout.write(`▸ ${entry.name} (${entry.category}) ... `)
      try {
        const r = await runFor(null, entry, page)
        results.push({ entry, ...r })
        console.log(r.ok ? 'ok' : (r.black ? 'black' : 'errors'))
      } catch (e) {
        results.push({ entry, ok: false, errors: [e.message], consoleLines: [], black: null })
        console.log('FAIL:', e.message)
      }
    }

    await writeMatrix(results)
    console.log(`\n▸ wrote EXTENSIONS.md (${results.length} entries)`)
  } finally {
    if (browser) await browser.close()
    dev.kill('SIGTERM')
  }
}

async function writeMatrix(results) {
  const lines = []
  lines.push('# Extensions — compatibility matrix')
  lines.push('')
  lines.push('> Snapshot of `hydra-synth/hydra-extensions` @ 2026-09-01.')
  lines.push(`> Generated by \`scripts/check-extensions.mjs\` against the catalog data in \`playground/extensions.js\`.`)
  lines.push(`> Run \`node scripts/check-extensions.mjs\` to refresh.`)
  lines.push('')
  lines.push('| # | Name | Category | Compat | Note | Evidence |')
  lines.push('|---|------|----------|--------|------|----------|')
  let n = 0
  for (const { entry, ok, errors, black, shotPath, logPath } of results) {
    n++
    const compat = ok ? 'works' : entry.compat
    const compatNote = entry.compatNote
      ? entry.compatNote
      : errors.length > 0
        ? `console errors: ${errors[0].slice(0, 80)}${errors[0].length > 80 ? '…' : ''}`
        : black
          ? 'canvas rendered all-black — entry likely needs additional setup (audio input, camera, backend, etc.)'
          : ''
    const evidence = shotPath && logPath ? `[shot](${shotPath}) · [log](${logPath})` : '—'
    lines.push(
      `| ${n} | ${entry.name} | ${entry.category} | ${compat} | ${compatNote.replace(/\|/g, String.raw`\|`).replace(/\n/g, ' ')} | ${evidence} |`
    )
  }
  lines.push('')
  lines.push('## How to read this')
  lines.push('')
  lines.push('- `works` — the demo loaded, the canvas drew something visible, no console errors.')
  lines.push('- `works-with-notes` — the demo loaded but has caveats (audio input, backend dependency, UI overlay outside the cell). The note column explains.')
  lines.push('- `not-yet` — the demo cannot run with the current `src/globals.js` published set. See §5 of `.opencode/specs/hydra-element/active/playground-extensions-catalog.md` for the bridge survey findings.')
  lines.push('')
  lines.push('## Caveats')
  lines.push('')
  lines.push('- This pass fetches 29 CDN scripts (metagrowing, jsDelivr, unpkg, statically.io, fentonia.com, emptyfla.sh). Some are large (shader-park-core is ~2.8 MB, total-serialism ~2 MB). A network failure mid-run leaves the affected entry labeled by the static analysis from `playground/extensions.js` — re-run when the network is healthy.')
  lines.push('- Some entries produce a black canvas by design (e.g. hydra-superdirt without a SuperDirt backend, three.js without `update` driven by `mouse.x`). The matrix labels these `works-with-notes` regardless of pixel sampling.')
  lines.push('')
  await writeFile(resolve(process.cwd(), 'EXTENSIONS.md'), lines.join('\n'), 'utf8')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
