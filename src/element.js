import { CanvasManager } from './canvas'
import { HydraManager } from './hydra'
import { LoopController } from './loop'
import { AttributeHandler } from './attributes'
import { DEFAULT_OPTIONS } from './defaults'
import { publishHydraGlobals } from './globals'

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
 * @param {Document} [doc=document]
 */
export function injectFoucGuard(doc = document) {
  const head = doc.head || doc.documentElement
  if (!head || head.querySelector(`style[${FOUC_ATTR}]`)) return
  const s = doc.createElement('style')
  s.setAttribute(FOUC_ATTR, '')
  s.textContent = FOUC_CSS
  head.append(s)
}

// Run once at module load — before the caller calls define().
injectFoucGuard()

/**
 * A custom element that renders Hydra sketches.
 *
 * Thin facade that wires together the CanvasManager, HydraManager,
 * LoopController, and AttributeHandler.
 * @extends HTMLElement
 */
export class HydraElement extends HTMLElement {
  #code
  #connected
  #scope
  #readyPromise
  #resolveReady
  #onResize
  #onContextLost
  #pendingResetAttrs
  #initialized

  #canvasManager
  #attributeHandler
  #hydraManager
  #loopController
  #extendTransforms

  static get observedAttributes() {
    return ['width', 'height', 'global', 'audio', 'sources', 'outputs', 'precision', 'loop']
  }

  constructor() {
    super()
    this.#code = ''
    this.#connected = false
    this.#scope = Object.create(null)
    this.attachShadow({ mode: 'open' })
    this.#canvasManager = new CanvasManager(this.shadowRoot)
    this.#attributeHandler = new AttributeHandler({
      ...DEFAULT_OPTIONS,
      width: 0,
      height: 0,
    })
    this.#hydraManager = null
    this.#loopController = null
    this.#extendTransforms = []
    this.#readyPromise = new Promise(resolve => {
      this.#resolveReady = resolve
    })
    this.#onResize = e => this.#hydraManager?.setResolution(e.detail.width, e.detail.height)
    this.#onContextLost = () => {
      if (this.#connected && this.#hydraManager) {
        this.#initHydra()
      }
    }
    this.#pendingResetAttrs = null
  }

  /**
   * Resolves with `{ synth }` once Hydra has been initialized.
   * Always resolvable, even when accessed after the element is connected.
   * Returns the live synth when the manager is active.
   * @returns {Promise<{synth: Object}>} A promise that resolves when Hydra is ready.
   */
  get ready() {
    return this.#hydraManager ? Promise.resolve({ synth: this.synth }) : this.#readyPromise
  }

  /**
   * Returns the canvas element associated with this element.
   * @returns {HTMLCanvasElement} The canvas element.
   */
  get canvas() {
    return this.#canvasManager.canvas
  }

  /**
   * Setter for the canvas property.
   * @param {HTMLCanvasElement} value - The canvas element to set.
   */
  set canvas(value) {
    this.#canvasManager.preserveCustomCanvas(value)
    if (this.#hydraManager) {
      this.#initHydra()
      if (this.#code !== '') {
        this.#hydraManager.evaluate(this.#code)
      }
    }
  }

  /**
   * The hydra-synth instance (read-only)
   * Provides access to DSL functions, sources, outputs for advanced use cases
   * @returns {Object|undefined} The synth object
   */
  get synth() {
    return this.#hydraManager?.synth
  }

  /**
   * The persistent eval scope for this element. User code's bare
   * assignments and `var` declarations land here.
   * @returns {Object}
   */
  get scope() {
    return this.#scope
  }

  /**
   * Custom GLSL transforms. Assigning an array applies each function
   * via `synth.setFunction` and re-applies them after every synth
   * reset (attribute change, canvas swap, destroy + reconnect).
   * @returns {Array} The current transform definitions.
   */
  get transforms() {
    return this.#extendTransforms
  }

  /**
   * Setter for the transforms property.
   * @param {Array} value - An array of { name, type, inputs, glsl } objects.
   */
  set transforms(value) {
    this.#extendTransforms = Array.isArray(value) ? value : []
    if (this.#hydraManager?.synth) {
      this.#extendTransforms.forEach(fn => this.#hydraManager.synth.setFunction(fn))
    }
  }

  /**
   * Test seam — exposes the embedded CanvasManager. Not part of the public
   * API; do not call from production code.
   * @returns {CanvasManager}
   */
  get canvasManager() {
    return this.#canvasManager
  }

  /**
   * Test seam — exposes the embedded AttributeHandler. Not part of the
   * public API; do not call from production code.
   * @returns {AttributeHandler}
   */
  get attributeHandler() {
    return this.#attributeHandler
  }

  /**
   * Test seam — exposes the embedded HydraManager. Not part of the public
   * API; do not call from production code.
   * @returns {HydraManager|null}
   */
  get hydraManager() {
    return this.#hydraManager
  }

  /**
   * Loads an extension script scoped to this element. While the script
   * loads, the element's Hydra surface is transiently published on
   * `window` so scripts that assume globals (bare `setFunction`,
   * `window._hydra`, `window.synth`) can self-register. The prior
   * `window` state is restored once the script promise settles.
   * @param {string} url
   * @returns {Promise<void>}
   */
  loadScript(url) {
    return this.#hydraManager?.loadScript(url)
  }

  /**
   * Get the code of the element.
   * @returns {string} The code of the element.
   */
  get code() {
    return this.#code
  }

  /**
   * Setter for the code property.
   * @param {string} value - The code to be set.
   */
  set code(value) {
    this.#code = value
    if (this.#hydraManager) {
      this.#hydraManager.evaluate(value)
    }
  }

  /**
   * Tears down the synth, canvas, and listeners without removing the
   * element from the DOM. The element can be reconnected afterwards;
   * `hydra-ready` will fire again.
   */
  destroy() {
    this.removeEventListener('hydra-element-resize', this.#onResize)
    this.removeEventListener('hydra-context-lost', this.#onContextLost)
    this.#canvasManager.disconnect()
    this.#canvasManager.removeAnalyzerCanvases()
    this.#stopLoop()
    this.#hydraManager?.destroy()
    this.#hydraManager = null
    this.#initialized = false
    this.#readyPromise = new Promise(resolve => {
      this.#resolveReady = resolve
    })
  }

  attributeChangedCallback(attrName, oldValue, newValue) {
    if (oldValue === newValue) return
    if (attrName === 'width' || attrName === 'height') {
      this.#handleSizeChange(attrName, newValue)
    } else if (attrName === 'loop') {
      this.#handleLoopChange(newValue)
    } else if (this.#attributeHandler.hasSynthResettingAttribute(attrName)) {
      this.#pendingResetAttrs = this.#pendingResetAttrs || {}
      this.#pendingResetAttrs[attrName] = newValue
      queueMicrotask(() => this.#flushSynthReset())
    }
  }

  connectedCallback() {
    this.addEventListener('hydra-element-resize', this.#onResize)
    this.addEventListener('hydra-context-lost', this.#onContextLost)
    if (!this.#initialized) {
      this.#initialized = true
      if (this.#code === '' && this.textContent.trim()) {
        this.#code = this.textContent
        this.textContent = ''
      }
      const options = this.#attributeHandler.getOptions()
      if (!this.#canvasManager.canvas) {
        this.#canvasManager.init(options.width, options.height)
      }
      if (!this.#hydraManager) {
        this.#initHydra()
      }
    }
    this.#connected = true
    if (this.#attributeHandler.getOptions().autoLoop) {
      this.#startLoop()
    }
  }

  disconnectedCallback() {
    this.removeEventListener('hydra-element-resize', this.#onResize)
    this.removeEventListener('hydra-context-lost', this.#onContextLost)
    this.#connected = false
    this.#canvasManager.disconnect()
    this.#stopLoop()
  }

  #initHydra() {
    this.#stopLoop()
    if (this.#hydraManager) {
      this.#hydraManager.destroy()
    }
    this.#hydraManager = new HydraManager({
      host: this,
      scope: this.#scope,
      options: { ...this.#attributeHandler.getOptions(), extendTransforms: this.#extendTransforms },
    })
    this.#hydraManager.init()
    this.#canvasManager.tagAnalyzerCanvases()
    if (this.#hydraManager.hydra && this.#attributeHandler.getOptions().makeGlobal) {
      publishHydraGlobals(this.#hydraManager.hydra)
    }
    this.#loopController = new LoopController(dt => this.#hydraManager?.tick(dt))
    if (this.#connected && this.#attributeHandler.getOptions().autoLoop) {
      this.#startLoop()
    }
    this.#resolveReady({ synth: this.#hydraManager.synth })
  }

  #startLoop() {
    if (!this.#loopController) {
      this.#loopController = new LoopController(dt => this.#hydraManager?.tick(dt))
    }
    this.#loopController.start()
  }

  #stopLoop() {
    this.#loopController?.stop()
  }

  #handleSizeChange(attrName, newValue) {
    this.#attributeHandler.update(attrName, newValue)
    if (newValue === null) {
      this.#canvasManager.refreshFromCss()
      return
    }
    const options = this.#attributeHandler.getOptions()
    this.#canvasManager.resize(options.width, options.height)
    if (this.#hydraManager) {
      this.#hydraManager.setResolution(options.width, options.height)
    }
  }

  #handleLoopChange(newValue) {
    const options = this.#attributeHandler.update('loop', newValue)
    if (this.#connected && options.autoLoop) {
      this.#startLoop()
    } else {
      this.#stopLoop()
    }
  }

  #flushSynthReset() {
    const pending = this.#pendingResetAttrs
    this.#pendingResetAttrs = null
    if (!pending) return
    for (const [attrName, newValue] of Object.entries(pending)) {
      this.#attributeHandler.update(attrName, newValue)
    }
    if (!this.#canvasManager.canvas) {
      const options = this.#attributeHandler.getOptions()
      this.#canvasManager.init(options.width, options.height)
    }
    this.#initHydra()
    if (this.#code !== '') {
      this.#hydraManager.evaluate(this.#code)
    }
  }
}
