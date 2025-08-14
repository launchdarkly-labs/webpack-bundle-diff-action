const path = require('path');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  mode: 'production',
  entry: {
    main: './test-project/src/index.js',
    vendor: './test-project/src/vendor.js',
  },
  output: {
    path: path.resolve(__dirname, 'test-dist'),
    filename: '[name].[contenthash].js',
    clean: true,
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          enforce: true,
        },
      },
    },
  },
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'json',
      openAnalyzer: false,
      generateStatsFile: true,
      statsOptions: { source: false },
      reportFilename: 'webpack-bundle-analyzer-report.json',
      statsFilename: 'webpack-stats.json',
    }),
  ],
  resolve: {
    extensions: ['.js', '.json'],
  },
};