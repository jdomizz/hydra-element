// src/eval.d.ts — public type for the `hydra-element/eval` subpath

/**
 * Evaluate `code` against a hydra-synth instance, with an optional persistent
 * `scope` for bare assignments (`x = 5` writes to scope; later evaluations see
 * the same scope).
 *
 * NOT a sandbox. User code has full access to browser globals via `globalThis`.
 * Only evaluate code you trust. For untrusted code, run inside an iframe with
 * a separate origin.
 *
 * @returns A promise that resolves when the user's async IIFE settles. Always
 *          `await` it — the function is async even when the code itself is not.
 */
export function hydraEval(
  code: string,
  /** The synth instance obtained from `el.synth` (or `hydra-ready` detail). */
  synth: unknown,
  /** Optional persistent scope. Pass `Object.create(null)` for a fresh one. */
  scope?: Record<string, unknown>,
): Promise<unknown>;

/**
 * Extract the 1-based user-code line from an error thrown by `hydraEval`,
 * best-effort. The user's code is embedded in a `new Function` wrapper
 * (two synthetic prologue lines), so stack lines inside the wrapper are
 * offset by 2 from the user's own numbering. Returns `undefined` when the
 * error carries no parseable position (syntax errors, non-Error rejections,
 * foreign stacks). Never throws.
 */
export function userCodeLine(error: unknown, code: string): number | undefined;