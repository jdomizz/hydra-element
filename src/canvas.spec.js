// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CanvasManager } from './canvas'

class FakeResizeObserver {
  constructor(callback) {
    this.callback = callback
  }
  observe() {}
  disconnect() {}
  trigger() {
    this.callback([])
  }
}

function makeHost(attrs = {}, rect = { width: 100, height: 200 }) {
  return {
    attrs,
    rect,
    hasAttribute(name) {
      return name in this.attrs
    },
    getAttribute(name) {
      return this.attrs[name] ?? null
    },
    getBoundingClientRect() {
      return this.rect
    },
    dispatchEvent: vi.fn(),
  }
}

function makeShadowRoot() {
  return document.createElement('div')
}

describe('CanvasManager', () => {
  beforeEach(() => {
    globalThis.ResizeObserver = FakeResizeObserver
  })

  afterEach(() => {
    delete globalThis.ResizeObserver
    globalThis.devicePixelRatio = 1
  })

  it('should create an internal canvas sized from explicit attributes', () => {
    const host = makeHost({ width: '250', height: '300' })
    const manager = new CanvasManager(host, makeShadowRoot())
    manager.init()
    expect(manager.canvas.id).toBe('hydra-element-canvas')
    expect(manager.canvas.width).toBe(250)
    expect(manager.canvas.height).toBe(300)
  })

  it('should scale auto-sized canvases by device-pixel-ratio', () => {
    globalThis.devicePixelRatio = 2
    const host = makeHost({}, { width: 100, height: 200 })
    const manager = new CanvasManager(host, makeShadowRoot())
    manager.init({ dpr: 2 })
    expect(manager.canvas.width).toBe(200)
    expect(manager.canvas.height).toBe(400)
  })

  it('should dispatch `hydra-element-resize` when the size changes', () => {
    const host = makeHost({}, { width: 100, height: 200 })
    const manager = new CanvasManager(host, makeShadowRoot())
    manager.init()
    expect(host.dispatchEvent).not.toHaveBeenCalled()
    host.rect = { width: 300, height: 200 }
    manager.resizeObserver.trigger()
    expect(host.dispatchEvent).toHaveBeenCalledTimes(1)
    const [[event]] = host.dispatchEvent.mock.calls
    expect(event.type).toBe('hydra-element-resize')
    expect(event.detail).toEqual({ width: 300, height: 200 })
    expect(manager.canvas.width).toBe(300)
  })

  it('should adopt a custom canvas, removing the internal one', () => {
    const host = makeHost()
    const manager = new CanvasManager(host, makeShadowRoot())
    manager.init()
    const custom = document.createElement('canvas')
    manager.preserveCustomCanvas(custom)
    expect(manager.canvas).toBe(custom)
  })

  it('should mark the internal canvas with part="canvas"', () => {
    const host = makeHost()
    const manager = new CanvasManager(host, makeShadowRoot())
    manager.init()
    expect(manager.canvas.getAttribute('part')).toBe('canvas')
  })

  it('should tag analyzer canvases with part="analyzer"', () => {
    const host = makeHost()
    const shadowRoot = makeShadowRoot()
    const manager = new CanvasManager(host, shadowRoot)
    manager.init()
    const analyzer = document.createElement('canvas')
    shadowRoot.append(analyzer)
    manager.tagAnalyzerCanvases()
    expect(analyzer.getAttribute('part')).toBe('analyzer')
    expect(analyzer.getAttribute('aria-hidden')).toBe('true')
  })

  it('should remove analyzer canvases on request', () => {
    const host = makeHost()
    const shadowRoot = makeShadowRoot()
    const manager = new CanvasManager(host, shadowRoot)
    manager.init()
    const analyzer = document.createElement('canvas')
    shadowRoot.append(analyzer)
    manager.removeAnalyzerCanvases()
    expect(analyzer.isConnected).toBe(false)
    expect(shadowRoot.querySelectorAll('canvas')).toHaveLength(1)
  })

  it('should warn at most once per instance for a repeated invalid attribute', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const manager = new CanvasManager(makeHost({ width: 'abc' }), makeShadowRoot())
    manager.init()
    manager.refresh()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(manager.canvas.width).toBe(1280)
    warn.mockRestore()
  })

  it('should warn per instance, not per module, for identical invalid attributes', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const first = new CanvasManager(makeHost({ width: 'abc' }), makeShadowRoot())
    first.init()
    const second = new CanvasManager(makeHost({ width: 'abc' }), makeShadowRoot())
    second.init()
    expect(warn).toHaveBeenCalledTimes(2)
    warn.mockRestore()
  })
})
