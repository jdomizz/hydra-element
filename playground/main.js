/**
 * Playground bootstrap. Imports every component (each `define`s itself
 * on import), resolves the single `<hydra-element>` reference once,
 * wires it to each controller via the `target` property, and decodes
 * `?code=` URL hydration into the editor.
 *
 * The components never reach into the DOM for their target — that's
 * this file's job, done once. Each component owns its concern; main.js
 * owns the wiring.
 */
import './components/stats-strip.js'
import './components/log-panel.js'
import './components/editor-panel.js'
import './components/cfg-form.js'
import './components/preset-selector.js'

import { PRESETS } from './presets.js'

const STORAGE_KEY = 'hydra-element:editor'

function decodeUrlCode() {
  try {
    const raw = new URLSearchParams(location.search).get('code')
    if (!raw) return null
    const bytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0))
    return decodeURIComponent(new TextDecoder().decode(bytes))
  } catch {
    return null
  }
}

function ready() {
  return new Promise(resolve => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', resolve, { once: true })
    } else {
      resolve()
    }
  })
}

function wire(el) {
  const editor = document.querySelector('editor-panel')
  const cfg = document.querySelector('cfg-form')
  const log = document.querySelector('log-panel')
  const selector = document.querySelector('preset-selector')
  const stats = document.querySelector('stats-strip')

  if (editor) editor.target = el
  if (cfg) cfg.target = el
  if (log) {
    log.target = el
    if (stats) {
      stats.target = el
      log.append(stats)
    }
  }
  if (selector) selector.target = el

  return { editor }
}

async function main() {
  await ready()

  const el = document.querySelector('hydra-element')
  if (!el) {
    console.warn('[playground] no <hydra-element> found on the page')
    return
  }

  const selector = document.querySelector('preset-selector')
  if (selector) selector.presets = PRESETS

  const { editor } = wire(el)

  // URL `?code=<base64>` wins over localStorage on hydration; we
  // persist the URL payload so subsequent reloads get the same code
  // via the editor's own restore path.
  const urlCode = decodeUrlCode()
  if (urlCode) {
    try {
      localStorage.setItem(STORAGE_KEY, urlCode)
    } catch {}
    if (editor) editor.value = urlCode
  }
}

main()
