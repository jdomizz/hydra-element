const CopyPlugin = require("copy-webpack-plugin");

module.exports = function (env, { mode }) {
  const production = mode === 'production';
  return {
    mode: production ? 'production' : 'development',
    entry: './hydra-element.js',
    output: {
      filename: 'hydra-element.js',
      chunkFormat: 'module',
      clean: true,
    },
    resolve: {
      extensions: ['.js'],
      modules: ['src', 'node_modules']
    },
    plugins: production ? [
      new CopyPlugin({
        patterns: [
          { from: "LICENSE" },
          { from: "custom-elements.json" },
        ],
      })
    ] : [],
    devServer: {
      port: 9000,
      historyApiFallback: true,
      writeToDisk: true,
      open: false,
      lazy: false,
    }
  }
}