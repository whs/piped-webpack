const path = require('path');
const through2 = require('through2');
const MemoryFileSystem = require('memory-fs');
const clone = require('lodash.clone');
const webpack = require('webpack');
const gutil = require('gulp-util');

const MemoryFsStream = require('./memoryFsStream');

class WebpackPlugin {
	constructor(config){
		this.name = 'piped-webpack';
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
			self.processFile(file);
			callback();
		}, function(cb){
			self.stream = this;
			self.compile(cb);
		});
	}

	processFile(file){
		let chunkName = this.generateChunkName(file);
		this.config.entry[chunkName] = [file.path];
	}

	compile(cb){
		this.prepareConfig();
		this.compiler = this.getCompiler();

		let compile_method = this.compiler.run.bind(this.compiler);
		if(this.config.watch){
			gutil.log('Webpack is watching');
			compile_method = (compiler_cb) => this.compiler.watch(self.config.watchOptions, compiler_cb);
			cb = () => {}; // eslint-disable-line no-param-reassign
		}

		compile_method((err, stats) => {
			this.compileCallback(err, stats, cb);
		});
	}

	compileCallback(err, stats, cb){
		// error handling
		if(err){
			this.error(err);

			return cb();
		}
		const info = stats.toJson();
		if(stats.hasErrors()){
			this.error(info.errors);

			return cb();
		}
		if(stats.hasWarnings()){
			this.warning(info.warnings);
		}

		this.printStats(stats);

		// dump memory-fs to stream
		this.fsToStream(this.compiler.outputFileSystem, this.stream, cb);
	}

	error(err){
		let logger = (message) => {
			gutil.log(gutil.colors.red(message));
		};

		if(this.stream){
			logger = (message) => {
				this.stream.emit('error', new gutil.PluginError(this.name, message));
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

	printStats(stats){
		let statsOptions = {
			colors: gutil.colors.supportsColor,
		};

		if(typeof this.config.stats === 'object'){
			Object.assign(statsOptions, this.config.stats);
		}else if(this.config.stats){
			statsOptions = this.config.stats;
		}

		let statsString = stats.toString(statsOptions);
		if(statsString){
			gutil.log(statsString);
		}
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

	fsToStream(fs, stream, cb){
		let fsStream = new MemoryFsStream(fs);
		fsStream.on('data', (data) => {
			stream.push(data);
		});
		fsStream.on('end', cb);
	}
}

module.exports = WebpackPlugin;
