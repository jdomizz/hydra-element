import { HydraCompiler, HydraElement } from '../../index'
import { customTransforms } from './transforms'

window.customElements.define('my-hydra-sketch', HydraElement)

const app = document.querySelector('#app')!


app.addEventListener('my-hydra-sketch:1', (event) => {
  const { hydra } = (event as CustomEvent).detail
  const [o0] = hydra.outputs
  const { noise2 } = new HydraCompiler(customTransforms).sources

  noise2().modulate(o0, 0.0003).pixelate().out(o0)
})

app.addEventListener('my-hydra-sketch:2', async (event) => {
  const { hydra } = (event as CustomEvent).detail
  const [o0] = hydra.outputs
  const { osc } = new HydraCompiler().sources

  osc().modulate(o0, 4).out(o0)
})

app.innerHTML = `
  <my-hydra-sketch id="1" width="200" height="200"></my-hydra-sketch>
  <my-hydra-sketch id="2" width="200" height="200"></my-hydra-sketch>
`
