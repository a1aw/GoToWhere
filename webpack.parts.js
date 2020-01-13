const HtmlWebpackPlugin = require("html-webpack-plugin");

exports.devServer = ({ host, port } = {}) => ({
    devServer: {
        stats: "errors-only",
        host, // Defaults to `localhost`
        port, // Defaults to 8080
        open: true,
        overlay: true,
    }
});

exports.page = ({
  path = "",
    template = require.resolve(
        "html-webpack-plugin/default_index.ejs"
    ),
    title,
} = {}) => ({
        plugins: [
            new HtmlWebpackPlugin({
                filename: `${path && path + "/"}index.html`,
                template,
                title,
            }),
        ],
    });