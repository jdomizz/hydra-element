import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

// https://rollupjs.org/guide/en/#configuration-files
export default {
  input: 'test/regl.js',
  output: {
    file: 'test/regl.esm.js',
    format: 'es',
  },
  plugins: [
    nodeResolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs()
  ]
};