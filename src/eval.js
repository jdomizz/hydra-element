/** User-settable props mirrored to the synth on bare assignment. */
const USER_PROPS = ['speed', 'bpm', 'update', 'afterUpdate', 'fps']

/** Engine-owned names mutated per frame; reads resolve live to the synth and are never pinned by bare assignments. */
const LIVE_SYNTH_NAMES = [...USER_PROPS, 'time', 'width', 'height']

/** Warn state is tracked per scope object, so warnings dedupe per element/context and are collected with it. */
const warnedIdentifiers = new WeakMap()

/** Names explicitly bound into a scope; a bound name wins over the live synth read. */
const boundScopeNames = new WeakMap()

/** Tracks a name as bound into a scope (bound names win over live synth reads). */
function markBound(scope, name) {
  let bound = boundScopeNames.get(scope)
  if (bound === undefined) {
    bound = new Set()
    boundScopeNames.set(scope, bound)
  }
  bound.add(name)
}

/** Untracks a name previously marked as bound. */
function unmarkBound(scope, name) {
  boundScopeNames.get(scope)?.delete(name)
}

/** Logs an unknown-identifier warning once per scope and name. */
function warnOnce(scope, name) {
  let warned = warnedIdentifiers.get(scope)
  if (warned === undefined) {
    warned = new Set()
    warnedIdentifiers.set(scope, warned)
  }
  if (!warned.has(name)) {
    warned.add(name)
    console.warn(`[hydra-element] identifier '${name}' is undefined (scope, synth, and globals)`)
  }
}

/**
 * Reads a synth property, binding functions to the synth surface.
 * @returns {{ found: boolean, value: unknown }}
 */
function readSynthProp(synth, prop) {
  if (synth === null || synth === undefined || !(prop in synth))
    return { found: false, value: undefined }
  const value = synth[prop]
  if (typeof value === 'function') return { found: true, value: value.bind(synth) }
  return { found: true, value }
}

/**
 * Binds a static value into a scope; the bound name wins over the live engine read
 * (`time`, `width`, `height`, `speed`, …).
 */
export function bindScope(scope, name, value) {
  Object.defineProperty(scope, name, {
    enumerable: true,
    configurable: true,
    writable: true,
    value,
  })
  markBound(scope, name)
}

/** Binds a live getter into a scope, re-read on every access (read-only from evaluated code). */
export function bindLiveScope(scope, name, provider) {
  Object.defineProperty(scope, name, {
    enumerable: true,
    configurable: true,
    get: provider,
  })
  markBound(scope, name)
}

/** Removes a previously bound value or provider from a scope. */
export function unbindScope(scope, name) {
  delete scope[name]
  unmarkBound(scope, name)
}

/**
 * Proxy scope for eval: live engine names, scope, then synth (re-binding functions), then globalThis.
 * @param {unknown} synth The hydra-synth instance
 * @param {Object} scope The persistent scope
 * @returns {Object} A Proxy-backed scope object
 */
function createScopeProxy(synth, scope) {
  return new Proxy(scope, {
    has() {
      return true
    },
    get(target, prop) {
      if (typeof prop !== 'string') {
        if (prop in target) return target[prop]
        return globalThis[prop]
      }
      if (LIVE_SYNTH_NAMES.includes(prop) && !boundScopeNames.get(target)?.has(prop)) {
        const live = readSynthProp(synth, prop)
        if (live.found) return live.value
      }
      if (prop in target) return target[prop]
      if (prop === 'synth') return synth
      const synthValue = readSynthProp(synth, prop)
      if (synthValue.found) return synthValue.value
      if (!(prop in globalThis)) {
        warnOnce(target, prop)
      }
      return fixGlobalThis(globalThis[prop])
    },
    set(target, prop, value) {
      target[prop] = value
      if (typeof prop === 'string' && USER_PROPS.includes(prop) && synth) {
        synth[prop] = value
      }
      return true
    },
  })
}

/** Cache of globals wrapped by fixGlobalThis, one proxy per underlying fn. */
const boundGlobals = new WeakMap()

/** Bare calls through the scope proxy get `this` = proxy ("Illegal invocation"); an `apply`-only proxy forces `this` = globalThis without touching statics or `new`. */
function fixGlobalThis(fn) {
  if (typeof fn !== 'function') return fn
  let wrapped = boundGlobals.get(fn)
  if (!wrapped) {
    wrapped = new Proxy(fn, {
      apply(target, _thisArg, args) {
        return Reflect.apply(target, globalThis, args)
      },
    })
    boundGlobals.set(fn, wrapped)
  }
  return wrapped
}

/**
 * Evaluates Hydra code using a hydra-synth instance as scope. Not a sandbox.
 * Bare assignments persist in `scope`; `speed`/`bpm` are mirrored to the synth.
 * @param {string} code The code to evaluate
 * @param {unknown} synth The hydra-synth instance
 * @param {Object} [scope] Optional persistent scope
 * @returns {Promise<unknown>} The code's return value
 */
export function hydraEval(code, synth, scope) {
  const proxy = createScopeProxy(synth, scope ?? Object.create(null))
  try {
    const fn = new Function('__scope', `return (async function(){with(__scope){${code}\n}})()`)
    return fn(proxy)
  } catch (error) {
    return Promise.reject(error)
  }
}

/* V8's `new Function` prologue offsets `error.stack` lines by this many; derived so wrapper changes can't silently break the mapping. */
const V8_WRAPPER_LINE_OFFSET = 'function anonymous(__scope\n) {\n'.split('\n').length - 1

/**
 * Extracts the 1-based user-code line from an eval error, best-effort. V8 only.
 * @param {unknown} error The error from a failed eval
 * @param {string} code The code that was evaluated
 * @returns {number | undefined} The user-code line, or undefined
 */
export function userCodeLine(error, code) {
  try {
    if (!error || typeof error?.stack !== 'string' || typeof code !== 'string') return undefined
    const maxLine = code.split('\n').length
    for (const frame of error.stack.split('\n')) {
      if (!/^\s*at\s/.test(frame)) continue
      const match = /<anonymous>:(\d+):\d+/.exec(frame)
      if (!match) continue
      const line = Number(match[1]) - V8_WRAPPER_LINE_OFFSET
      if (line >= 1 && line <= maxLine) return line
    }
    return undefined
  } catch {
    return undefined
  }
}
