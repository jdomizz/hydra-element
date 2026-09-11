/**
 * The DOM-only `<hydra-element>` shell.
 *
 * Owns the element lifecycle, the canvas, and the FOUC guard — and delegates
 * every hydra-touching behavior to the runtime held in the `#runtime` slot.
 * Carries zero hydra vocabulary in its own logic: the only attribute it
 * observes is `width`/`height` (the shell's sizing concern); all engine
 * attributes (`global`, `audio`, `sources`, `outputs`, `precision`, `loop`)
 * are observed by the runtime adapter.
 */

import { EVENTS } from './events'
import { CanvasManager } from './canvas'
import { getDefaultRuntimeFactory, type CanvasRuntime } from './runtime'
import { parseNumber } from '../parse'
import type { HydraReadyDetail, HydraTransformFunction } from '../types'

// ---------------------------------------------------------------------------
// FOUC guard — hides `<hydra-element>` before it is defined, so raw
// textContent code never flashes on screen while the custom element
// upgrade + canvas init is in progress. Runs once at module load time;
// the export is exposed for unit testing.
// ---------------------------------------------------------------------------
const FOUC_ATTR = 'data-hydra-fouc'
const FOUC_CSS = 'body hydra-element:not(:defined){display:none}'

/**
 * Inject a global `<style>` that hides undefined `<hydra-element>` tags.
 * Idempotent — safe to call multiple times; only the first call has an effect.
 */
export function injectFoucGuard(doc: Document = document): void {
  const head = doc.head || doc.documentElement
  if (!head || head.querySelector(`style[${FOUC_ATTR}]`)) return
  const style = doc.createElement('style')
  style.setAttribute(FOUC_ATTR, '')
  style.textContent = FOUC_CSS
  head.append(style)
}

// Run once at module load — before the caller calls define().
injectFoucGuard()

/**
 * The runtime surface the shell delegates to when mounted. Structural — the
 * hydra adapter (`runtime/runtime.ts`) satisfies it; the shell never imports
 * the adapter so the shell stays vocabulary-free and independently testable.
 */
interface RuntimeSurface extends CanvasRuntime {
  synth: unknown
  scope: Record<string, unknown>
  code: string
  transforms: HydraTransformFunction[]
  loadScript(url: string): Promise<void>
}

/**
 * A custom element that renders Hydra sketches.
 *
 * Thin shell that wires together the CanvasManager and a mounted runtime.
 * @extends HTMLElement
 */
export class HydraElement extends HTMLElement {
  static observedAttributes = ['width', 'height']

  #width = 0
  #height = 0
  #initialized = false
  #seedCode = ''
  #readyPromise: Promise<HydraReadyDetail>
  #resolveReady!: (detail: HydraReadyDetail) => void
  #canvasManager: CanvasManager
  #runtime: RuntimeSurface | null = null

  constructor() {
    super()
    const shadowRoot = this.attachShadow({ mode: 'open' })
    this.#canvasManager = new CanvasManager(shadowRoot)
    this.#readyPromise = new Promise(resolve => {
      this.#resolveReady = resolve
    })
  }

  /**
   * Resolves with `{ synth }` once Hydra has been initialized.
   * Always resolvable, even when accessed after the element is connected.
   * Returns the live synth when the runtime is mounted.
   */
  get ready(): Promise<HydraReadyDetail> {
    return this.#runtime ? Promise.resolve({ synth: this.#runtime.synth }) : this.#readyPromise
  }

  /** The canvas element associated with this element. */
  get canvas(): HTMLCanvasElement | null {
    return this.#canvasManager.canvas
  }

  /** Replaces the current canvas with an externally supplied one, adopting it
   *  into the shadow root and re-rendering the current scene on it. */
  set canvas(value: HTMLCanvasElement) {
    this.#canvasManager.preserveCustomCanvas(value)
    this.#runtime?.handleCanvasSwap?.()
  }

  /** The hydra-synth instance backing the element (read-only). Provides
   *  access to DSL functions, sources, outputs for advanced use cases. */
  get synth(): unknown {
    return this.#runtime?.synth
  }

  /**
   * The persistent eval scope for this element. User code's bare assignments
   * and `var` declarations land here.
   * @internal
   */
  get scope(): Record<string, unknown> | undefined {
    return this.#runtime?.scope
  }

  /** Custom GLSL transforms. Assigning an array applies each function via
   *  `synth.setFunction` and re-applies them after every synth reset. */
  get transforms(): HydraTransformFunction[] {
    return this.#runtime?.transforms ?? []
  }

  set transforms(value: HydraTransformFunction[]) {
    if (this.#runtime) {
      this.#runtime.transforms = value
    }
  }

  /** Get or set the scene code. Setting triggers evaluation through the
   *  scoped `with` proxy. Writes before the runtime mounts land in
   *  `#seedCode` and are evaluated on mount. */
  get code(): string {
    return this.#runtime ? this.#runtime.code : this.#seedCode
  }

  set code(value: string) {
    if (this.#runtime) {
      this.#runtime.code = value
    } else {
      this.#seedCode = value
    }
  }

  /**
   * Loads an extension script scoped to this element. While the script loads,
   * the element's Hydra surface is transiently published on `window` (the
   * globals bridge); the prior `window` state is restored on settle.
   */
  loadScript(url: string): Promise<void> {
    if (!this.#runtime) {
      return Promise.reject(new Error('[hydra-element] loadScript before the runtime is mounted'))
    }
    return this.#runtime.loadScript(url)
  }

  /**
   * Tears down the synth, canvas, and listeners without removing the element
   * from the DOM. The element can be reconnected afterwards; `hydra-ready`
   * will fire again.
   */
  destroy(): void {
    this.#runtime?.destroy()
    this.#runtime = null
    this.#canvasManager.disconnect()
    this.#canvasManager.removeAnalyzerCanvases()
    this.#initialized = false
    this.#readyPromise = new Promise(resolve => {
      this.#resolveReady = resolve
    })
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return
    if (name === 'width' || name === 'height') {
      this.#handleSizeChange(name, newValue)
    }
  }

  connectedCallback(): void {
    if (!this.#initialized) {
      this.#initialized = true
      if (!this.#canvasManager.canvas) {
        this.#canvasManager.init(this.#width, this.#height)
      }
      this.#mountRuntime()
    } else if (this.#runtime) {
      // Move-in-DOM: preserve the runtime instance; re-attach restores the
      // listeners, the attr observer, and the loop without recreating the
      // engine.
      this.#runtime.attach(this)
    }
  }

  disconnectedCallback(): void {
    this.#canvasManager.disconnect()
    this.#runtime?.detach()
  }

  /**
   * Resolves the pending ready promise. The runtime calls this at the end of
   * `attach` and after every engine (re)init.
   * @internal
   */
  notifyReady(detail: HydraReadyDetail): void {
    this.#resolveReady(detail)
  }

  /**
   * The seed code for the runtime: a pre-set `code` wins; otherwise the
   * element's `textContent` is read once and cleared (the historical
   * textContent-seed semantics). The runtime consumes it at `attach`.
   * @internal
   */
  get seedCode(): string {
    if (this.#seedCode !== '') return this.#seedCode
    const text = this.textContent
    if (text && text.trim() !== '') {
      this.#seedCode = text
      this.textContent = ''
    }
    return this.#seedCode
  }

  /**
   * Test seam — the mounted runtime. Not part of the public API; do not call
   * from production code.
   * @internal
   */
  get runtime(): RuntimeSurface | null {
    return this.#runtime
  }

  /**
   * Test seam — the embedded CanvasManager. Not part of the public API; do
   * not call from production code.
   * @internal
   */
  get canvasManager(): CanvasManager {
    return this.#canvasManager
  }

  /**
   * Mounts the runtime. The default factory is registered by the main entry
   * before `define()`, so the synchronous path wins in production; the
   * microtask retry only covers standalone shell usage where the module that
   * registers the factory loads after connect.
   */
  #mountRuntime(): void {
    const factory = getDefaultRuntimeFactory()
    if (factory) {
      this.#runtime = factory() as RuntimeSurface
      this.#runtime.attach(this)
      return
    }
    queueMicrotask(() => {
      if (this.#runtime || !this.#initialized) return
      const late = getDefaultRuntimeFactory()
      if (late) {
        this.#runtime = late() as RuntimeSurface
        this.#runtime.attach(this)
      }
    })
  }

  #handleSizeChange(name: 'width' | 'height', newValue: string | null): void {
    if (newValue === null) {
      // Attribute removed — hand control back to CSS/ResizeObserver.
      this.#width = 0
      this.#height = 0
      this.#canvasManager.refreshFromCss()
      return
    }
    if (name === 'width') {
      this.#width = parseNumber(newValue, this.#width, 0)
    } else {
      this.#height = parseNumber(newValue, this.#height, 0)
    }
    this.#canvasManager.resize(this.#width, this.#height)
    // The attribute path dispatches so the runtime's resolution listener
    // follows; the ResizeObserver path dispatches from the manager.
    this.dispatchEvent(
      new CustomEvent(EVENTS.resize, { detail: { width: this.#width, height: this.#height } })
    )
  }
}
