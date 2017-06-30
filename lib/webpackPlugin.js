const path = require('path');
const {Writable} = require('readable-stream');
const duplexify = require('duplexify');
const MemoryFileSystem = require('memory-fs');
const clone = require('lodash.clone');
const webpack = require('webpack');
const gutil = require('gulp-util');

const MemoryFsStream = require('./memoryFsStream');

class WebpackWritableStream extends Writable {
	constructor(plugin){
		super({objectMode: true});
		this.plugin = plugin;
	}

	_write(chunk, encoding, cb){
		this.plugin.processFile(chunk);
		cb();
	}

	_final(cb){
		this.plugin.compile();
		cb();
	}
}

class WebpackPlugin {
	constructor(config){
		this.name = 'piped-webpack';
		this.webpack = webpack;
		this.MemoryFileSystem = MemoryFileSystem;
		this.WritableStream = WebpackWritableStream;

		// note: these are shallow clone
		// we only clone things that we intend to change
		this.config = clone(config);
		this.config.entry = clone(this.config.entry);
	}

	run(){
		if(!this.config.entry){
			this.config.entry = {};
		}

		this.writableStream = new this.WritableStream(this);
		this.outputStream = duplexify.obj(this.writableStream);

		return this.outputStream;
	}

	processFile(file){
		let chunkName = this.generateChunkName(file);
		this.config.entry[chunkName] = [file.path];
	}

	compile(){
		this.prepareConfig();
		this.compiler = this.getCompiler();

		let compile_method = this.compiler.run.bind(this.compiler);
		if(this.config.watch){
			gutil.log('Webpack is watching');
			compile_method = (compiler_cb) => this.compiler.watch(this.config.watchOptions, compiler_cb);
		}

		compile_method((err, stats) => {
			this.compileCallback(err, stats);
		});
	}

	compileCallback(err, stats){
		// error handling
		if(err){
			this.error(err);

			return;
		}
		const info = stats.toJson();
		if(stats.hasErrors()){
			for(let item of info.errors){
				this.error(item);
			}

			return;
		}
		if(stats.hasWarnings()){
			for(let item of info.errors){
				this.warning(item);
			}
		}

		this.printStats(stats);

		// dump memory-fs to stream
		this.fsToStream(this.compiler.outputFileSystem);
	}

	error(err){
		let logger;

		if(this.outputStream){
			logger = (message) => {
				this.outputStream.emit('error', new gutil.PluginError(this.name, message));
			};
		}else{
			logger = (message) => {
				gutil.log(gutil.colors.red(message));
			};
		}

		logger(err.stack || err);
		if(err.details){
			logger(err.details);
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

	fsToStream(fs){
		let fsStream = new MemoryFsStream(fs, {
			close: !this.config.watch,
		});
		this.outputStream.setReadable(fsStream);
	}
}

module.exports = WebpackPlugin;
