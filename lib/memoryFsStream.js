const File = require('vinyl');
const {Readable} = require('stream');

class MemoryFsStream extends Readable {
	constructor(fs, root=process.cwd()){
		super({objectMode: true});
		this.fs = fs;
		this.root = root.replace(/^\//, '')
			.replace(/\/$/, '');
	}

	_read(){
		// traverse to root first
		let cwd = this.fs.data;
		let rootSegments = this.root.split('/');
		for(let segment of rootSegments){
			if(segment === ''){
				continue;
			}
			cwd = cwd[segment];
		}

		this._pumpDir(cwd, '');
		this.push(null);
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
