import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchScriptText, loadScriptInto } from './script'

function makeContext() {
  return {
    withBridge: vi.fn(fn => fn()),
    eval: vi.fn(() => Promise.resolve()),
  }
}

describe('fetchScriptText', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should return the fetched text on OK responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, text: () => 'osc().out()' }))
    )
    await expect(fetchScriptText('ext.js')).resolves.toBe('osc().out()')
  })

  it('should return null on non-OK responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 404 }))
    )
    await expect(fetchScriptText('ext.js')).resolves.toBeNull()
  })

  it('should return null when the fetch rejects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('network')))
    )
    await expect(fetchScriptText('ext.js')).resolves.toBeNull()
  })
})

describe('loadScriptInto', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should evaluate the fetched script inside the context bridge', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, text: () => 'osc().out()' }))
    )
    const context = makeContext()
    const hydra = { loadScript: vi.fn() }
    await loadScriptInto(context, hydra, 'ext.js')
    expect(context.withBridge).toHaveBeenCalledOnce()
    expect(context.eval).toHaveBeenCalledWith('osc().out()')
    expect(hydra.loadScript).not.toHaveBeenCalled()
  })

  it('should fall back to the engine script loader when the fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 404 }))
    )
    const context = makeContext()
    const hydra = { loadScript: vi.fn(() => Promise.resolve()) }
    await loadScriptInto(context, hydra, 'ext.js')
    expect(hydra.loadScript).toHaveBeenCalledWith('ext.js')
    expect(context.eval).not.toHaveBeenCalled()
  })
})
