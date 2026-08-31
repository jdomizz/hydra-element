/**
 * Playground bootstrap. Imports every component (each `define`s itself
 * on import), resolves the four `<hydra-element>` instances + their
 * `<figure class="cell">` wrappers, wires click-to-select on each cell
 * (the active cell gets `.is-active` and dispatches `target-change`),
 * hydrates `?code0..3=` URL state into the right slots, and dispatches
 * the initial `target-change` so the editor / cfg-form / stats focus
 * slot 0 by default.
 *
 * The components never reach into the DOM for their target — that's
 * this file's job, done once. Each component owns its concern; main.js
 * owns the wiring.
 *
 * Pure helpers (`encodeForUrl`, `decodeUrlCodes`) are exported so they
 * can be unit-tested directly without booting the whole page.
 */
import { HydraElement } from '../src/element.js'

import './components/stats-strip.js'
import './components/multi-log.js'
import './components/editor-panel.js'
import './components/cfg-form.js'
import './components/preset-selector.js'

import { PRESETS } from './presets.js'

// Register the custom element for the playground. The npm entry
// (`index.js` at the repo root) does the same — the playground registers
// here because Vite's `root: 'playground'` (in dev mode) cannot resolve
// paths outside the playground tree, so the npm entry is unreachable
// from `playground/index.html`.
window.customElements.define('hydra-element', HydraElement)

export const STORAGE_KEY_PREFIX = 'hydra-element:editor'
export const NUM_SLOTS = 4

export function encodeForUrl(value) {
  return btoa(unescape(encodeURIComponent(value)))
}

export function decodeB64Url(s) {
  try {
    const bytes = Uint8Array.from(atob(s), c => c.charCodeAt(0))
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

export function decodeUrlCodes(search = location.search) {
  const params = new URLSearchParams(search)
  const codes = Array.from({ length: NUM_SLOTS }, () => null)

  for (let i = 0; i < NUM_SLOTS; i++) {
    const raw = params.get(`code${i}`)
    if (raw) codes[i] = decodeB64Url(raw)
  }

  // Backward-compat: a bare `?code=<base64>` (no slot suffix) is
  // mirrored to all 4 slots — the same sketch on every cell. Only
  // applies when no per-slot payload is present, so per-slot URLs
  // win over the legacy form.
  const legacy = params.get('code')
  if (legacy && codes.every(c => c === null)) {
    const decoded = decodeB64Url(legacy)
    if (decoded !== null) {
      for (let i = 0; i < NUM_SLOTS; i++) codes[i] = decoded
    }
  }

  return codes
}

function wire(els, cells) {
  const editor = document.querySelector('editor-panel')
  const cfg = document.querySelector('cfg-form')
  const selector = document.querySelector('preset-selector')
  const stats = document.querySelector('stats-strip')

  const setActive = index => {
    cells.forEach((cell, i) => {
      cell.classList.toggle('is-active', i === index)
      cell.setAttribute('aria-current', i === index ? 'true' : 'false')
    })
    document.dispatchEvent(
      new CustomEvent('target-change', {
        detail: { index, element: els[index], label: `#${index}` },
        bubbles: true,
        composed: true,
      })
    )
  }

  cells.forEach((cell, i) => {
    cell.addEventListener('click', () => setActive(i))
    cell.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setActive(i)
      }
    })
  })

  // Initial bind: slot 0 owns the editor / cfg / stats. The log listens
  // to all 4 cells via its [data-log-cells] ancestor (auto-discover).
  const [first] = els
  if (editor) {
    editor.target = first
    // First visit (or cleared localStorage): seed the editor with the
    // element's initial code (set via `textContent` in the HTML). The
    // editor-panel's own `hydrate()` ran before `target` was bound, so
    // it saw no target and fell back to an empty textarea. We re-prime
    // it now that the target is in place.
    let saved = null
    try {
      saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}:0`)
    } catch {}
    if (saved === null && first.code) {
      editor.value = first.code
    }
  }
  if (cfg) cfg.target = first
  if (stats) stats.target = first
  if (selector) {
    selector.target = first
    selector.presets = PRESETS
  }

  return { editor, setActive }
}

async function main() {
  await ready()

  const els = [...document.querySelectorAll('hydra-element')]
  if (els.length === 0) {
    console.debug('[playground] no <hydra-element> found on the page')
    return
  }

  const cells = [...document.querySelectorAll('.app__center .cell')]
  if (cells.length !== els.length) {
    console.warn(
      `[playground] cell/element count mismatch: ${cells.length} cells vs ${els.length} elements`
    )
  }

  const { editor, setActive } = wire(els, cells)

  // Wait for every element to be ready before evaluating; otherwise
  // `hydraEval` races the first `hydra-ready` and logs eval errors.
  await Promise.all(els.map(el => el.ready?.catch(() => {})))

  // 1. URL hydration wins over localStorage.
  const urlCodes = decodeUrlCodes()

  // 2. localStorage seeds the slot if no URL payload exists for it.
  for (let i = 0; i < els.length; i++) {
    let code = urlCodes[i]
    if (code === null) {
      try {
        code = localStorage.getItem(`${STORAGE_KEY_PREFIX}:${i}`)
      } catch {}
    }
    if (code && code !== els[i].code) {
      els[i].code = code
    }
  }

  // 3. Persist the URL payload so subsequent reloads get the same code
  // via the editor's own restore path (per slot).
  for (let i = 0; i < els.length; i++) {
    if (urlCodes[i] !== null) {
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}:${i}`, urlCodes[i])
      } catch {}
      if (editor && i === 0) editor.value = urlCodes[i]
    }
  }

  // 4. Mark slot 0 as the active cell and fire `target-change` so every
  // document-level listener (editor, cfg-form, stats, preset-selector)
  // lands on slot 0.
  setActive(0)
}

main()
