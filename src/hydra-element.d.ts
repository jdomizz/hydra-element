// src/hydra-element.d.ts — public type surface for the <hydra-element> custom element
// Hand-written: the runtime is plain JS; the .d.ts is the single source of truth
// for downstream TypeScript consumers.

/** Payload of the `hydra-ready` event and the `ready` promise. */
export interface HydraReadyDetail {
  /** The hydra-synth instance backing this element. Typed as `unknown` because
   *  `hydra-synth` does not yet publish its own `.d.ts`. Once it does, narrow
   *  this to the synth's exported type. */
  synth: unknown;
}

/** Payload of the `hydra-eval` event — fires after every `el.code = ...` assignment. */
export interface HydraEvalDetail {
  success: boolean;
  error?: string;
  /** Best-effort 1-based line in the evaluated code where the error
   *  originated. Present only on failures; `undefined` when the error's
   *  stack carries no parseable user-code position (e.g. syntax errors). */
  line?: number;
}

/** Payload of the `hydra-element-resize` event — fires when the canvas backing-store
 *  resolution changes (CSS resize, attribute change, or `el.canvas` swap). */
export interface HydraResizeDetail {
  width: number;
  height: number;
}

/**
 * A custom GLSL transform/generator definition.
 * Structurally compatible with hydra-synth's `GlslFunction` (typed locally
 * until hydra-synth ships official types).
 */
export interface HydraTransformFunction {
  name: string;
  type: 'src' | 'coord' | 'color' | 'combine' | 'combineCoord';
  inputs: Array<{ name: string; type: string; default: unknown }>;
  glsl: string;
}

/** Custom element `<hydra-element>`. Embeds a hydra-synth scene. */
export interface HydraElement extends HTMLElement {
  /** Get or set the scene code. Setting triggers evaluation through the
   *  scoped `with` proxy. */
  code: string;
  /** The canvas element backing the render. Assigning a canvas adopts it
   *  into the shadow root and re-renders the current scene on it. */
  readonly canvas: HTMLCanvasElement | null;
  /** Read-only access to the hydra-synth instance. Use this to call
   *  `el.synth.s0.initCam()`, `el.synth.setResolution(w, h)`,
   *  `el.synth.setFunction({ ... })`, etc. Typed as `unknown` for the
   *  same reason as `HydraReadyDetail.synth`. */
  readonly synth: unknown;
  /** Custom GLSL transforms. Assigning an array applies each function via
   *  `synth.setFunction` and re-applies them after every synth reset
   *  (attribute change, canvas swap). */
  transforms: HydraTransformFunction[];
  /** Resolves with `{ synth }` once Hydra is initialized. The getter
   *  always returns the *live* synth, even after a reset or reconnect. */
  readonly ready: Promise<HydraReadyDetail>;
  /** Tear the element down without removing it from the DOM. After
   *  `destroy()`, the next `connectedCallback` initializes fresh. */
  destroy(): void;
  /** Load an extension script. Transiently publishes this element's
   *  Hydra on `window` for the script's duration; restores the prior
   *  `window` state in `finally` — see ARCHITECTURE.md §"loadScript bridge". */
  loadScript(url: string): Promise<void>;
}

/** The element is registered via side-effect import (`import 'hydra-element'`),
 *  so there is no named export — only the `HTMLElementTagNameMap` augmentation
 *  and the `HydraElement` interface for consumers who want to type a local
 *  reference. */
declare global {
  interface HTMLElementTagNameMap {
    'hydra-element': HydraElement;
  }

  interface HTMLElementEventMap {
    'hydra-ready': CustomEvent<HydraReadyDetail>;
    'hydra-eval': CustomEvent<HydraEvalDetail>;
    'hydra-element-resize': CustomEvent<HydraResizeDetail>;
    'hydra-context-lost': CustomEvent<void>;
  }
}