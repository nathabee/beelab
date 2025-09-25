// webpack.config.js
const webpack = require('webpack');
const defaultConfig = require('@wordpress/scripts/config/webpack.config');
const path = require('path');

module.exports = {
  ...defaultConfig,

  // ✅ externals at top-level (not under 'resolve')
  externals: {
    ...(defaultConfig.externals || {}),
    react: 'React',
    'react-dom': 'ReactDOM',
    'react-dom/client': 'ReactDOM',
    'react/jsx-runtime': 'ReactJSXRuntime',
  },

  resolve: {
    ...defaultConfig.resolve,
    alias: {
      ...defaultConfig.resolve.alias,

      '@components': path.resolve(__dirname, 'src/components'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@context': path.resolve(__dirname, 'src/context'),
      '@api': path.resolve(__dirname, 'src/api'),
      '@mytypes': path.resolve(__dirname, 'src/mytypes'),
      '@app': path.resolve(__dirname, 'src/app'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@assets': path.resolve(__dirname, 'src/assets'),
      '@styles': path.resolve(__dirname, 'src/styles'),

      // point to shared root so you can also use widgets
      '@bee/common': path.resolve(__dirname, '../shared'),
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.png', '.css'],
    modules: [path.resolve(__dirname, 'node_modules'), 'node_modules'],

    
  },
};
