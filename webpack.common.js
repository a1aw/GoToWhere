const webpack = require("webpack");
const path = require('path');
const WorkboxPlugin = require('workbox-webpack-plugin');
const pkg = require('./package.json');
const WorkerPlugin = require('worker-plugin');

module.exports = {
    module: {
        rules: [
            {
                test: /\.txt$/i,
                use: 'raw-loader'
            },
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader'
                ]
            },
            {
                test: /\.(png|svg|jpg|gif)$/,
                use: [
                    'file-loader'
                ]
            },
            {
                test: /\.html$/,
                use: [{
                    loader: 'html-loader',
                    options: {
                        minimize: true
                    }
                }]
            }
        ]
    },
    plugins: [
        new webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery',
            i18n: 'jquery-i18n'
        }),
        new webpack.DefinePlugin({
            VERSION: JSON.stringify(pkg.version)
        }),
        new WorkboxPlugin.GenerateSW({
            clientsClaim: true,
            skipWaiting: true
        }),
        new WorkerPlugin()
    ]
};