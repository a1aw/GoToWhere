const path = require("path");
const merge = require("webpack-merge");
const common = require('./webpack.common.js');
const parts = require("./webpack.parts");

module.exports = merge([
    common,
    {
        entry: {
            tests: './tests',
        }
    },
    parts.devServer(),
    parts.page({
        title: "Mocha Tests",
    }),
]);