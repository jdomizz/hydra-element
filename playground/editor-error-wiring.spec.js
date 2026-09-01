/**
 * Playground editor-panel error wiring tests.
 *
 * Verifies the wiring promised in
 * `.opencode/specs/hydra-editor/active/editor-rich-features.md` §5:
 * a `hydra-eval` failure from the active target calls
 * `editor.markError({ line, message })` (line = the best-effort
 * user-code line from the event detail), a success calls
 * `editor.clearErrors()`, and events from non-active targets are
 * ignored.
 *
 * Per AGENTS.md: chai assertions on primitives. No sinon-chai spy
 * assertions (they hang the WTR session).
 *
 * PENDING: `markError`/`clearErrors` are implemented on the
 * `hydra-editor` package side (parallel branch `feat/rich-features`,
 * resolved here via the `file:` devDependency). Until that dist is
 * installed, every test fails at the API precondition below — expected,
 * not a wiring bug. A real integration check runs after the parallel
 * work lands.
 */
import { expect, fixture, html } from '@open-wc/testing'
import sinon from 'sinon'
import './components/editor-panel.js'

/**
 * Asserts the precondition for the wiring tests: the installed
 * `<hydra-editor>` exposes the error-bar API. A primitive assertion —
 * a plain chai failure reports cleanly (never sinon-chai style).
 */
function assertEditorApi(editor, method) {
  expect(typeof editor[method]).to.equal(
    'function',
    `hydra-editor dist does not expose ${method}() yet — pending the parallel agent's dist`
  )
}

describe('editor-panel — hydra-eval error wiring', () => {
  it('marks the editor error bar on a failing hydra-eval from the active target', async () => {
    const target = document.createElement('div')
    document.body.append(target)

    const panel = await fixture(html`<editor-panel></editor-panel>`)
    panel.target = target
    const editor = panel.shadowRoot.querySelector('hydra-editor')
    assertEditorApi(editor, 'markError')
    const markError = sinon.spy(editor, 'markError')

    target.dispatchEvent(
      new CustomEvent('hydra-eval', {
        detail: { success: false, error: new Error('boom'), line: 3 },
        bubbles: true,
      })
    )
    await Promise.resolve()

    expect(markError.callCount).to.equal(1)
    expect(markError.firstCall.args[0].line).to.equal(3)
    expect(markError.firstCall.args[0].message).to.equal('boom')

    markError.restore()
    target.remove()
  })

  it('derives the message from non-Error errors', async () => {
    const target = document.createElement('div')
    document.body.append(target)

    const panel = await fixture(html`<editor-panel></editor-panel>`)
    panel.target = target
    const editor = panel.shadowRoot.querySelector('hydra-editor')
    assertEditorApi(editor, 'markError')
    const markError = sinon.spy(editor, 'markError')

    target.dispatchEvent(
      new CustomEvent('hydra-eval', {
        detail: { success: false, error: 'plain string' },
        bubbles: true,
      })
    )
    await Promise.resolve()

    expect(markError.callCount).to.equal(1)
    expect(markError.firstCall.args[0].line).to.equal(undefined)
    expect(markError.firstCall.args[0].message).to.equal('plain string')

    markError.restore()
    target.remove()
  })

  it('ignores hydra-eval from non-active targets', async () => {
    const active = document.createElement('div')
    const other = document.createElement('div')
    document.body.append(active, other)

    const panel = await fixture(html`<editor-panel></editor-panel>`)
    panel.target = active
    const editor = panel.shadowRoot.querySelector('hydra-editor')
    assertEditorApi(editor, 'markError')
    const markError = sinon.spy(editor, 'markError')

    other.dispatchEvent(
      new CustomEvent('hydra-eval', {
        detail: { success: false, error: new Error('boom'), line: 1 },
        bubbles: true,
      })
    )
    await Promise.resolve()
    expect(markError.callCount, 'non-active target events must be ignored').to.equal(0)

    active.dispatchEvent(
      new CustomEvent('hydra-eval', {
        detail: { success: false, error: new Error('boom'), line: 1 },
        bubbles: true,
      })
    )
    await Promise.resolve()
    expect(markError.callCount, 'active target events must be wired').to.equal(1)

    markError.restore()
    active.remove()
    other.remove()
  })

  it('clears the editor error bar on a successful hydra-eval from the active target', async () => {
    const target = document.createElement('div')
    document.body.append(target)

    const panel = await fixture(html`<editor-panel></editor-panel>`)
    panel.target = target
    const editor = panel.shadowRoot.querySelector('hydra-editor')
    assertEditorApi(editor, 'clearErrors')
    const clearErrors = sinon.spy(editor, 'clearErrors')

    target.dispatchEvent(
      new CustomEvent('hydra-eval', {
        detail: { success: true },
        bubbles: true,
      })
    )
    await Promise.resolve()

    expect(clearErrors.callCount).to.equal(1)

    clearErrors.restore()
    target.remove()
  })
})
