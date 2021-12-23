'use strict';
const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    // devtool: 'inline-source-map',
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
        ]
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
        //   "assemblyscript/cli/asc": require.resolve("assemblyscript/dist/asc")
        },
        alias: {
            process: 'process/browser',
            // "assemblyscript": "assemblyscript/dist/asc",
            // "assemblyscript/cli/asc": "assemblyscript/dist/asc",
            // "as-bind/dist/as-bind.cjs.js": "as-bind/dist/as-bind.iife.js"
        }
    },
    plugins: [
        new webpack.ProvidePlugin({
            Buffer: ["buffer", "Buffer"],
            process: 'process/browser',
        }),
        new HtmlWebpackPlugin({
            
        }),
    ],
};