const merge = require('webpack-merge');
const build = require('./webpack.build.js');

module.exports = merge(build, {
    mode: 'development',
    devtool: 'inline-source-map',
    devServer: {
        contentBase: './dist'
    }
});