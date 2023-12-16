import { expect } from '@open-wc/testing'
import { spy } from 'sinon'
import { hydraEval } from './eval'

describe('hydraEval', () => {

  it('should call noise', () => {
    const synth = { noise: spy() }
    hydraEval('noise(10, 0.1)', synth)
    expect(synth.noise).to.have.been.calledOnceWith(10, 0.1)
  })

  it('should call voronoi', () => {
    const synth = { voronoi: spy() }
    hydraEval('voronoi(5, 0.3, 0.3)', synth)
    expect(synth.voronoi).to.have.been.calledOnceWith(5, 0.3, 0.3)
  })

  it('should call osc', () => {
    const synth = { osc: spy() }
    hydraEval('osc(30, 0.1)', synth)
    expect(synth.osc).to.have.been.calledOnceWith(30, 0.1)
  })

  it('should call shape', () => {
    const synth = { shape: spy() }
    hydraEval('shape(3, 0.5, 0.001)', synth)
    expect(synth.shape).to.have.been.calledOnceWith(3, 0.5, 0.001)
  })

  it('should call gradient', () => {
    const synth = { gradient: spy() }
    hydraEval('gradient(2)', synth)
    expect(synth.gradient).to.have.been.calledOnceWith(2)
  })

  it('should call solid', () => {
    const synth = { solid: spy() }
    hydraEval('solid(0, 1, 0, 1)', synth)
    expect(synth.solid).to.have.been.calledOnceWith(0, 1, 0, 1)
  })

  it('should call prev', () => {
    const synth = { prev: spy() }
    hydraEval('prev()', synth)
    expect(synth.prev).to.have.been.calledOnceWith()
  })

  it('should init s0', () => {
    const synth = { s0: { init: spy() }, src: spy() }
    hydraEval('s0.init({}); src(s0)', synth)
    expect(synth.s0.init).to.have.been.calledOnceWith({})
    expect(synth.src).to.have.been.calledOnceWith(synth.s0)
  })

  it('should init s1', () => {
    const synth = { s1: { init: spy() }, src: spy() }
    hydraEval('s1.init({}); src(s1)', synth)
    expect(synth.s1.init).to.have.been.calledOnceWith({})
    expect(synth.src).to.have.been.calledOnceWith(synth.s1)
  })

  it('should init s2', () => {
    const synth = { s2: { init: spy() }, src: spy() }
    hydraEval('s2.init({}); src(s2)', synth)
    expect(synth.s2.init).to.have.been.calledOnceWith({})
    expect(synth.src).to.have.been.calledOnceWith(synth.s2)
  })

  it('should init s3', () => {
    const synth = { s3: { init: spy() }, src: spy() }
    hydraEval('s3.init({}); src(s3)', synth)
    expect(synth.s3.init).to.have.been.calledOnceWith({})
    expect(synth.src).to.have.been.calledOnceWith(synth.s3)
  })

  it('should render o0', () => {
    const synth = { o0: spy(), render: spy() }
    hydraEval('render(o0)', synth)
    expect(synth.render).to.have.been.calledOnceWith(synth.o0)
  })

  it('should render o1', () => {
    const synth = { o1: spy(), render: spy() }
    hydraEval('render(o1)', synth)
    expect(synth.render).to.have.been.calledOnceWith(synth.o1)
  })

  it('should render o2', () => {
    const synth = { o2: spy(), render: spy() }
    hydraEval('render(o2)', synth)
    expect(synth.render).to.have.been.calledOnceWith(synth.o2)
  })

  it('should render o3', () => {
    const synth = { o3: spy(), render: spy() }
    hydraEval('render(o3)', synth)
    expect(synth.render).to.have.been.calledOnceWith(synth.o3)
  })

  it('should call audio setSmooth', () => {
    const synth = { a: { setSmooth: spy() } }
    hydraEval('a.setSmooth(0.8)', synth)
    expect(synth.a.setSmooth).to.have.been.calledOnceWith(0.8)
  })

  it('should call audio setCutoff', () => {
    const synth = { a: { setCutoff: spy() } }
    hydraEval('a.setCutoff(4)', synth)
    expect(synth.a.setCutoff).to.have.been.calledOnceWith(4)
  })

  it('should call audio setBins', () => {
    const synth = { a: { setBins: spy() } }
    hydraEval('a.setBins(8)', synth)
    expect(synth.a.setBins).to.have.been.calledOnceWith(8)
  })

  it('should call audio setScale', () => {
    const synth = { a: { setScale: spy() } }
    hydraEval('a.setScale(5)', synth)
    expect(synth.a.setScale).to.have.been.calledOnceWith(5)
  })

  it('should call audio hide', () => {
    const synth = { a: { hide: spy() } }
    hydraEval('a.hide()', synth)
    expect(synth.a.hide).to.have.been.calledOnceWith()
  })

  it('should call audio show', () => {
    const synth = { a: { show: spy() } }
    hydraEval('a.show()', synth)
    expect(synth.a.show).to.have.been.calledOnceWith()
  })

  it('should get audio fft', () => {
    const synth = { osc: spy(), a: { fft: [0.1] } }
    hydraEval('osc(a.fft[0])', synth)
    expect(synth.osc).to.have.been.calledOnceWith(0.1)
  })

  it('should get mouse position', () => {
    const synth = { osc: spy(), mouse: { x: 5, y: 200 } }
    hydraEval('osc(mouse.x, mouse.y)', synth)
    expect(synth.osc).to.have.been.calledOnceWith(5, 200)
  })

  it('should get speed', () => {
    const synth = { osc: spy(), speed: 1 }
    hydraEval('osc(speed)', synth)
    expect(synth.osc).to.have.been.calledOnceWith(1)
  })

  it('should get bpm', () => {
    const synth = { osc: spy(), bpm: 30 }
    hydraEval('osc(bpm)', synth)
    expect(synth.osc).to.have.been.calledOnceWith(30)
  })

  it('should get width', () => {
    const synth = { osc: spy(), width: 500 }
    hydraEval('osc(width)', synth)
    expect(synth.osc).to.have.been.calledOnceWith(500)
  })

  it('should get height', () => {
    const synth = { osc: spy(), height: 500 }
    hydraEval('osc(height)', synth)
    expect(synth.osc).to.have.been.calledOnceWith(500)
  })

  it('should get time', () => {
    const synth = { osc: spy(), time: 1350.55 }
    hydraEval('osc(time)', synth)
    expect(synth.osc).to.have.been.calledOnceWith(1350.55)
  })

  it('should get stats', () => {
    const synth = { osc: spy(), stats: { fps: 60 } }
    hydraEval('osc(stats.fps)', synth)
    expect(synth.osc).to.have.been.calledOnceWith(60)
  })

  it('should call setFunction', () => {
    const synth = { setFunction: spy() }
    hydraEval('setFunction({})', synth)
    expect(synth.setFunction).to.have.been.calledOnceWith({})
  })

  it('should call setResolution', () => {
    const synth = { setResolution: spy() }
    hydraEval('setResolution(500, 500)', synth)
    expect(synth.setResolution).to.have.been.calledOnceWith(500, 500)
  })

  it('should call update', () => {
    const synth = { update: spy() }
    hydraEval('update()', synth)
    expect(synth.update).to.have.been.calledOnceWith()
  })

  it('should call hush', () => {
    const synth = { hush: spy() }
    hydraEval('hush()', synth)
    expect(synth.hush).to.have.been.calledOnceWith()
  })

  it('should call screencap', () => {
    const synth = { screencap: spy() }
    hydraEval('screencap()', synth)
    expect(synth.screencap).to.have.been.calledOnceWith()
  })

  it('should call vidRecorder', () => {
    const synth = { vidRecorder: { start: spy(), stop: spy() } }
    hydraEval('vidRecorder.start()', synth)
    expect(synth.vidRecorder.start).to.have.been.calledOnceWith()
    hydraEval('vidRecorder.stop()', synth)
    expect(synth.vidRecorder.stop).to.have.been.calledOnceWith()
  })

})
