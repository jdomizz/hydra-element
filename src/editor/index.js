/**
 * Public entry point for `<hydra-editor>`. Side-effect import registers
 * the custom element; the `HydraEditor` class and `DEFAULT_WORDLIST` are
 * exported for consumers who want a local reference (e.g. type the
 * `value` setter, or seed the completion wordlist from a known source).
 *
 * The element itself is registered at module load time (side effect);
 * no named element export — same convention as the main `hydra-element`
 * entry.
 */
import './hydra-grammar.js'
import './editor.js'
import { HydraEditor } from './editor.js'
import { DEFAULT_WORDLIST } from './completion.js'

export { HydraEditor, DEFAULT_WORDLIST }
