/**
 * Gallery bootstrap. Imports the multi-instance log component, resolves the
 * four `<hydra-element>` instances and the shared log, wires them, and runs
 * four distinct scenes — one per instance — so a single page demonstrates
 * non-global isolation (no editor, no toggles, no cfg-form):
 * four independent engines, four independent times, four independent outputs.
 *
 * Each scene is a Hydra DSL fragment evaluated with `hydraEval`. Bare
 * identifiers (`osc`, `noise`, `time`, …) resolve to the active instance's
 * own synth via the eval Proxy — that's why all four scenes can use the
 * same names without colliding: each call binds to its own element's synth.
 */
import './components/gallery-log.js'

const SCENES = {
  'g-osc': `
    osc(() => 30 + 20 * Math.sin(time * 0.5), 0.1, 1.2)
      .color(0.9, 0.4, 0.8)
      .rotate(() => time * 0.1)
      .modulate(noise(3, 0.5), 0.4)
      .out()
  `,
  'g-noise': `
    noise(4, 0.2)
      .color(0.3, 0.7, 1.0)
      .luma(0.6)
      .modulateScale(osc(8, 0, 1), 0.3)
      .out()
  `,
  'g-gradient': `
    gradient(0.3)
      .shift(0.1, 0.2, () => time * 0.05)
      .hue(() => time * 0.02)
      .saturation(1.2)
      .out()
  `,
  'g-shape': `
    shape(4, 0.3, 0.7)
      .rotate(() => time * 0.15, 0.1)
      .scale(0.6, 0.6)
      .repeatX(3)
      .repeatY(3)
      .modulate(noise(2, 0.3), 0.2)
      .out()
  `,
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

async function main() {
  await ready()

  const els = [...document.querySelectorAll('hydra-element')]
  const log = document.querySelector('gallery-log')

  if (!els.length) {
    console.warn('[gallery] no <hydra-element> instances found')
    return
  }

  if (log) {
    log.targets = els
  }

  await Promise.all(
    els.map(async el => {
      const code = SCENES[el.id]
      if (!code) return
      try {
        await el.ready
        await el.hydraEval(code)
      } catch (err) {
        console.warn(`[gallery] ${el.id} eval failed:`, err)
      }
    })
  )
}

main()
