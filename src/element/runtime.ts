/**
 * The seam between the DOM-only shell and the hydra adapter.
 *
 * The shell holds a `CanvasRuntime` in its runtime slot and nothing else —
 * attach/detach/destroy mirror the element lifecycle, and `handleCanvasSwap`
 * is invoked when the caller assigns `el.canvas`. The concrete hydra adapter
 * (`runtime/runtime.ts`) implements this interface and is wired in by the main
 * entry via `setDefaultRuntimeFactory`.
 */

import type { HydraElement } from './element'

/** The lifecycle contract the shell drives. */
export interface CanvasRuntime {
  /** Mount this runtime on a host element. Called on connect and re-attach. */
  attach(host: HydraElement): void
  /** Unmount without destroying the engine — called on disconnect. */
  detach(): void
  /** Full teardown — called on `destroy()`. */
  destroy(): void
  /** The host canvas was swapped — recreate the engine on the new canvas. */
  handleCanvasSwap?(): void
}

/** Builds a runtime instance. */
export type CanvasRuntimeFactory = () => CanvasRuntime

let defaultRuntimeFactory: CanvasRuntimeFactory | null = null

/**
 * Registers the browser-side default runtime factory (the main entry calls
 * this with the hydra adapter). Pass `null` to clear.
 */
export function setDefaultRuntimeFactory(factory: CanvasRuntimeFactory | null): void {
  defaultRuntimeFactory = factory
}

/**
 * The registered runtime factory, or `null` when the main entry has not been
 * imported (standalone shell usage). The shell falls back to a microtask
 * retry so a late registration still wins the first connect.
 */
export function getDefaultRuntimeFactory(): CanvasRuntimeFactory | null {
  return defaultRuntimeFactory
}
