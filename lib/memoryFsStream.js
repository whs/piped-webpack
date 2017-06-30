const File = require('vinyl');
const {Readable} = require('readable-stream');

const noop = function(){};

class MemoryFsStream extends Readable {
	constructor(fs, opts={}){
		super({objectMode: true});
		this.fs = fs;
		this.opts = opts;

		if(!this.opts.root){
			this.opts.root = process.cwd();
		}

		// remove starting and trailing slash
		this.opts.root = this.opts.root.replace(/^\//, '')
			.replace(/\/$/, '');
	}

	_read(){
		// traverse to root first
		let cwd = this.fs.data;
		let rootSegments = this.opts.root.split('/');
		for(let segment of rootSegments){
			if(segment === ''){
				continue;
			}
			cwd = cwd[segment];
		}

		this._pumpDir(cwd, '');

		if(this.opts.close !== false){
			this.push(null);
		}else{
			this._read = noop;
		}
	}

	_pumpDir(dir, path){
		for(let basename in dir){
			if(!Object.prototype.hasOwnProperty.call(dir, basename)){
				continue;
			}

			let contents = dir[basename];
			if(contents instanceof Buffer){
				let vinyl = new File({
					path: path + basename,
					contents,
				});
				this.push(vinyl);
			}else{
				this._pumpDir(contents, `${path}${basename}/`);
			}
		}
	}
}

module.exports = MemoryFsStream;
