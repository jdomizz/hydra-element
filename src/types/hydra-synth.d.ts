/**
 * `hydra-synth` ships no type declarations; keep the import untyped so the
 * DSL engine surface stays unchecked while the rest of the element is checked.
 */
declare module 'hydra-synth' {
  const Hydra: new (options?: object) => unknown
  export default Hydra
}
