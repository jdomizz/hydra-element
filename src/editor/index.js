/**
 * Public entry point for `<hydra-editor>`. Side-effect import registers
 * the custom element; the `HydraEditor` class, `HYDRA_TOKENS` (canonical
 * data), `hydraGrammar` (derived Prism grammar), and `DEFAULT_WORDLIST`
 * (derived wordlist) are exported for consumers who want a local reference
 * or the data-first Hydra editing vocabulary.
 *
 * The element itself is registered at module load time (side effect);
 * no named element export — same convention as the main `hydra-element`
 * entry.
 */
import './hydra-config.js'
import './editor.js'
import { HydraEditor } from './editor.js'
import { HYDRA_TOKENS, hydraGrammar, DEFAULT_WORDLIST } from './hydra-config.js'

export { HydraEditor, HYDRA_TOKENS, hydraGrammar, DEFAULT_WORDLIST }
