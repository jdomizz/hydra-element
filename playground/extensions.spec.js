/**
 * Catalog + panel tests for the playground extensions feature.
 *
 * Covers:
 *   - Catalog data shape: every entry has name/description/load/code/
 *     category/license; 29 entries total; categories partition correctly.
 *   - <extensions-panel> renders both groups (Extensions + External libraries).
 *   - Clicking a row dispatches `preset-change` with { slot, code } that
 *     match the entry's data (and includes the entry's name as a bonus).
 *   - Keyboard Enter on a focused row dispatches the same event.
 *   - Compat badges render for every entry with the correct label.
 *
 * Per AGENTS.md: chai assertions on primitives only — never sinon-chai
 * spy assertions (a failing sinon-chai assertion hangs the WTR session).
 * We assert on `ev.detail.code` / `ev.detail.slot` / `ev.detail.name`
 * strings + the dispatched event's `bubbles`/`composed` booleans.
 */
import { html, fixture, oneEvent, expect } from '@open-wc/testing'
import { EXTENSIONS } from './extensions.js'
import './components/extensions-panel.js'

describe('playground extensions catalog', () => {
  it('exports 29 entries (23 extensions + 6 external libraries)', () => {
    expect(EXTENSIONS.length, 'catalog must have 29 entries').to.equal(29)
    const byCat = EXTENSIONS.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + 1
      return acc
    }, {})
    expect(byCat.extension, 'extensions bucket').to.equal(23)
    expect(byCat.library, 'external-libraries bucket').to.equal(6)
  })

  it('every entry carries the required fields', () => {
    for (const e of EXTENSIONS) {
      expect(e.name, `name (${e && e.name})`).to.be.a('string').and.not.empty
      expect(e.description, `description (${e.name})`).to.be.a('string').and.not.empty
      expect(e.load, `load (${e.name})`).to.be.a('string')
      expect(e.code, `code (${e.name})`).to.be.a('string').and.not.empty
      expect(e.category, `category (${e.name})`).to.be.oneOf(['extension', 'library'])
      expect(e.license, `license (${e.name})`).to.be.a('string').and.not.empty
      expect(['works', 'works-with-notes', 'not-yet'], `compat (${e.name})`).to.include(e.compat)
    }
  })

  it('no duplicate names within the catalog', () => {
    const names = EXTENSIONS.map(e => e.name)
    expect(new Set(names).size, 'unique names').to.equal(names.length)
  })
})

describe('<extensions-panel>', () => {
  it('renders both Extensions and External libraries groups', async () => {
    const panel = await fixture(html`<extensions-panel></extensions-panel>`)
    // Allow the lazy import + render to settle (connectedCallback awaits).
    await new Promise(r => setTimeout(r, 0))

    const detailsEls = panel.shadowRoot.querySelectorAll('details')
    expect(detailsEls.length, 'two <details> groups').to.equal(2)

    const summaries = [...detailsEls].map(d => d.querySelector('summary').textContent)
    expect(summaries[0], 'first group is Extensions, open by default').to.match(/Extensions/)
    expect(detailsEls[0].open, 'Extensions details is open by default').to.equal(true)
    expect(summaries[1], 'second group is External libraries').to.match(/External libraries/)
    expect(detailsEls[1].open, 'External libraries details starts closed').to.equal(false)
  })

  it('renders a row for every catalog entry, with the compat badge', async () => {
    const panel = await fixture(html`<extensions-panel></extensions-panel>`)
    await new Promise(r => setTimeout(r, 0))

    const rows = panel.shadowRoot.querySelectorAll('.row')
    expect(rows.length, 'one row per catalog entry').to.equal(EXTENSIONS.length)

    const badges = [...panel.shadowRoot.querySelectorAll('.badge')]
    expect(badges.length, 'one badge per row').to.equal(EXTENSIONS.length)
    const badgeClasses = new Set(badges.map(b => b.className))
    // Every entry has one of the three badge variants; expect ≥2 since the
    // catalog ships entries in every compat bucket.
    expect(badgeClasses.size, 'mix of compat states in the catalog').to.be.greaterThan(1)
  })

  it('clicking a row dispatches preset-change with { slot, code, name }', async () => {
    const panel = await fixture(html`<extensions-panel></extensions-panel>`)
    await new Promise(r => setTimeout(r, 0))

    // Target a known entry from the catalog.
    const target = EXTENSIONS.find(e => e.compat === 'works')
    const row = [...panel.shadowRoot.querySelectorAll('.row')].find(
      r => r.dataset.name === target.name
    )
    expect(row, `row for "${target.name}"`).to.exist

    setTimeout(() => row.click())
    const ev = await oneEvent(panel, 'preset-change')

    expect(ev.detail.name, 'detail.name matches the clicked entry').to.equal(target.name)
    expect(ev.detail.code, 'detail.code matches the entry code').to.equal(target.code)
    // slot defaults to 0 (no target-change fired before this point).
    expect(ev.detail.slot, 'detail.slot defaults to 0').to.equal(0)
    expect(ev.bubbles, 'event bubbles (crosses shadow boundaries)').to.equal(true)
    expect(ev.composed, 'event is composed (crosses shadow boundaries)').to.equal(true)
  })

  it('Enter on a focused row dispatches the same event', async () => {
    const panel = await fixture(html`<extensions-panel></extensions-panel>`)
    await new Promise(r => setTimeout(r, 0))

    const target = EXTENSIONS[0]
    const row = [...panel.shadowRoot.querySelectorAll('.row')].find(
      r => r.dataset.name === target.name
    )
    expect(row).to.exist

    setTimeout(() => {
      row.focus()
      row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    const ev = await oneEvent(panel, 'preset-change')

    expect(ev.detail.code).to.equal(target.code)
    expect(ev.detail.name).to.equal(target.name)
  })

  it('reflects target-change slot into the dispatched detail', async () => {
    const panel = await fixture(html`<extensions-panel></extensions-panel>`)
    await new Promise(r => setTimeout(r, 0))

    // Simulate the orchestrator's target-change (cell click).
    document.dispatchEvent(
      new CustomEvent('target-change', {
        detail: { index: 2, element: null, label: '#2' },
        bubbles: true,
        composed: true,
      })
    )
    await new Promise(r => setTimeout(r, 0))

    const row = [...panel.shadowRoot.querySelectorAll('.row')][0]
    setTimeout(() => row.click())
    const ev = await oneEvent(panel, 'preset-change')

    expect(ev.detail.slot, 'slot mirrors target-change.index').to.equal(2)
  })

  it('honors a manually-assigned entries property (orchestrator override path)', async () => {
    const panel = await fixture(html`<extensions-panel></extensions-panel>`)
    await new Promise(r => setTimeout(r, 0))

    const custom = [
      {
        name: 'synthetic entry',
        description: 'one-row catalog for the test',
        author: 'test',
        license: 'MIT',
        thumbnail: '',
        load: '',
        code: 'osc().out()',
        category: 'extension',
        compat: 'works',
      },
    ]
    panel.entries = custom
    const rows = panel.shadowRoot.querySelectorAll('.row')
    expect(rows.length).to.equal(1)
    expect(rows[0].dataset.name).to.equal('synthetic entry')
  })
})
