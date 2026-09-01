import { expect } from '@open-wc/testing'
import { DEFAULT_WORDLIST, Completion } from './completion.js'

const DSL_FUNCTIONS = [
  'osc',
  'src',
  'solid',
  'noise',
  'shape',
  'voronoi',
  'kaleid',
  'rotate',
  'scale',
  'hue',
  'saturate',
  'contrast',
  'add',
  'luma',
  'grain',
  'scanline',
  'dither',
  'chromatic',
  'vignette',
  'tri',
  'square',
  'saw',
  'invert',
  'colorama',
  'out',
  'diff',
  'layer',
  'mask',
  'blend',
  'modulate',
  'repeat',
  'scrollX',
  'scrollY',
  'pixelate',
  'posterize',
  'shift',
  'thresh',
  'modulateScrollX',
  'modulateScrollY',
  'modulateKaleid',
  'modulateRepeat',
  'modulateRepeatX',
  'modulateRepeatY',
]

const JS_KEYWORDS = [
  'const',
  'let',
  'var',
  'function',
  'return',
  'await',
  'async',
  'if',
  'else',
  'for',
  'while',
  'true',
  'false',
  'null',
  'undefined',
  'new',
  'class',
]

/**
 * Build a minimal `Completion` instance for direct testing. The dropdown
 * element is appended to the body so the test can verify the rendered
 * listbox; the editor is a bare contenteditable div with the trailing-
 * identifier text set as textContent.
 */
function makeCompletion(text = '') {
  const editor = document.createElement('div')
  editor.contentEditable = 'true'
  editor.textContent = text
  document.body.append(editor)
  const dropdown = document.createElement('div')
  dropdown.setAttribute('role', 'listbox')
  document.body.append(dropdown)
  const completion = new Completion(editor, dropdown, () => {})
  return { editor, dropdown, completion }
}

function cleanup(c) {
  try {
    c.editor.remove()
  } catch {}
  try {
    c.dropdown.remove()
  } catch {}
}

describe('completion wordlist', () => {
  it('contains all 43 DSL functions (mirror of sweep + hydra-scene-authoring skill)', () => {
    expect(DSL_FUNCTIONS.length, 'DSL function list must be 43 entries').to.equal(43)
    for (const fn of DSL_FUNCTIONS) {
      expect(DEFAULT_WORDLIST.has(fn), `missing DSL function: ${fn}`).to.equal(true)
    }
  })

  it('contains all globals (k0..k7, g0..g7, gp0..gp7, time, o0..o3, a)', () => {
    for (let i = 0; i < 8; i++) {
      expect(DEFAULT_WORDLIST.has(`k${i}`), `missing k${i}`).to.equal(true)
    }
    for (let i = 0; i < 8; i++) {
      expect(DEFAULT_WORDLIST.has(`g${i}`), `missing g${i}`).to.equal(true)
    }
    for (let i = 0; i < 8; i++) {
      expect(DEFAULT_WORDLIST.has(`gp${i}`), `missing gp${i}`).to.equal(true)
    }
    expect(DEFAULT_WORDLIST.has('time')).to.equal(true)
    for (let i = 0; i < 4; i++) {
      expect(DEFAULT_WORDLIST.has(`o${i}`), `missing o${i}`).to.equal(true)
    }
    expect(DEFAULT_WORDLIST.has('a')).to.equal(true)
  })

  it('contains common JS keywords', () => {
    for (const kw of JS_KEYWORDS) {
      expect(DEFAULT_WORDLIST.has(kw), `missing keyword: ${kw}`).to.equal(true)
    }
  })
})

describe('Completion instance', () => {
  it('starts with the default wordlist', () => {
    const c = makeCompletion()
    expect(c.completion.wordlist.size).to.equal(DEFAULT_WORDLIST.size)
    cleanup(c)
  })

  it('addWords extends the wordlist (idempotent)', () => {
    const c = makeCompletion()
    const baseline = c.completion.wordlist.size
    c.completion.addWords(['foo', 'bar'])
    expect(c.completion.wordlist.size).to.equal(baseline + 2)
    expect(c.completion.wordlist.has('foo')).to.equal(true)
    expect(c.completion.wordlist.has('bar')).to.equal(true)
    // Adding 'foo' again must not grow the set.
    c.completion.addWords(['foo', 'baz'])
    expect(c.completion.wordlist.size).to.equal(baseline + 3)
    expect(c.completion.wordlist.has('baz')).to.equal(true)
    cleanup(c)
  })

  it('addWords accepts a space-separated string', () => {
    const c = makeCompletion()
    const baseline = c.completion.wordlist.size
    c.completion.addWords('alpha beta  gamma')
    expect(c.completion.wordlist.has('alpha')).to.equal(true)
    expect(c.completion.wordlist.has('beta')).to.equal(true)
    expect(c.completion.wordlist.has('gamma')).to.equal(true)
    expect(c.completion.wordlist.size).to.equal(baseline + 3)
    cleanup(c)
  })

  it('open() with a trailing identifier narrows the list by case-insensitive prefix', () => {
    const c = makeCompletion('osc().k')
    c.completion.open()
    expect(c.completion.isOpen).to.equal(true)
    const items = c.dropdown.querySelectorAll('.completion-item')
    expect(items.length).to.be.greaterThan(0)
    const words = [...items].map(el => el.textContent)
    expect(words).to.include('kaleid')
    cleanup(c)
  })

  it('open() with no trailing identifier does not open', () => {
    const c = makeCompletion('1 + 2')
    c.completion.open()
    expect(c.completion.isOpen).to.equal(false)
    cleanup(c)
  })

  it('open() with an empty editor does not open', () => {
    const c = makeCompletion('')
    c.completion.open()
    expect(c.completion.isOpen).to.equal(false)
    cleanup(c)
  })

  it('Tab on open dropdown accepts the highlighted match (calls onAccept)', () => {
    let accepted = null
    const editor = document.createElement('div')
    editor.contentEditable = 'true'
    editor.textContent = 'osc().k'
    document.body.append(editor)
    const dropdown = document.createElement('div')
    dropdown.setAttribute('role', 'listbox')
    document.body.append(dropdown)
    const completion = new Completion(editor, dropdown, word => {
      accepted = word
    })
    completion.open()
    expect(completion.isOpen).to.equal(true)
    const consumed = completion.onKeydown({ key: 'Tab', preventDefault: () => {} })
    expect(consumed).to.equal(true)
    expect(completion.isOpen).to.equal(false)
    expect(accepted).to.equal('kaleid')
    cleanup({ editor, dropdown })
  })

  it('Esc closes the dropdown', () => {
    const c = makeCompletion('osc().k')
    c.completion.open()
    expect(c.completion.isOpen).to.equal(true)
    const consumed = c.completion.onKeydown({ key: 'Escape', preventDefault: () => {} })
    expect(consumed).to.equal(true)
    expect(c.completion.isOpen).to.equal(false)
    cleanup(c)
  })

  it('ArrowDown / ArrowUp move the highlight', () => {
    const c = makeCompletion('m')
    c.completion.open()
    // 'm' matches: mask, modulate, modulateKaleid, modulateRepeat, ...
    expect(c.completion.isOpen).to.equal(true)
    const first = c.dropdown.querySelector('.is-highlighted').textContent
    c.completion.onKeydown({ key: 'ArrowDown', preventDefault: () => {} })
    const second = c.dropdown.querySelector('.is-highlighted').textContent
    expect(second).to.not.equal(first)
    c.completion.onKeydown({ key: 'ArrowUp', preventDefault: () => {} })
    const back = c.dropdown.querySelector('.is-highlighted').textContent
    expect(back).to.equal(first)
    cleanup(c)
  })
})
