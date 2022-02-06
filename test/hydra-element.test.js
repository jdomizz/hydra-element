import { html, fixture, expect } from '@open-wc/testing';

import './hydra-element.js';

describe('HydraElement', () => {
  it('has a <window.innerWidth> width by default', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`);
    expect(el.options.width).to.equal(window.innerWidth);
  });
  it('sets <window.innerWidth> width if the assigned value is not valid', async () => {
    const el1 = await fixture(html`<hydra-element width></hydra-element>`);
    const el2 = await fixture(html`<hydra-element width=""></hydra-element>`);
    const el3 = await fixture(html`<hydra-element width="one"></hydra-element>`);
    const el4 = await fixture(html`<hydra-element width="10.1"></hydra-element>`);
    const el5 = await fixture(html`<hydra-element width="-100"></hydra-element>`);
    const el6 = await fixture(html`<hydra-element width="0"></hydra-element>`);
    const el7 = await fixture(html`<hydra-element width="100"></hydra-element>`);
    const el8 = await fixture(html`<hydra-element width="10---1"></hydra-element>`);
    expect(el1.options.width).to.equal(window.innerWidth);
    expect(el2.options.width).to.equal(window.innerWidth);
    expect(el3.options.width).to.equal(window.innerWidth);
    expect(el4.options.width).to.equal(10);
    expect(el5.options.width).to.equal(window.innerWidth);
    expect(el6.options.width).to.equal(0);
    expect(el7.options.width).to.equal(100);
    expect(el8.options.width).to.equal(10);
  });
  it('has a <window.innerHeight> height by default', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`);
    expect(el.options.height).to.equal(window.innerHeight);
  });
  it('sets <window.innerHeight> height if the assigned value is not valid', async () => {
    const el1 = await fixture(html`<hydra-element height></hydra-element>`);
    const el2 = await fixture(html`<hydra-element height=""></hydra-element>`);
    const el3 = await fixture(html`<hydra-element height="one"></hydra-element>`);
    const el4 = await fixture(html`<hydra-element height="10.1"></hydra-element>`);
    const el5 = await fixture(html`<hydra-element height="-100"></hydra-element>`);
    const el6 = await fixture(html`<hydra-element height="0"></hydra-element>`);
    const el7 = await fixture(html`<hydra-element height="100"></hydra-element>`);
    const el8 = await fixture(html`<hydra-element height="10---1"></hydra-element>`);
    expect(el1.options.height).to.equal(window.innerHeight);
    expect(el2.options.height).to.equal(window.innerHeight);
    expect(el3.options.height).to.equal(window.innerHeight);
    expect(el4.options.height).to.equal(10);
    expect(el5.options.height).to.equal(window.innerHeight);
    expect(el6.options.height).to.equal(0);
    expect(el7.options.height).to.equal(100);
    expect(el8.options.height).to.equal(10);
  });
  it('has 4 sources by default', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`);
    expect(el.options.numSources).to.equal(4);
  });
  it('sets 4 sources if the assigned value is not valid', async () => {
    const el1 = await fixture(html`<hydra-element num-sources></hydra-element>`);
    const el2 = await fixture(html`<hydra-element num-sources=""></hydra-element>`);
    const el3 = await fixture(html`<hydra-element num-sources="one"></hydra-element>`);
    const el4 = await fixture(html`<hydra-element num-sources="10.1"></hydra-element>`);
    const el5 = await fixture(html`<hydra-element num-sources="-100"></hydra-element>`);
    const el6 = await fixture(html`<hydra-element num-sources="0"></hydra-element>`);
    const el7 = await fixture(html`<hydra-element num-sources="100"></hydra-element>`);
    const el8 = await fixture(html`<hydra-element num-sources="10---1"></hydra-element>`);
    expect(el1.options.numSources).to.equal(4);
    expect(el2.options.numSources).to.equal(4);
    expect(el3.options.numSources).to.equal(4);
    expect(el4.options.numSources).to.equal(10);
    expect(el5.options.numSources).to.equal(4);
    expect(el6.options.numSources).to.equal(0);
    expect(el7.options.numSources).to.equal(100);
    expect(el8.options.numSources).to.equal(10);
  });
  it('has 4 outputs by default', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`);
    expect(el.options.numOutputs).to.equal(4);
  });
  it('sets 4 outputs if the assigned value is not valid', async () => {
    const el1 = await fixture(html`<hydra-element num-outputs></hydra-element>`);
    const el2 = await fixture(html`<hydra-element num-outputs=""></hydra-element>`);
    const el3 = await fixture(html`<hydra-element num-outputs="one"></hydra-element>`);
    const el4 = await fixture(html`<hydra-element num-outputs="10.1"></hydra-element>`);
    const el5 = await fixture(html`<hydra-element num-outputs="-100"></hydra-element>`);
    const el6 = await fixture(html`<hydra-element num-outputs="0"></hydra-element>`);
    const el7 = await fixture(html`<hydra-element num-outputs="100"></hydra-element>`);
    const el8 = await fixture(html`<hydra-element num-outputs="10---1"></hydra-element>`);
    expect(el1.options.numOutputs).to.equal(4);
    expect(el2.options.numOutputs).to.equal(4);
    expect(el3.options.numOutputs).to.equal(4);
    expect(el4.options.numOutputs).to.equal(10);
    expect(el5.options.numOutputs).to.equal(4);
    expect(el6.options.numOutputs).to.equal(0);
    expect(el7.options.numOutputs).to.equal(100);
    expect(el8.options.numOutputs).to.equal(10);
  });

  it('has <mediump> precision by default', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`);
    expect(el.options.precision).to.equal('mediump');
  });
  it('accepts <highp> | <mediump> | <lowp> as precision values', async () => {
    const el1 = await fixture(html`<hydra-element precision="highp"></hydra-element>`);
    const el2 = await fixture(html`<hydra-element precision="mediump"></hydra-element>`);
    const el3 = await fixture(html`<hydra-element precision="lowp"></hydra-element>`);
    expect(el1.options.precision).to.equal('highp');
    expect(el2.options.precision).to.equal('mediump');
    expect(el3.options.precision).to.equal('lowp');
  });
  it('sets <mediump> precision if the assigned value is not valid', async () => {
    const el1 = await fixture(html`<hydra-element precision></hydra-element>`);
    const el2 = await fixture(html`<hydra-element precision=""></hydra-element>`);
    const el3 = await fixture(html`<hydra-element precision="low"></hydra-element>`);
    expect(el1.options.precision).to.equal('mediump');
    expect(el2.options.precision).to.equal('mediump');
    expect(el3.options.precision).to.equal('mediump');
  });

  // TODO: adapt the canvas to the container, not to the buffer!
  // it('creates a canvas with the internal buffer dimensions', async () => {
  //   const el = await fixture(html`<hydra-element width="1080" height="1080"></hydra-element>`);
  //   expect(el).shadowDom.to.equal(`<canvas width="1080" height="1080"></canvas>`);
  // });

  it('passes the a11y audit', async () => {
    const el = await fixture(html`<hydra-element></hydra-element>`);
    expect(el).shadowDom.to.be.accessible();
  });
});