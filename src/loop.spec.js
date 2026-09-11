import { expect } from '@open-wc/testing'
import { Loop } from './core/loop'

describe('Loop', () => {
  it('starts and stops without error', () => {
    const loop = new Loop({ onTick: () => {} })
    loop.start()
    expect(loop.isRunning).to.be.true
    loop.stop()
    expect(loop.isRunning).to.be.false
  })

  it('is not running before start', () => {
    const loop = new Loop({ onTick: () => {} })
    expect(loop.isRunning).to.be.false
  })

  it('tick computes delta time from the previous tick and calls onTick', () => {
    const calls = []
    const loop = new Loop({ onTick: dt => calls.push(dt) })
    loop.tick(150)
    expect(calls).to.deep.equal([150])
    loop.tick(250)
    expect(calls).to.deep.equal([150, 100])
  })

  it('tick returns the delta time', () => {
    const loop = new Loop({ onTick: () => {} })
    expect(loop.tick(75)).to.equal(75)
  })

  it('start is a no-op while running', () => {
    let calls = 0
    const loop = new Loop({ onTick: () => calls++ })
    loop.start()
    loop.start()
    expect(loop.isRunning).to.be.true
    loop.stop()
    expect(calls).to.be.lessThan(3)
  })

  it('drives onTick via requestAnimationFrame', async () => {
    let callCount = 0
    const loop = new Loop({ onTick: () => callCount++ })
    loop.start()
    await new Promise(resolve => setTimeout(resolve, 50))
    loop.stop()
    expect(callCount).to.be.greaterThan(0)
  })
})
