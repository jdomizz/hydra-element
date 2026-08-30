/**
 * Dev playground wiring.
 *
 * Connects the dev playground UI (presets, attribute toggles, event log,
 * stats strip) to a `<hydra-element>` already registered on `window` via
 * `index.js`. Does NOT import anything from `src/` — only uses the global
 * custom element API.
 */

const PAGE_LOAD = performance.now()
const LOG_LIMIT = 50

const PRESETS = [
  {
    label: 'osc',
    code: 'osc(10, 0.2, 0.5).out()',
  },
  {
    label: 'noise',
    code: 'noise(3, 0.1).color(0.5, 0.5, 0.5).out()',
  },
  {
    label: 'cam + blend',
    code: 's0.initCam() s1.initScreen() src(s0).blend(src(s1)).out()',
    requires: { sources: 2 },
  },
  {
    label: 'custom GLSL',
    code: 'noixe(5, 0.5).out()',
  },
  {
    label: 'typo (error)',
    code: 'osC(10, 0.2, 0.5).out()',
    cls: 'is-typo',
  },
  {
    label: 'reset',
    code: 'for (let i = 0; i < s.length; i++) s[i].clear(); hush(); solid(0, 0, 0).out()',
  },
]

function ready() {
  return new Promise(resolve => {
    if (document.readyState === 'loading') {document.addEventListener('DOMContentLoaded', resolve, { once: true })}
    else {resolve()}
  })
}

function fmt(ms) {
  return ms.toFixed(0).padStart(6, ' ')
}

function truncateSynth(synth) {
  if (!synth) return '{}'
  const { time = 0, bpm = 0, stats = {} } = synth
  return `{ time: ${time.toFixed(2)}, bpm: ${bpm}, fps: ${(stats.fps || 0).toFixed(1)} }`
}

function appendLog(log, kind, name, detail, time = null) {
  while (log.childElementCount >= LOG_LIMIT) {
    log.firstElementChild?.remove()
  }
  const t = time ?? performance.now() - PAGE_LOAD
  const line = document.createElement('span')
  line.className = 'log__line'

  const ts = document.createElement('span')
  ts.className = 'log__time'
  ts.textContent = `[${fmt(t)}ms]`

  const ev = document.createElement('span')
  ev.className = `log__name log__name--${kind}`
  ev.textContent = name

  const body = document.createElement('span')
  body.className = 'log__detail'
  body.textContent = detail

  line.append(ts, ev, body)
  log.append(line)
}

function ensureReadyHint(log) {
  const empty = document.createElement('span')
  empty.className = 'log__empty'
  empty.textContent = 'waiting for hydra-ready …'
  log.append(empty)
  return empty
}

function startStatsLoop(el, timeEl, fpsEl) {
  const tick = () => {
    const {synth} = el
    if (synth) {
      timeEl.textContent = (synth.time || 0).toFixed(2)
      const fps = synth.stats?.fps
      fpsEl.textContent = fps === undefined ? '–' : fps.toFixed(1)
    } else {
      timeEl.textContent = '–'
      fpsEl.textContent = '–'
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

function installWarnCapture(log) {
  const original = console.warn.bind(console)
  console.warn = (...args) => {
    original(...args)
    const text = args
      .map(a => (typeof a === 'string' ? a : a?.message || String(a)))
      .join(' ')
    if (text.includes('[hydra-element]')) {
      appendLog(log, 'warn', '[eval warn]', text)
    }
  }
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}

function applyAttr(el, name, value) {
  if (value === null || value === undefined || value === '') {
    el.removeAttribute(name)
  } else {
    el.setAttribute(name, value)
  }
}

function makeEval(el, log) {
  let lastStart = 0
  const trigger = code => {
    lastStart = performance.now() - PAGE_LOAD
    el.code = code
  }
  el.addEventListener('hydra-eval', e => {
    const t = performance.now() - PAGE_LOAD
    const duration = Math.max(0, t - lastStart)
    if (e.detail?.success) {
      appendLog(log, 'success', 'hydra-eval', `success=true (in ${duration.toFixed(0)}ms)`, t)
    } else {
      const msg = e.detail?.error?.message || String(e.detail?.error || 'unknown')
      appendLog(log, 'error', 'hydra-eval', `success=false ${msg}`, t)
    }
  })
  return trigger
}

function wirePresets(el, trigger, log) {
  const container = document.querySelector('.presets')
  for (const preset of PRESETS) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.textContent = preset.label
    if (preset.cls) btn.classList.add(preset.cls)
    btn.addEventListener('click', () => {
      trigger(preset.code)
      appendLog(log, 'info', '[preset]', preset.label)
    })
    container?.append(btn)
  }
}

function wireToggles(el, log) {
  const audio = document.querySelector('#toggle-audio')
  const global = document.querySelector('#toggle-global')
  const loop = document.querySelector('#toggle-loop')
  const sources = document.querySelector('#toggle-sources')
  const outputs = document.querySelector('#toggle-outputs')
  const globalRow = global?.closest('.toggle')

  const total = document.querySelectorAll('hydra-element').length
  if (global && globalRow) {
    if (total > 1) {
      global.disabled = true
      globalRow.classList.add('is-disabled')
      globalRow.title = 'global is disabled: more than one <hydra-element> on the page'
    } else {
      globalRow.title = 'publishes hydra on window._hydra when on'
    }
  }

  const sync = () => {
    audio.checked = el.hasAttribute('audio')
    global.checked = el.hasAttribute('global')
    loop.checked = el.hasAttribute('loop')
    sources.value = el.getAttribute('sources') || '4'
    outputs.value = el.getAttribute('outputs') || '4'
  }
  sync()

  audio?.addEventListener('change', () => {
    applyAttr(el, 'audio', audio.checked ? 'true' : null)
    appendLog(log, 'info', '[attr]', `audio=${audio.checked}`)
  })
  global?.addEventListener('change', () => {
    applyAttr(el, 'global', global.checked ? 'true' : null)
    appendLog(log, 'info', '[attr]', `global=${global.checked}`)
  })
  loop?.addEventListener('change', () => {
    applyAttr(el, 'loop', loop.checked ? 'true' : null)
    appendLog(log, 'info', '[attr]', `loop=${loop.checked}`)
  })
  sources?.addEventListener('change', () => {
    const n = clamp(parseInt(sources.value, 10) || 4, 1, 16)
    applyAttr(el, 'sources', String(n))
    sources.value = String(n)
    appendLog(log, 'info', '[attr]', `sources=${n}`)
  })
  outputs?.addEventListener('change', () => {
    const n = clamp(parseInt(outputs.value, 10) || 4, 1, 16)
    applyAttr(el, 'outputs', String(n))
    outputs.value = String(n)
    appendLog(log, 'info', '[attr]', `outputs=${n}`)
  })
}

function wireEditor(el, trigger) {
  const ta = document.querySelector('textarea[name="editor"]')
  if (!ta) return
  const evalNow = () => {
    trigger(ta.value)
  }
  ta.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      evalNow()
    }
  })
  const evalBtn = document.querySelector('#eval-btn')
  evalBtn?.addEventListener('click', evalNow)
}

function wireDrawer() {
  const drawer = document.querySelector('.drawer')
  const toggle = document.querySelector('#drawer-toggle')
  if (!drawer || !toggle) return
  toggle.addEventListener('click', () => {
    const collapsed = drawer.classList.toggle('is-collapsed')
    toggle.textContent = collapsed ? 'expand' : 'collapse'
  })
}

function wireClear(log) {
  const btn = document.querySelector('#log-clear')
  btn?.addEventListener('click', () => {
    log.replaceChildren()
  })
}

async function main() {
  await ready()
  const el = document.querySelector('hydra-element')
  if (!el) {
    console.warn('[playground] no <hydra-element> found on the page')
    return
  }

  const log = document.querySelector('#log')
  ensureReadyHint(log)
  installWarnCapture(log)

  const trigger = makeEval(el, log)
  wirePresets(el, trigger, log)
  wireToggles(el, log)
  wireEditor(el, trigger)
  wireDrawer()
  wireClear(log)
  startStatsLoop(el, document.querySelector('#stat-time'), document.querySelector('#stat-fps'))

  el.addEventListener('hydra-ready', e => {
    const t = performance.now() - PAGE_LOAD
    appendLog(log, 'success', 'hydra-ready', truncateSynth(e.detail?.synth), t)
    el.synth.setFunction({
      name: 'noixe',
      type: 'src',
      inputs: [
        { type: 'float', name: 'scale', default: 5 },
        { type: 'float', name: 'offset', default: 0.5 },
      ],
      glsl: 'return vec4(vec3(_noise(vec3(_st*scale, offset*time))), 0.5);',
    })
  })

  el.addEventListener('hydra-element-resize', e => {
    const t = performance.now() - PAGE_LOAD
    const { width, height } = e.detail || {}
    appendLog(log, 'info', 'hydra-element-resize', `{ width: ${width}, height: ${height} }`, t)
  })

  el.addEventListener('hydra-context-lost', () => {
    const t = performance.now() - PAGE_LOAD
    appendLog(log, 'warn', 'hydra-context-lost', '(recovered)', t)
  })
}

main()
