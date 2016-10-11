'use strict';
const webpack = require('webpack');
const path = require('path');

module.exports = {
    entry: [
        './src/cj.js'
    ],
    output: {
        path: './',
        filename: 'cj.js',
        library: 'conjson', 
        libraryTarget: 'umd'
    },
    module: {
        loaders: [{
            test: /\.js$/,
            loader: 'babel-loader',
            exclude: path.resolve(__dirname, 'node_modules')
        }]
    },
    node: {
        global: false
    }
};
