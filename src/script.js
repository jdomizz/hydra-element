/**
 * Fetches script text; `null` signals a `script`-tag fallback.
 * @param {string} url
 * @returns {Promise<string | null>}
 */
export async function fetchScriptText(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return res.text()
  } catch {
    return null
  }
}

/**
 * Loads an extension script into a context, falling back to the engine's loader when the fetch fails.
 * @param {Object} context
 * @param {Object} hydra
 * @param {string} url
 * @returns {Promise<void>}
 */
export async function loadScriptInto(context, hydra, url) {
  await context.withBridge(async () => {
    const text = await fetchScriptText(url)
    if (text === null) {
      await hydra.loadScript(url)
    } else {
      await context.eval(text)
    }
  })
}
