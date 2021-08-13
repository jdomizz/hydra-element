module.exports = function (env, { mode }) {
  const production = mode === 'production';
  return {
    mode: production ? 'production' : 'development',
    target: 'web',
    entry: './hydra-element.js',
    output: {
      filename: 'hydra-element.js',
      chunkFormat: 'module',
    },
    resolve: {
      extensions: ['.js'],
      modules: ['src', 'node_modules']
    },
    devServer: {
      port: 9000,
      historyApiFallback: true,
      writeToDisk: true,
      open: false,
      lazy: false,
    }
  }
}
