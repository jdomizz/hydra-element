/**
 * Playground bootstrap. Imports every component (each `define`s itself
 * on import), wires the PRESETS list into <preset-selector>, registers
 * the `noixe` extension via the hydra-element `ready` promise, and
 * hydrates the editor from `?code=` when the URL carries a sketch.
 *
 * This file is intentionally tiny — every component owns its own
 * concern. Do not put DOM logic here; push it into the element.
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
    const decoded = Buffer.from(raw, 'base64').toString('utf-8')
    return decodeURIComponent(decoded)
  } catch {
    return null
  }
}

function ready() {
  return new Promise((resolve) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', resolve, { once: true })
    } else {
      resolve()
    }
  })
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

  // URL `?code=<base64>` wins over localStorage on hydration; we
  // persist the URL payload so subsequent reloads get the same code
  // via the editor's own restore path.
  const urlCode = decodeUrlCode()
  if (urlCode) {
    try {
      localStorage.setItem(STORAGE_KEY, urlCode)
    } catch {}
    const editor = document.querySelector('editor-panel')
    if (editor) editor.value = urlCode
  }

  // Register the `noixe` source via the hydra-element ready promise.
  // The listener inside <log-panel> handles the timing race by
  // subscribing to `hydra-ready` AND awaiting `el.ready`.
  el.ready.then(({ synth }) => {
    synth.setFunction({
      name: 'noixe',
      type: 'src',
      inputs: [
        { type: 'float', name: 'scale', default: 5 },
        { type: 'float', name: 'offset', default: 0.5 },
      ],
      glsl: 'return vec4(vec3(_noise(vec3(_st*scale, offset*time))), 0.5);',
    })
  })
}

main()
