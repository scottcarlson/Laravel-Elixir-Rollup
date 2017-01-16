import fs from 'fs';
import gulp from 'gulp';
import {extend} from 'underscore';
import Elixir from 'laravel-elixir';

let buffer;
let rollup;
let buble;
let source;
let replace;
let commonjs;
let nodeResolve;
let multiEntry;

class RollupTask extends Elixir.Task {

    /**
     * Create a new RollupTask instance.
     *
     * @param  {string}      name
     * @param  {GulpPaths}   paths
     * @param  {object|null} options
     */
    constructor(name, paths, options = {}) {
        super(name, null, paths);

        this.options = options;

        if (fs.existsSync('rollup.config.js')) {
            this.rollupConfig = require(process.cwd()+'/rollup.config.js');
        }
    }

    /**
     * Build up the Gulp task.
     */
    gulpTask() {
        return this.rollup()
            .on('error', this.onError())
            .pipe(source(this.output.name))
            .pipe(buffer())
            .pipe(this.initSourceMaps({ loadMaps: true, largeFile: true }))
            .pipe(this.minify())
            .on('error', this.onError())
            .pipe(this.writeSourceMaps())
            .pipe(this.saveAs(gulp));
    }


    /**
     * Register file watchers.
     */
    registerWatchers() {
        this.watch(this.src.baseDir + '/**/*.+(js|vue|jsx)')
            .ignore(this.output.path);
    }


    /**
     * Lazy load the task dependencies.
     */
    loadDependencies() {
        buffer = require('vinyl-buffer');
        rollup = require('rollup-stream');
        buble = require('rollup-plugin-buble');
        source = require('vinyl-source-stream');
        replace = require('rollup-plugin-replace');
        commonjs = require('rollup-plugin-commonjs');
        nodeResolve = require('rollup-plugin-node-resolve');
        multiEntry = require('rollup-plugin-multi-entry');
    }


    /**
     * Run the files through Rollup.
     */
    rollup() {
        this.recordStep('Transforming ES2015 to ES5');
        this.recordStep('Bundling');

        // concat plugin array with user defined plugins before extending options
        // underscore extend doesn't concat nested arrays
        var plugins = [
            nodeResolve({ browser: true }),
            commonjs({
                include: [
                    'node_modules/**',
                    this.src.baseDir + '/**'
                ]
            }),
            replace({
                'process.env.NODE_ENV': JSON.stringify(Elixir.inProduction)
            }),
            buble(),
            multiEntry()
        ];

        plugins = plugins.concat(this.options.plugins || [])
        delete this.options.plugins

        return rollup(extend({
            entry: this.src.path,
            sourceMap: true,
            format: 'iife',
            moduleName: 'LaravelElixirBundle',
            plugins: plugins
        }, this.rollupConfig, this.options))
    }
}

export default RollupTask;
