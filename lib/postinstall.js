import fs from 'fs'

const SOURCE_FILE = './node_modules/hydra-synth/src/lib/sandbox.js'

const EVAL_SRC_I = /\seval\(initial\)/g
const EVAL_SRC_II = /\seval\(code\)/g
const FUNCTION_SRC_I = ` new Function(initial)()`
const FUNCTION_SRC_II = ` new Function(code)()`

try {
  const source = fs.readFileSync(SOURCE_FILE, 'utf8')
  const result = source
    .replace(EVAL_SRC_I, FUNCTION_SRC_I)
    .replace(EVAL_SRC_II, FUNCTION_SRC_II)
  fs.writeFileSync(SOURCE_FILE, result)
} catch (err) {
  console.error(err)
}