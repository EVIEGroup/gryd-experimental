'use strict';
const path = require('path');
const webpack = require('webpack');
const fs = require("fs");
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    // devtool: 'inline-source-map',
    watchOptions: {
       aggregateTimeout: 1000,
       poll: 1000,
       ignored: /node_modules/,
    },
    devServer: {
        host: '0.0.0.0',//your ip address
        https: false,
        allowedHosts: 'all',
    },
    target: ["web"],
    devtool: false,
	entry: './src/web.ts',
    mode: 'development',
	output: {
		filename: 'main.js',
		path: path.resolve(__dirname, 'public'),
        libraryTarget: 'umd'
	},
    // .... other webpack, like output, etc.
    optimization: {
        minimize: false
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                exclude: /node_modules/
            }
        ],
    },
    stats: {
        errorDetails: true
    },
    resolve: {
        extensions: [ '.ts', '.tsx', '.js' ],
        fallback: {
          "fs": require.resolve('browserify-fs'),
          "path": require.resolve('path-browserify'),
          "os": require.resolve('os-browserify'),
          "assert": require.resolve('assert-browserify'),
          "url": require.resolve('url'),
          "crypto": require.resolve('crypto-browserify'),
          "stream": require.resolve('stream-browserify'),
          "util": require.resolve("util/"),
          "process": require.resolve("process/"),
          "buffer": require.resolve('buffer'),
        },
        alias: {
            process: 'process/browser',
        }
    },
    plugins: [
        new webpack.ProvidePlugin({
            Buffer: ["buffer", "Buffer"],
            process: 'process/browser',
        }),
        new HtmlWebpackPlugin({}),
        new webpack.DefinePlugin({
          BUNDLE_VERSION: JSON.stringify(require("./package.json").version),
          BUNDLE_LIBRARY: (() => {
            const libDir = path.join(__dirname, "node_modules", "assemblyscript", "std", "assembly");
            const libFiles = require("glob").sync("**/!(*.d).ts", { cwd: libDir });
            const lib = {};
            libFiles.forEach(file => lib[file.replace(/\.ts$/, "")] = bundleFile(path.join(libDir, file)));
            return lib;
          })(),
          BUNDLE_DEFINITIONS: {
            "assembly": bundleFile(path.join(__dirname, "node_modules", "assemblyscript", "std", "assembly", "index.d.ts")),
            "portable": bundleFile(path.join(__dirname, "node_modules", "assemblyscript", "std", "portable", "index.d.ts"))
          },
          __dirname: JSON.stringify(".")
        }),
    ],
};

function bundleFile(filename) {
    return JSON.stringify(fs.readFileSync(filename, { encoding: "utf8" }).replace(/\r\n/g, "\n"));
}
  