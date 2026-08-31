import { expect } from '@open-wc/testing'
import { LoopController } from './loop'

describe('LoopController', () => {
  it('starts and stops without error', () => {
    const controller = new LoopController(() => {})
    controller.start()
    expect(controller.isRunning).to.be.true
    controller.stop()
    expect(controller.isRunning).to.be.false
  })

  it('is not running before start', () => {
    const controller = new LoopController(() => {})
    expect(controller.isRunning).to.be.false
  })

  it('tick computes delta time from the previous tick and calls tickFn', () => {
    const calls = []
    const controller = new LoopController(dt => calls.push(dt))
    controller.tick(150)
    expect(calls).to.deep.equal([150])
    controller.tick(250)
    expect(calls).to.deep.equal([150, 100])
  })

  it('tick returns the delta time', () => {
    const controller = new LoopController(() => {})
    expect(controller.tick(75)).to.equal(75)
  })

  it('start is a no-op while running', () => {
    let calls = 0
    const controller = new LoopController(() => calls++)
    controller.start()
    controller.start()
    expect(controller.isRunning).to.be.true
    controller.stop()
    expect(calls).to.be.lessThan(3)
  })

  it('drives tickFn via requestAnimationFrame', async () => {
    let callCount = 0
    const controller = new LoopController(() => callCount++)
    controller.start()
    await new Promise(resolve => setTimeout(resolve, 50))
    controller.stop()
    expect(callCount).to.be.greaterThan(0)
  })
})
