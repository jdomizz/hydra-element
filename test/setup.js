const fs = require('fs')

const SOURCE_FILE = './src/hydra-element.js'
const TARGET_FILE = './test/hydra-element.js'

const REGL_LIB = `'regl'`
const REGL_ESM = `'./regl.esm.js'`

const CUSTOM_ELEMENT_DEFINITION = `window.customElements.define('hydra-element', HydraElement)`

try {
  const source = fs.readFileSync(SOURCE_FILE, 'utf8')
  const result = source
    .replace(REGL_LIB, REGL_ESM)
    .concat(CUSTOM_ELEMENT_DEFINITION)
  fs.writeFileSync(TARGET_FILE, result)
} catch (err) {
  console.error(err)
}
