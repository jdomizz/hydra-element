/**
 * Public hydra-element type surface. Lives at the package root so both the
 * DOM shell (`element/`) and the runtime adapter (`runtime/`) can import it
 * without crossing layers.
 *
 * The `declare global` augmentations (`HTMLElementTagNameMap` /
 * `HTMLElementEventMap`) are added in Step 4 when the old hand-written
 * `src/hydra-element.d.ts` leaves the tree — both cannot declare the same
 * global names in one compile unit.
 */

/** Payload of the `hydra-ready` event and the `ready` promise. */
export interface HydraReadyDetail {
  /** The hydra-synth instance backing this element. Typed as `unknown`
   *  because hydra-synth does not yet publish its own `.d.ts`. */
  synth: unknown
}

/** Payload of the `hydra-eval` event — fires after every `el.code = ...` assignment. */
export interface HydraEvalDetail {
  success: boolean
  error?: string
  /** Best-effort 1-based line in the evaluated code where the error
   *  originated. Present only on failures; `undefined` when the error's
   *  stack carries no parseable user-code position (e.g. syntax errors). */
  line?: number
}

/** Payload of the `hydra-element-resize` event — fires when the canvas
 *  backing-store resolution changes (CSS resize, attribute change, or
 *  `el.canvas` swap). */
export interface HydraResizeDetail {
  width: number
  height: number
}

/**
 * A custom GLSL transform/generator definition.
 * Structurally compatible with hydra-synth's `GlslFunction` (typed locally
 * until hydra-synth ships official types).
 */
export interface HydraTransformFunction {
  name: string
  type: 'src' | 'coord' | 'color' | 'combine' | 'combineCoord'
  inputs: Array<{ name: string; type: string; default: unknown }>
  glsl: string
}
