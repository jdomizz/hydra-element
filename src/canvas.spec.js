import { expect, fixture, html } from '@open-wc/testing'
import sinon from 'sinon'
import { CanvasManager } from './canvas'
import { HydraElement } from './element'

if (!customElements.get('hydra-element')) {
  customElements.define('hydra-element', HydraElement)
}

class FakeResizeObserver {
  constructor(callback) {
    this.callback = callback
    this.targets = []
  }
  observe(target) {
    this.targets.push(target)
  }
  disconnect() {
    this.targets = []
  }
}

function makeHost({ width, height } = {}) {
  const host = document.createElement('div')
  if (width !== undefined) host.setAttribute('width', width)
  if (height !== undefined) host.setAttribute('height', height)
  document.body.append(host)
  const shadowRoot = host.attachShadow({ mode: 'open' })
  return { host, shadowRoot }
}

function fire(manager, rect) {
  manager.resizeObserver.callback([{ contentRect: rect }])
}

describe('CanvasManager', () => {
  let originalResizeObserver
  let cleanup

  beforeEach(() => {
    originalResizeObserver = window.ResizeObserver
    window.ResizeObserver = FakeResizeObserver
    cleanup = []
  })

  afterEach(() => {
    window.ResizeObserver = originalResizeObserver
    cleanup.forEach(fn => fn())
    document.body.innerHTML = ''
  })

  const trackCleanup = ({ host }) => cleanup.push(() => host.remove())

  it('creates an internal canvas with the given size', () => {
    const { shadowRoot, host } = makeHost()
    trackCleanup({ host })
    const manager = new CanvasManager(shadowRoot)
    manager.init(640, 480)
    expect(manager.canvas).to.exist
    expect(manager.canvas.id).to.equal('hydra-element-canvas')
    expect(manager.canvas.width).to.equal(640)
    expect(manager.canvas.height).to.equal(480)
    expect(shadowRoot.querySelector('canvas')).to.equal(manager.canvas)
  })

  it('tags the internal canvas with part="canvas"', () => {
    const { shadowRoot, host } = makeHost()
    trackCleanup({ host })
    const manager = new CanvasManager(shadowRoot)
    manager.init(640, 480)
    expect(manager.canvas.getAttribute('part')).to.equal('canvas')
  })

  it('falls back to 1280x720 when init receives a zero size', () => {
    const { shadowRoot, host } = makeHost()
    trackCleanup({ host })
    const manager = new CanvasManager(shadowRoot)
    manager.init(0, 0)
    expect(manager.canvas.width).to.equal(1280)
    expect(manager.canvas.height).to.equal(720)
  })

  it('does not tag a preserved custom canvas with part="canvas"', () => {
    const { shadowRoot, host } = makeHost()
    trackCleanup({ host })
    const manager = new CanvasManager(shadowRoot)
    manager.init(640, 480)
    const custom = document.createElement('canvas')
    manager.preserveCustomCanvas(custom)
    expect(manager.canvas).to.equal(custom)
    expect(custom.getAttribute('part')).to.equal('canvas')
  })

  it('resizes the canvas dimensions', () => {
    const { shadowRoot, host } = makeHost()
    trackCleanup({ host })
    const manager = new CanvasManager(shadowRoot)
    manager.init(640, 480)
    manager.resize(800, 600)
    expect(manager.canvas.width).to.equal(800)
    expect(manager.canvas.height).to.equal(600)
  })

  it('replaces the internal canvas with a custom canvas on preserve', () => {
    const { shadowRoot, host } = makeHost()
    trackCleanup({ host })
    const manager = new CanvasManager(shadowRoot)
    manager.init(640, 480)
    const custom = document.createElement('canvas')
    manager.preserveCustomCanvas(custom)
    expect(manager.canvas).to.equal(custom)
    expect(shadowRoot.querySelector('canvas#hydra-element-canvas')).to.equal(null)
    expect(shadowRoot.contains(custom)).to.be.true
  })

  it('keeps a supplied custom canvas untouched during init', () => {
    const { shadowRoot, host } = makeHost()
    trackCleanup({ host })
    const manager = new CanvasManager(shadowRoot)
    const custom = document.createElement('canvas')
    custom.id = 'mine'
    manager.preserveCustomCanvas(custom)
    manager.init(640, 480)
    expect(manager.canvas).to.equal(custom)
  })

  it('removeInternalCanvas removes only internal canvases', () => {
    const { shadowRoot, host } = makeHost()
    trackCleanup({ host })
    const manager = new CanvasManager(shadowRoot)
    manager.init(640, 480)
    const other = document.createElement('canvas')
    shadowRoot.append(other)
    manager.removeInternalCanvas()
    expect(shadowRoot.querySelector('canvas#hydra-element-canvas')).to.equal(null)
    expect(shadowRoot.contains(other)).to.be.true
  })

  it('follows CSS size from a resize entry', () => {
    const { shadowRoot, host } = makeHost()
    trackCleanup({ host })
    const manager = new CanvasManager(shadowRoot)
    manager.init(0, 0)
    fire(manager, { width: 400, height: 300 })
    expect(manager.canvas.width).to.equal(400)
    expect(manager.canvas.height).to.equal(300)
  })

  it('honors explicit width/height attributes over CSS size', () => {
    const { shadowRoot, host } = makeHost({ width: '800', height: '600' })
    trackCleanup({ host })
    const manager = new CanvasManager(shadowRoot)
    manager.init(0, 0)
    fire(manager, { width: 400, height: 300 })
    expect(manager.canvas.width).to.equal(800)
    expect(manager.canvas.height).to.equal(600)
  })

  it('keeps the fallback size when the element is hidden (zero rect)', () => {
    const { shadowRoot, host } = makeHost()
    trackCleanup({ host })
    const manager = new CanvasManager(shadowRoot)
    manager.init(0, 0)
    fire(manager, { width: 0, height: 0 })
    expect(manager.canvas.width).to.equal(1280)
    expect(manager.canvas.height).to.equal(720)
  })

  it('skips resizing when the size has not changed', () => {
    const { shadowRoot, host } = makeHost()
    trackCleanup({ host })
    const manager = new CanvasManager(shadowRoot)
    manager.init(400, 300)
    const dispatchSpy = sinon.spy(host, 'dispatchEvent')
    fire(manager, { width: 400, height: 300 })
    expect(dispatchSpy.called).to.be.false
    expect(manager.canvas.width).to.equal(400)
  })

  it('dispatches hydra-element-resize with the new resolution', () => {
    const { shadowRoot, host } = makeHost()
    trackCleanup({ host })
    const manager = new CanvasManager(shadowRoot)
    manager.init(0, 0)
    const eventSpy = sinon.spy(host, 'dispatchEvent')
    fire(manager, { width: 400, height: 300 })
    const resizeEvent = eventSpy
      .getCalls()
      .map(c => c.args[0])
      .find(e => e.type === 'hydra-element-resize')
    expect(resizeEvent).to.exist
    expect(resizeEvent.detail).to.deep.equal({ width: 400, height: 300 })
  })

  it('disconnects the resize observer on disconnect', () => {
    const { shadowRoot, host } = makeHost()
    trackCleanup({ host })
    const manager = new CanvasManager(shadowRoot)
    manager.init(0, 0)
    const disconnectSpy = sinon.spy(manager.resizeObserver, 'disconnect')
    manager.disconnect()
    expect(disconnectSpy).to.have.been.calledOnce
    expect(manager.resizeObserver).to.equal(null)
  })

  it('removes analyzer canvases from the shadow root', () => {
    const { shadowRoot, host } = makeHost()
    trackCleanup({ host })
    const manager = new CanvasManager(shadowRoot)
    manager.init(640, 480)
    const analyzer = document.createElement('canvas')
    shadowRoot.append(analyzer)
    manager.removeAnalyzerCanvases()
    expect(shadowRoot.contains(analyzer)).to.be.false
    expect(manager.canvas).to.exist
  })

  it('adopts a custom canvas into the shadow root', () => {
    const { shadowRoot, host } = makeHost()
    trackCleanup({ host })
    const manager = new CanvasManager(shadowRoot)
    manager.init(640, 480)
    const custom = document.createElement('canvas')
    manager.preserveCustomCanvas(custom)
    expect(shadowRoot.contains(custom)).to.be.true
    expect(manager.canvas).to.equal(custom)
  })

  it('does not duplicate an already-adopted custom canvas', () => {
    const { shadowRoot, host } = makeHost()
    trackCleanup({ host })
    const manager = new CanvasManager(shadowRoot)
    manager.init(640, 480)
    const custom = document.createElement('canvas')
    manager.preserveCustomCanvas(custom)
    manager.preserveCustomCanvas(custom)
    expect(shadowRoot.querySelectorAll('canvas')).to.have.length(1)
  })
})

describe('CanvasManager width/height coercion', () => {
  let originalResizeObserver

  beforeEach(() => {
    originalResizeObserver = window.ResizeObserver
    window.ResizeObserver = FakeResizeObserver
  })

  afterEach(() => {
    window.ResizeObserver = originalResizeObserver
  })

  it('warns once on a non-numeric width attribute', async () => {
    const warn = sinon.stub(console, 'warn')
    const el = await fixture(html`<hydra-element width="500px"></hydra-element>`)
    el.canvasManager.resizeObserver.callback([{ contentRect: { width: 100, height: 100 } }])
    expect(warn).to.have.been.calledWithMatch(/invalid width/)
    expect(el.canvas.width).to.not.equal(500)
    warn.restore()
  })

  it('treats empty width attribute as absent', async () => {
    const warn = sinon.stub(console, 'warn')
    await fixture(html`<hydra-element width=""></hydra-element>`)
    expect(warn).to.not.have.been.called
    warn.restore()
  })

  it('still accepts plain numeric attributes', async () => {
    const el = await fixture(html`<hydra-element width="800" height="600"></hydra-element>`)
    expect(el.canvas.width).to.equal(800)
    expect(el.canvas.height).to.equal(600)
  })
})
