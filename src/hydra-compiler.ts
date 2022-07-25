import { createGenerators, defaultGenerators, defaultModifiers, TransformDefinition } from 'hydra-ts';


export class HydraCompiler {
  #sourceTransforms: Record<string, (...args: unknown[]) => any> // FIXME: unknown / any

  constructor(customTransforms?: TransformDefinition[]) {
    const customGenerators = customTransforms
      ? customTransforms.filter((transform) => transform.type === 'src')
      : []
    const customModifiers = customTransforms
      ? customTransforms.filter((transform) => transform.type !== 'src')
      : []
    this.#sourceTransforms = createGenerators({
      generatorTransforms: [...defaultGenerators, ...customGenerators],
      modifierTransforms: [...defaultModifiers, ...customModifiers],
    });
  }

  get sources(): Record<string, (...args: unknown[]) => any> {
    return this.#sourceTransforms
  }

  // TODO: addTransform(transform: TransformDefinition): Record<string, Generator> {}
}