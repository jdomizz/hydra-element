import { Output, Source } from 'hydra-ts'
import '../../definition'
import { customTransforms } from './transforms'
import { HydraCompiler } from '../../index'

function evalSrc(src = '') {
  try {
    new Function(src)()
  } catch (error) {
    console.log(error)
  }
}

declare global {
  interface Window {
    __SYNTH__: Synth;
  }
}

export interface Synth {
  inputs: Source[]
  outputs: Output[]
  sources: Record<string, (...args: unknown[]) => any>
  render: (output?: Output) => void
  stream: MediaStream
}

const app = document.querySelector('#app')
if (app) {
  app.addEventListener('hydra-element', (event) => {
    const { hydra, stream } = (event as CustomEvent).detail
    const compiler = new HydraCompiler(customTransforms)

    window.__SYNTH__ = {
      render: hydra.render,
      inputs: hydra.sources,
      outputs: hydra.outputs,
      sources: compiler.sources,
      stream
    } as Synth

    console.log(window.__SYNTH__)

    evalSrc(`
      __SYNTH__.sources.wave().out(__SYNTH__.outputs[0]);
      __SYNTH__.render(__SYNTH__.outputs[0]);
    `)
  })
  app.innerHTML = `<hydra-element></hydra-element>`
}