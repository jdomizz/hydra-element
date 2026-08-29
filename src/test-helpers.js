import { html, fixture } from '@open-wc/testing'

export const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

export async function createHydraElement(code = '') {
  const el = await fixture(html`<hydra-element>${code}</hydra-element>`)
  await new Promise(resolve => {
    if (el.synth) {
      resolve()
    } else {
      el.addEventListener('hydra-ready', () => resolve(), { once: true })
    }
  })
  return el
}
