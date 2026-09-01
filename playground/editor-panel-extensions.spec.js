/**
 * Playground editor-panel extension-aware completion tests.
 *
 * Verifies the behavior promised in
 * `.opencode/specs/hydra-element/active/playground-editor.md` §2.2:
 * after every successful eval, the panel diffs the live synth keys
 * against the baseline wordlist and calls `editor.addWords(newNames)`
 * so the dropdown grows as extensions load.
 *
 * Per AGENTS.md: chai assertions on primitives. No sinon-chai spy
 * assertions (they hang the WTR session).
 */
import { expect, fixture, html, oneEvent } from '@open-wc/testing'

// `<hydra-editor>` registers via side-effect import on `editor-panel`.
// Importing `editor-panel` brings in the panel AND the element.
import './components/editor-panel.js'

// KNOWN_WORDS — the same baseline the panel uses (43 DSL + 30 globals
// + 17 JS keywords = 90 entries; mirror of `DEFAULT_WORDLIST` in
// `src/editor/completion.js`). We assert on `completion.wordlist`
// directly, which is the post-addWords state.
const KNOWN_WORDS_SIZE = 90

describe('editor-panel — extension-aware addWords demo', () => {
  it('registers <hydra-editor> inside the panel shadow root', async () => {
    const panel = await fixture(html`<editor-panel></editor-panel>`)
    const editor = panel.shadowRoot.querySelector('hydra-editor')
    expect(editor).to.exist
  })

  it('baseline wordlist is the standard 96 entries before any addWords', async () => {
    const panel = await fixture(html`<editor-panel></editor-panel>`)
    const editor = panel.shadowRoot.querySelector('hydra-editor')
    expect(editor.completion.wordlist.size).to.equal(KNOWN_WORDS_SIZE)
  })

  it('addWords grows the wordlist with extension-declared names', async () => {
    const panel = await fixture(html`<editor-panel></editor-panel>`)
    const editor = panel.shadowRoot.querySelector('hydra-editor')
    const before = editor.completion.wordlist.size
    editor.addWords(['hydraMidi', 'sculptToHydraRenderer'])
    expect(editor.completion.wordlist.size).to.equal(before + 2)
    expect(editor.completion.wordlist.has('hydraMidi')).to.equal(true)
    expect(editor.completion.wordlist.has('sculptToHydraRenderer')).to.equal(true)
  })

  it('addWords is idempotent (duplicate names do not grow the set)', async () => {
    const panel = await fixture(html`<editor-panel></editor-panel>`)
    const editor = panel.shadowRoot.querySelector('hydra-editor')
    const before = editor.completion.wordlist.size
    editor.addWords(['foo', 'bar'])
    editor.addWords(['foo'])
    expect(editor.completion.wordlist.size).to.equal(before + 2)
  })

  it('value round-trips through <hydra-editor>', async () => {
    const panel = await fixture(html`<editor-panel></editor-panel>`)
    const editor = panel.shadowRoot.querySelector('hydra-editor')
    editor.value = 'osc(10).out()'
    expect(editor.value).to.equal('osc(10).out()')
    expect(panel.value).to.equal('osc(10).out()')
  })

  it('value setter is silent — does NOT dispatch code-apply', async () => {
    const panel = await fixture(html`<editor-panel></editor-panel>`)
    const editor = panel.shadowRoot.querySelector('hydra-editor')
    let fired = 0
    editor.addEventListener('code-apply', () => {
      fired++
    })
    panel.value = 'osc(10).out()'
    await Promise.resolve()
    await Promise.resolve()
    expect(fired, 'programmatic value set does not dispatch code-apply').to.equal(0)
  })

  it('code-apply from the element triggers target.code assignment', async () => {
    // Mount the panel with a fake `<hydra-element>` target so we can
    // verify the panel forwards the editor's code-apply to target.code.
    const fakeTarget = document.createElement('hydra-element')
    fakeTarget.code = ''
    document.body.append(fakeTarget)

    const panel = await fixture(html`<editor-panel></editor-panel>`)
    panel.target = fakeTarget
    const editor = panel.shadowRoot.querySelector('hydra-editor')
    editor.value = 'osc(10, 0.5, 1).out()'

    setTimeout(() => {
      const surface = editor.shadowRoot.querySelector('.editor')
      surface.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          ctrlKey: true,
          bubbles: true,
          composed: true,
          cancelable: true,
        })
      )
    })
    await oneEvent(editor, 'code-apply')
    // Give the panel's code-apply listener a tick to fire.
    await Promise.resolve()
    expect(fakeTarget.code).to.equal('osc(10, 0.5, 1).out()')

    fakeTarget.remove()
  })

  it('eval button triggers target.code assignment and wordlist growth', async () => {
    const fakeTarget = document.createElement('hydra-element')
    fakeTarget.code = ''
    // Simulate an extension exposing a new synth key.
    fakeTarget.synth = {
      synth: {
        ...Object.fromEntries(
          // Pretend every common Hydra function is on synth.synth — the
          // diff against KNOWN_WORDS should find zero new names (we
          // intentionally include ONLY known words).
          ['osc', 'noise', 'shape', 'solid', 'src', 'voronoi'].map(k => [k, () => {}])
        ),
        // And one NEW extension name (not in KNOWN_WORDS).
        hydraMidi: () => {},
      },
    }
    document.body.append(fakeTarget)

    const panel = await fixture(html`<editor-panel></editor-panel>`)
    panel.target = fakeTarget
    const editor = panel.shadowRoot.querySelector('hydra-editor')
    editor.value = 'osc().out()'

    const before = editor.completion.wordlist.size
    panel.shadowRoot.querySelector('[data-eval]').click()
    await Promise.resolve()
    expect(fakeTarget.code).to.equal('osc().out()')
    expect(editor.completion.wordlist.size).to.equal(before + 1)
    expect(editor.completion.wordlist.has('hydraMidi')).to.equal(true)

    fakeTarget.remove()
  })

  it('harvestExtensionWords does not throw when target.synth is missing', async () => {
    const fakeTarget = document.createElement('hydra-element')
    fakeTarget.code = ''
    // No synth property — simulates a target that has not yet initialized.
    document.body.append(fakeTarget)

    const panel = await fixture(html`<editor-panel></editor-panel>`)
    panel.target = fakeTarget
    const editor = panel.shadowRoot.querySelector('hydra-editor')

    expect(() => {
      editor.value = 'osc().out()'
      panel.shadowRoot.querySelector('[data-eval]').click()
    }).to.not.throw()

    fakeTarget.remove()
  })
})
