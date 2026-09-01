// src/hydra-editor.d.ts — public type surface for the <hydra-editor> custom element
// Hand-written: the runtime is plain JS; the .d.ts is the single source of truth
// for downstream TypeScript consumers. Mirrors the shape of src/hydra-element.d.ts.

/** Payload of the `code-apply` event. */
export interface HydraEditorCodeApplyDetail {
  /** The current editor contents at the moment Ctrl/Cmd+Enter was pressed. */
  code: string;
}

/** Custom element `<hydra-editor>`. CodeJar + Prism (Hydra-extended JS
 *  grammar) + wordlist-based completion. Registered via side-effect
 *  import (`import 'hydra-element/editor'`). */
export interface HydraEditor extends HTMLElement {
  /** Get or set the editor's code. Setting is a programmatic write only —
   *  it does NOT dispatch `code-apply` and does NOT fire `input`. Use
   *  Ctrl/Cmd+Enter (or the element's own apply flow) to trigger eval. */
  value: string;
  /** Inherited placeholder attribute; visible when `value` is empty. */
  placeholder: string;
  /** Extend the completion wordlist. Idempotent — duplicates are ignored.
   *  Accepts a `string[]` or a space-separated `string`. Typical use:
   *  after `loadScript` exposes new extension functions, the host diffs
   *  the live `synth` keys against `DEFAULT_WORDLIST` and calls
   *  `addWords(newNames)` so the dropdown grows with extensions. */
  addWords(words: string[] | string): void;
  /** Tear down CodeJar, the completion dropdown, and the document-level
   *  click listener. Idempotent — safe to call from a disconnectedCallback
   *  chain or after the element has been removed from the DOM. */
  destroy(): void;
}

/** The element is registered via side-effect import (`import 'hydra-element/editor'`),
 *  so there is no named element export — only the `HTMLElementTagNameMap` augmentation
 *  and the `HydraEditor` interface for consumers who want to type a local
 *  reference. */
declare global {
  interface HTMLElementTagNameMap {
    'hydra-editor': HydraEditor;
  }

  interface HTMLElementEventMap {
    'code-apply': CustomEvent<HydraEditorCodeApplyDetail>;
  }
}
