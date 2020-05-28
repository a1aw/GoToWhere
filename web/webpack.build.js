const webpack = require("webpack");
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const common = require('./webpack.common.js');
const merge = require('webpack-merge');

const appDirectory = path.resolve(__dirname, '../');

module.exports = merge(common, {
    entry: {
        app: path.resolve(appDirectory, 'index.web.js'),
    },
    output: {
        filename: '[name].[contenthash].js',
        path: path.resolve(__dirname, 'dist'),
        chunkFilename: '[name].[contenthash].js'
    },
    optimization: {
        runtimeChunk: 'single',
        splitChunks: {
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    chunks: 'all'
                }
            }
        }
    },
    plugins: [
        new CleanWebpackPlugin(),
        new CopyWebpackPlugin([
            { from: "src/CNAME", to: "./" }
        ]),
        new HtmlWebpackPlugin({
            title: 'GoToWhere',
            filename: 'index.html',
            template: path.resolve(__dirname, 'index.html'),
            hash: true
        })
    ]
});