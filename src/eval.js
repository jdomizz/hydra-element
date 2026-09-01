const USER_PROPS = ['speed', 'bpm', 'update', 'afterUpdate', 'fps']

const warnedIdentifiers = new Set()

function warnOnce(msg) {
  if (!warnedIdentifiers.has(msg)) {
    warnedIdentifiers.add(msg)
    console.warn(msg)
  }
}

/**
 * Evaluates code using a hydra-synth instance as scope.
 *
 * The code runs inside an async function, so `await` works (e.g. for
 * `s0.initImage(await ...)` or `loadScript`) and the returned promise always
 * resolves to the code's return value (usually `undefined` for DSL statements).
 * Sync code runs unchanged; simply `await` the result.
 *
 * SECURITY NOTE: This is NOT a sandbox. The Proxy fallback to `globalThis[prop]`
 * means user code has full access to browser globals (document, localStorage,
 * fetch, etc.). Only use this with trusted code. If you need isolation, use
 * a proper sandbox like an iframe with separate origin.
 *
 * The `has` trap always returns true so that `with(ctx)` doesn't throw
 * ReferenceError for unknown identifiers — it lets the `get` trap decide
 * whether to return a scope variable, synth property, or fall back to globalThis.
 *
 * The `set` trap maintains a separate local scope for bare assignments (e.g. `x = 5`)
 * while syncing user props (speed, bpm, etc.) to the synth.
 *
 * VARIABLE PERSISTENCE:
 * - Bare assignments (`x = 5`) and `var` declarations persist across evals when
 *   a shared scope is provided (for live coding workflows like ojack editor).
 * - `let` and `const` declarations are block-scoped to the eval by design and
 *   do NOT persist. This is intentional JavaScript behavior.
 *
 * @param {string} code The code to eval (should be an expression or IIFE)
 * @param {Object} synth The hydra-synth instance to use as scope
 * @param {Object} [scope] Optional persistent scope for variable storage between evals
 * @returns {Promise<*>} A promise that resolves when evaluation completes
 */
export function hydraEval(code, synth, scope) {
  const proxy = createScopeProxy(synth, scope || Object.create(null))
  try {
    const fn = new Function('__scope', `return (async function(){with(__scope){${code}\n}})()`)
    return fn(proxy)
  } catch (e) {
    return Promise.reject(e)
  }
}

/**
 * V8 compiles `new Function` bodies with a two-line synthetic prologue
 * (`function anonymous(<args>\n) {\n`), so every `error.stack` line inside
 * the wrapper sits this many lines below the line the user wrote.
 */
const WRAPPER_LINE_OFFSET = 2

/**
 * Extracts the user-code line from an eval error, best-effort.
 *
 * `hydraEval` embeds the user's code in the only `new Function` wrapper this
 * library compiles, and Chromium marks its stack frames with an
 * `<anonymous>:line:col` position. The first such frame is the error's
 * position in user code — the throw site when user code threw directly, or
 * the call site when hydra-synth internals threw deeper down. Subtracting
 * the wrapper offset maps it back to the user's own line numbering.
 *
 * Returns `undefined` for everything else: syntax errors (no position in
 * the stack), non-Error rejections, foreign eval frames outside the code's
 * line range, or any parse failure. Never throws.
 *
 * @param {*} error The error from a failed eval (Error, string, or anything).
 * @param {string} code The user code that was evaluated.
 * @returns {number|undefined} 1-based user-code line, or undefined.
 */
export function userCodeLine(error, code) {
  try {
    if (!error || typeof error.stack !== 'string' || typeof code !== 'string') return undefined
    const maxLine = code.split('\n').length
    for (const frame of error.stack.split('\n')) {
      if (!/^\s*at\s/.test(frame)) continue
      const match = /<anonymous>:(\d+):\d+/.exec(frame)
      if (!match) continue
      const line = Number(match[1]) - WRAPPER_LINE_OFFSET
      if (line >= 1 && line <= maxLine) return line
    }
    return undefined
  } catch {
    return undefined
  }
}

function createScopeProxy(synth, scopeObj) {
  return new Proxy(scopeObj, {
    has(_target, _prop) {
      return true
    },
    get(target, prop) {
      if (prop in target) return target[prop]
      if (prop === 'synth') return synth
      if (typeof prop === 'string' && prop in synth) {
        const value = synth[prop]
        if (typeof value === 'function') {
          return value.bind(synth)
        }
        return value
      }
      if (!(prop in globalThis) && typeof prop === 'string') {
        warnOnce(`[hydra-element] identifier '${prop}' is undefined (scope, synth, and globals)`)
      }
      return globalThis[prop]
    },
    set(target, prop, value) {
      target[prop] = value
      if (USER_PROPS.includes(prop)) {
        synth[prop] = value
      }
      return true
    },
  })
}
