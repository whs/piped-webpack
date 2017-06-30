const path = require('path');
const through2 = require('through2');
const MemoryFileSystem = require('memory-fs');
const clone = require('lodash.clone');
const webpack = require('webpack');
const gutil = require('gulp-util');

const memoryFsToStream = require('./lib/memoryFsToStream');

const PLUGIN_NAME = 'gulp-webpack';

class WebpackPlugin {
	constructor(config){
		this.webpack = webpack;
		this.MemoryFileSystem = MemoryFileSystem;

		// note: these are shallow clone
		// we only clone things that we intend to change
		this.config = clone(config);
		this.config.entry = clone(this.config.entry);
	}

	run(){
		let self = this;
		if(!this.config.entry){
			this.config.entry = {};
		}

		return through2.obj(function(file, encoding, callback){
			self.stream = this;
			let chunkName = self.generateChunkName(file);
			self.config.entry[chunkName] = [file.path];
			callback();
		}, function(cb){
			self.stream = this;
			self.prepareConfig();
			let compiler = self.getCompiler();

			let compile_method = compiler.run.bind(compiler);
			if(self.config.watch){
				gutil.log('Webpack is watching');
				compile_method = (compiler_cb) => compiler.watch(self.config.watchOptions, compiler_cb);
				cb = () => {}; // eslint-disable-line no-param-reassign
			}

			compile_method((err, stats) => {
				if(err){
					self.error(err);

					return cb();
				}
				const info = stats.toJson();
				if(stats.hasErrors()){
					self.error(info.errors);

					return cb();
				}
				if(stats.hasWarnings()){
					self.warning(info.warnings);
				}
				gutil.log(stats.toString({
					colors: gutil.colors.supportsColor,
				}));

				self.fsToStream(compiler.outputFileSystem, self.stream);
				cb();
			});
		});
	}

	error(err){
		let logger = (message) => {
			gutil.log(gutil.colors.red(message));
		};

		if(this.stream){
			logger = (message) => {
				this.stream.emit('error', new gutil.PluginError(PLUGIN_NAME, message));
			};
		}

		logger(gutil.colors.red(err.stack || err));
		if(err.details){
			logger(gutil.colors.red(err.details));
		}
	}

	warning(warn){
		gutil.log(gutil.colors.yellow(warn));
	}

	generateChunkName(file){
		// seems that vinyl-fs doesn't set file.stem for us
		let filename = path.basename(file.path);

		return gutil.replaceExtension(filename, '');
	}

	prepareConfig(){
		return this.config;
	}

	getCompiler(){
		let compiler = this.webpack(this.config);
		compiler.outputFileSystem = this.prepareFileSystem();

		return compiler;
	}

	prepareFileSystem(){
		return new this.MemoryFileSystem();
	}

	fsToStream(fs, stream){
		memoryFsToStream(fs, stream);
	}
}

function factory(config, Plugin=WebpackPlugin){
	let plugin = new Plugin(config);

	return plugin.run();
}

module.exports = factory;
module.exports.WebpackPlugin = WebpackPlugin;
