/**
 * The public event names the shell dispatches and the runtime reacts to.
 * Kept as constants so the DOM-only shell never spells a vocabulary-bearing
 * string inline — the names themselves are part of the public contract.
 */

export const EVENTS = {
  resize: 'hydra-element-resize',
  contextLost: 'hydra-context-lost',
} as const
