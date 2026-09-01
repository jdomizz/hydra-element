/**
 * <extensions-panel> — the puzzle-piece panel from the ojack editor,
 * reimplemented as a custom element. Two <details> groups (Extensions +
 * External libraries) hold the rows from `EXTENSIONS`. Click anywhere on a
 * row, or press Enter on a focused row, and the panel dispatches
 * `preset-change` with `{ slot, code, name }` — the same event the existing
 * <preset-selector> dispatches (the editor / element already listen for it).
 *
 * Property:
 *   entries — array of `ExtensionEntry` (defaults to the snapshot from
 *             `./extensions.js`). Reassigning rebuilds the rows; the current
 *             selection is lost (consistent with <preset-selector>).
 *   slot    — current slot index (0..3). Updated by `target-change` on
 *             document, just like the preset selector. The `slot` rides on
 *             the dispatched `preset-change` detail so the editor knows
 *             which cell to apply the demo to.
 *
 * Events:
 *   preset-change — detail: `{ slot, code, name }`. Bubbling + composed.
 *                   Mirrors the <preset-selector> event shape with `name` as
 *                   an extra field; consumers that only look at `slot` and
 *                   `code` work unchanged.
 *
 * The row's compat badge is a `<span>` with a `title` attribute (the one-line
 * hover explanation per spec §2.2). Color comes from the existing log-color
 * tokens (`--hydra-log-success` / `--hydra-log-warn` / `--hydra-log-error`)
 * — no new design surface.
 */
const styles = new CSSStyleSheet()
styles.replaceSync(`
  :host {
    display: block;
  }
  h2 {
    margin: 0 0 var(--hydra-space-s) 0;
    font-size: var(--hydra-text-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--hydra-fg-muted);
  }
  details {
    margin-bottom: var(--hydra-space-s);
  }
  details > summary {
    cursor: pointer;
    padding: var(--hydra-space-xs) var(--hydra-space-s);
    background: var(--hydra-bg-input);
    border: 1px solid var(--hydra-border);
    border-radius: var(--hydra-radius-s);
    font-size: var(--hydra-text-s);
    color: var(--hydra-fg);
    list-style: none;
    transition: border-color var(--hydra-duration-fast) var(--hydra-easing);
  }
  details > summary::-webkit-details-marker { display: none; }
  details > summary::before {
    content: "▸ ";
    color: var(--hydra-fg-muted);
    font-size: var(--hydra-text-xs);
  }
  details[open] > summary::before { content: "▾ "; }
  details > summary:hover {
    border-color: var(--hydra-border-strong);
  }
  details > summary:focus-visible {
    outline: 2px solid var(--hydra-accent);
    outline-offset: 1px;
  }
  .list {
    margin-top: var(--hydra-space-xs);
    display: flex;
    flex-direction: column;
    gap: var(--hydra-space-xs);
  }
  .row {
    display: flex;
    flex-direction: column;
    gap: var(--hydra-space-xs);
    padding: var(--hydra-space-xs) var(--hydra-space-s);
    background: var(--hydra-bg-input);
    border: 1px solid var(--hydra-border);
    border-radius: var(--hydra-radius-s);
    cursor: pointer;
    transition:
      border-color var(--hydra-duration-fast) var(--hydra-easing),
      background-color var(--hydra-duration-fast) var(--hydra-easing);
  }
  .row:hover,
  .row:focus-visible {
    border-color: var(--hydra-accent);
    background: var(--hydra-bg-hover);
    outline: none;
  }
  .row-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--hydra-space-s);
  }
  .row-name {
    font-size: var(--hydra-text-s);
    font-weight: 700;
    color: var(--hydra-fg);
  }
  .row-desc {
    font-size: var(--hydra-text-xs);
    color: var(--hydra-fg-muted);
    line-height: 1.4;
  }
  .row-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--hydra-space-xs);
    align-items: center;
  }
  .chip {
    display: inline-block;
    padding: 1px var(--hydra-space-xs);
    font-size: var(--hydra-text-xs);
    background: var(--hydra-bg-elevated);
    border: 1px solid var(--hydra-border);
    border-radius: var(--hydra-radius-s);
    color: var(--hydra-fg-muted);
    line-height: 1.4;
  }
  .badge {
    display: inline-block;
    padding: 1px var(--hydra-space-xs);
    font-size: var(--hydra-text-xs);
    border-radius: var(--hydra-radius-s);
    line-height: 1.4;
    font-weight: 700;
    border: 1px solid;
    cursor: help;
  }
  .badge--works {
    color: var(--hydra-log-success);
    border-color: var(--hydra-log-success);
  }
  .badge--works-with-notes {
    color: var(--hydra-log-warn);
    border-color: var(--hydra-log-warn);
  }
  .badge--not-yet {
    color: var(--hydra-log-error);
    border-color: var(--hydra-log-error);
  }
`)

const COMPAT_LABEL = {
  works: 'works',
  'works-with-notes': 'works (notes)',
  'not-yet': 'not yet',
}

class ExtensionsPanel extends HTMLElement {
  #entries = []
  #rendered = false
  #slot = 0
  #detailsEls = []

  #onTargetChange = e => {
    const { index } = e.detail || {}
    if (typeof index === 'number') this.#slot = index
  }

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.shadowRoot.adoptedStyleSheets = [styles]
    this.shadowRoot.innerHTML = `
      <h2>Extensions &amp; Libraries</h2>
      <div data-groups></div>
    `
  }

  async connectedCallback() {
    document.addEventListener('target-change', this.#onTargetChange)
    if (!this.#rendered) {
      // Lazy-load the catalog so the panel is self-mounting — the
      // playground orchestrator (main.js) doesn't wire it in this wave
      // (the orchestrator refactor is the audit wave's job). When the
      // orchestrator does wire `panel.entries = EXTENSIONS` later, it
      // overrides this default; the import resolves to the same module
      // instance either way (ESM module cache).
      if (this.#entries.length === 0) {
        const { EXTENSIONS } = await import('../extensions.js')
        this.entries = EXTENSIONS
      }
    }
  }

  disconnectedCallback() {
    document.removeEventListener('target-change', this.#onTargetChange)
  }

  get entries() {
    return this.#entries
  }

  set entries(list) {
    this.#entries = Array.isArray(list) ? list : []
    this.#rendered = true
    this.#render()
  }

  get slot() {
    return this.#slot
  }

  set slot(n) {
    const next = Math.max(0, Math.floor(Number(n)) || 0)
    this.#slot = next
  }

  #render() {
    const groupsHost = this.shadowRoot.querySelector('[data-groups]')
    groupsHost.replaceChildren()
    this.#detailsEls = []

    const groups = [
      { key: 'extension', label: 'Extensions', open: true },
      { key: 'library', label: 'External libraries', open: false },
    ]

    for (const { key, label, open } of groups) {
      const items = this.#entries.filter(e => e.category === key)
      if (items.length === 0) continue

      const details = document.createElement('details')
      if (open) details.open = true
      const summary = document.createElement('summary')
      summary.textContent = `${label} (${items.length})`
      details.append(summary)

      const list = document.createElement('div')
      list.className = 'list'
      for (const entry of items) {
        list.append(this.#buildRow(entry))
      }
      details.append(list)

      groupsHost.append(details)
      this.#detailsEls.push(details)
    }
  }

  #buildRow(entry) {
    const row = document.createElement('div')
    row.className = 'row'
    row.tabIndex = 0
    row.setAttribute('role', 'button')
    row.setAttribute(
      'aria-label',
      `Load ${entry.name} into the active cell. ${entry.compatNote || COMPAT_LABEL[entry.compat] || ''}`
    )
    row.dataset.name = entry.name

    const head = document.createElement('div')
    head.className = 'row-head'

    const nameEl = document.createElement('span')
    nameEl.className = 'row-name'
    nameEl.textContent = entry.name
    head.append(nameEl)

    const badge = document.createElement('span')
    badge.className = `badge badge--${entry.compat}`
    badge.textContent = COMPAT_LABEL[entry.compat] || entry.compat
    badge.title = entry.compatNote || COMPAT_LABEL[entry.compat] || ''
    head.append(badge)

    const desc = document.createElement('div')
    desc.className = 'row-desc'
    desc.textContent = entry.description || ''

    const meta = document.createElement('div')
    meta.className = 'row-meta'

    const authorChip = document.createElement('span')
    authorChip.className = 'chip'
    authorChip.textContent = entry.author
    meta.append(authorChip)

    const licenseChip = document.createElement('span')
    licenseChip.className = 'chip'
    licenseChip.textContent = entry.license
    meta.append(licenseChip)

    if (entry.www || entry.documentation) {
      const link = document.createElement('a')
      link.className = 'chip'
      link.href = entry.www || entry.documentation
      link.target = '_blank'
      link.rel = 'noopener'
      link.textContent = '↗'
      link.title = entry.www || entry.documentation
      link.addEventListener('click', e => e.stopPropagation())
      meta.append(link)
    }

    row.append(head, desc, meta)

    row.addEventListener('click', () => this.#dispatch(entry))
    row.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        this.#dispatch(entry)
      }
    })

    return row
  }

  #dispatch(entry) {
    this.dispatchEvent(
      new CustomEvent('preset-change', {
        detail: { slot: this.#slot, code: entry.code, name: entry.name },
        bubbles: true,
        composed: true,
      })
    )
  }
}

customElements.define('extensions-panel', ExtensionsPanel)
