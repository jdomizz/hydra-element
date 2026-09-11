/**
 * The hydra runtime adapter — implements the CanvasRuntime seam and wires the
 * headless core to a DOM host. Owns the engine lifecycle, the observed
 * hydra attributes, the resize/context-loss wiring, the eval event dispatch,
 * and the transient globals bridge. The shell delegates `code`/`synth`/
 * `scope`/`transforms`/`loadScript` here.
 */

import { createHydraCore, userCodeLine, type HydraCore, type SynthLike } from '../core'
import type { HydraElement } from '../element/element'
import { EVENTS } from '../element/events'
import type { CanvasRuntime } from '../element/runtime'
import type { HydraResizeDetail, HydraTransformFunction } from '../types'
import {
  DEFAULT_RUNTIME_OPTIONS,
  HYDRA_ATTRS,
  isHydraRuntimeAttr,
  parseHydraAttr,
  parseHydraAttrs,
  parseResetAttr,
  type HydraRuntimeOptions,
} from './attributes'
import { publishHydraGlobals } from './globals'

export class HydraRuntime implements CanvasRuntime {
  #host: HydraElement | null = null
  #core: HydraCore | null = null
  #options: HydraRuntimeOptions = { ...DEFAULT_RUNTIME_OPTIONS }
  /** The persistent user scope — survives engine (re)initialization. */
  #scope: Record<string, unknown> = Object.create(null) as Record<string, unknown>
  #code = ''
  #transforms: HydraTransformFunction[] = []
  #attrObserver: MutationObserver | null = null
  #pendingResetAttrs: Record<string, string | null> | null = null
  #destroyed = false
  #restoreTimer: ReturnType<typeof setTimeout> | null = null

  #onResize = (event: Event): void => {
    const { detail } = event as CustomEvent<HydraResizeDetail>
    this.#core?.setResolution(detail.width, detail.height)
  }

  #onContextLost = (): void => {
    this.#core?.stop()
    this.#armContextRestore()
  }

  #onContextRestored = (): void => {
    this.#restoreTimer = setTimeout(() => {
      this.#restoreTimer = null
      if (this.#destroyed || !this.#host?.isConnected || !this.#core) return
      this.#initCore()
      if (this.#code !== '') this.#eval(this.#code)
    }, 0)
  }

  // -- CanvasRuntime seam ----------------------------------------------------

  attach(host: HydraElement): void {
    this.#destroyed = false
    this.#host = host
    const hadCore = this.#core !== null
    if (this.#code === '') this.#code = host.seedCode
    this.#options = parseHydraAttrs(host)
    if (!hadCore) this.#initCore()
    this.#wireListeners()
    this.#observeAttributes()
    host.notifyReady({ synth: this.synth })
    if (this.#options.autoLoop) this.#core?.start()
    if (!hadCore && this.#code !== '') this.#eval(this.#code)
  }

  detach(): void {
    this.#core?.stop()
    this.#attrObserver?.disconnect()
    this.#attrObserver = null
    this.#unwireListeners()
  }

  destroy(): void {
    this.#destroyed = true
    if (this.#restoreTimer !== null) {
      clearTimeout(this.#restoreTimer)
      this.#restoreTimer = null
    }
    this.#attrObserver?.disconnect()
    this.#attrObserver = null
    this.#unwireListeners()
    this.#core?.destroy()
    this.#core = null
    this.#host = null
    this.#pendingResetAttrs = null
  }

  handleCanvasSwap(): void {
    this.#initCore()
    if (this.#code !== '') this.#eval(this.#code)
  }

  // -- public surface (shell delegates + test seams) ------------------------

  /** The hydra-synth instance, or `undefined` before init / after destroy. */
  get synth(): SynthLike | undefined {
    return this.#core?.synth
  }

  /** The persistent eval scope — bare assignments and `var` declarations land here. */
  get scope(): Record<string, unknown> {
    return this.#scope
  }

  /** The current scene code. Setting it evaluates through the core. */
  get code(): string {
    return this.#code
  }

  set code(value: string) {
    this.#code = value
    this.#eval(value)
  }

  /** Custom GLSL transforms — applied immediately and re-applied on every reset. */
  get transforms(): HydraTransformFunction[] {
    return this.#transforms
  }

  set transforms(value: HydraTransformFunction[]) {
    this.#transforms = Array.isArray(value) ? value : []
    const synth = this.#core?.synth
    if (synth) {
      for (const fn of this.#transforms) this.#applyTransform(synth, fn)
    }
  }

  /** Loads an extension script through the transient globals bridge. */
  async loadScript(url: string): Promise<void> {
    const hydra = this.#core?.hydra
    if (!hydra) {
      throw new Error('[hydra-element] loadScript before the engine is initialized')
    }
    const restore = publishHydraGlobals(hydra)
    try {
      await this.#core?.loadScript(url)
    } finally {
      restore()
    }
  }

  /** @internal Test seam — the headless core. */
  get core(): HydraCore | null {
    return this.#core
  }

  // -- internals -------------------------------------------------------------

  /**
   * Destroys any existing core and builds a fresh one from the current
   * options on the host's canvas. Re-binds `loadScript` in scope, re-applies
   * transforms, publishes globals in global mode, tags analyzer canvases,
   * dispatches `hydra-ready`, and starts the loop when autoLoop.
   */
  #initCore(): void {
    this.#core?.destroy()
    const host = this.#host
    const canvas = host?.canvas
    if (!host || !canvas) return
    this.#core = createHydraCore({
      canvas,
      scheduler: 'raf',
      makeGlobal: this.#options.makeGlobal,
      detectAudio: this.#options.detectAudio,
      numSources: this.#options.numSources,
      numOutputs: this.#options.numOutputs,
      precision: this.#options.precision,
      scope: this.#scope,
    })
    this.#core.addToEvalScope('loadScript', (url: string) => this.loadScript(url))
    const { synth } = this.#core
    if (synth) {
      for (const fn of this.#transforms) this.#applyTransform(synth, fn)
    }
    if (this.#options.makeGlobal && this.#core.hydra) {
      publishHydraGlobals(this.#core.hydra)
    }
    host.canvasManager.tagAnalyzerCanvases()
    this.#dispatch('hydra-ready', { synth: this.#core.synth })
    host.notifyReady({ synth: this.#core.synth })
    if (this.#options.autoLoop && host.isConnected) {
      this.#core.start()
    }
  }

  #applyTransform(synth: SynthLike, fn: HydraTransformFunction): void {
    ;(synth as { setFunction?: (fn: HydraTransformFunction) => void }).setFunction?.(fn)
  }

  /** Evaluates code through the core, dispatching `hydra-eval` with the outcome. */
  #eval(code: string): void {
    const core = this.#core
    if (!core) return
    core
      .evalAsync(code)
      .then(() => this.#dispatch('hydra-eval', { success: true }))
      .catch((error: unknown) => {
        console.warn('[hydra-element] eval error:', error)
        this.#dispatch('hydra-eval', {
          success: false,
          error,
          line: userCodeLine(error, code),
        })
      })
  }

  /** Coalesces pending reset attributes, recreates the engine, re-evals. */
  #flushSynthReset(): void {
    const pending = this.#pendingResetAttrs
    this.#pendingResetAttrs = null
    if (!pending || this.#destroyed) return
    for (const [name, value] of Object.entries(pending)) {
      this.#options = parseResetAttr(name, value, this.#options)
    }
    this.#initCore()
    if (this.#code !== '') this.#eval(this.#code)
  }

  /** Observes the observed hydra attributes; `loop` toggles the loop live. */
  #observeAttributes(): void {
    this.#attrObserver?.disconnect()
    const host = this.#host
    if (!host) return
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type !== 'attributes') continue
        const name = mutation.attributeName
        if (!name || !isHydraRuntimeAttr(name)) continue
        const value = host.getAttribute(name)
        if (name === 'loop') {
          this.#options = parseHydraAttr(name, value, this.#options)
          if (this.#options.autoLoop) this.#core?.start()
          else this.#core?.stop()
        } else {
          this.#pendingResetAttrs = this.#pendingResetAttrs ?? {}
          this.#pendingResetAttrs[name] = value
          queueMicrotask(() => this.#flushSynthReset())
        }
      }
    })
    observer.observe(host, { attributes: true, attributeFilter: HYDRA_ATTRS })
    this.#attrObserver = observer
  }

  #wireListeners(): void {
    this.#host?.addEventListener(EVENTS.resize, this.#onResize)
    this.#host?.addEventListener(EVENTS.contextLost, this.#onContextLost)
  }

  #unwireListeners(): void {
    this.#host?.removeEventListener(EVENTS.resize, this.#onResize)
    this.#host?.removeEventListener(EVENTS.contextLost, this.#onContextLost)
  }

  /**
   * Arms a one-shot `webglcontextrestored` listener on the canvas (re-attached
   * on each loss). The loss handler in the shell survives repeated losses; the
   * restore listener is legitimately once-per-loss — a context restores once.
   */
  #armContextRestore(): void {
    this.#host?.canvas?.addEventListener('webglcontextrestored', this.#onContextRestored, {
      once: true,
    })
  }

  #dispatch(name: string, detail: Record<string, unknown>): void {
    this.#host?.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }))
  }
}
