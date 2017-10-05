const path = require('path');
const {Readable, Writable} = require('readable-stream');
const duplexify = require('duplexify');
const MemoryFileSystem = require('memory-fs');
const clone = require('lodash.clone');
const webpack = require('webpack');
const gutil = require('gulp-util');
const MemoryFsStream = require('memory-fs-stream');

const outputOptions = require('./outputOptions');

class WebpackWritableStream extends Writable {
	constructor(plugin){
		super({objectMode: true});
		this.plugin = plugin;
	}

	_write(chunk, encoding, cb){
		try{
			this.plugin.processFile(chunk, this);
		}catch(e){
			this.emit('error', e);
		}
		cb();
	}

	_final(cb){
		this.plugin.compile();
		cb();
	}
}

class EmptyStream extends Readable {
	_read(){
		this.emit('end');
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
		this.outputOptions = outputOptions(config.stats);

		if(this.config.additionalEntries){
			this.additionalEntries = this.config.additionalEntries;
			delete this.config.additionalEntries;
		}
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
		if(this.additionalEntries){
			if(Array.isArray(this.additionalEntries)){
				let entries = clone(this.additionalEntries);
				entries.push(file.path);

				this.config.entry[chunkName] = entries;
			}else if(typeof this.additionalEntries === 'function'){
				let entries = this.additionalEntries(file);
				if(!Array.isArray(entries)){
					throw new Error('additionalEntries must return an array. Got: ' + entries);
				}
				entries.push(file.path);

				this.config.entry[chunkName] = entries;
			}else{
				throw new Error('Unsupported additionalEntries data type. Make sure it is array or function');
			}
		}else{
			this.config.entry[chunkName] = [file.path];
		}
	}

	compile(){
		this.prepareConfig();

		if(this.isEmptyEntrypoints()){
			let emptyStream = this.createEmptyStream();
			this.outputStream.setReadable(emptyStream);

			return;
		}

		this.compiler = this.getCompiler();

		let compile_method = this.compiler.run.bind(this.compiler);
		if(this.config.watch){
			gutil.log('Webpack is watching');
			compile_method = (compilerCb) => this.compiler.watch(this.config.watchOptions, compilerCb);
		}

		compile_method((err, stats) => {
			this.compileCallback(err, stats);
		});
	}

	compileCallback(err, stats){
		if(stats.hash === this._lastStatsHash){
			return;
		}
		this._lastStatsHash = stats.hash;

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

		if(this.outputStream && !this.config.watch){
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
		let statsString = stats.toString(this.outputOptions);
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
			root: process.cwd(),
		});
		this.outputStream.setReadable(fsStream);
	}

	isEmptyEntrypoints(){
		if(!this.config.entry){
			return true;
		}

		if(Array.isArray(this.config.entry)){
			return this.config.entry.length === 0;
		}

		return Object.keys(this.config.entry).length === 0;
	}

	createEmptyStream(){
		return new EmptyStream();
	}
}

module.exports = WebpackPlugin;
