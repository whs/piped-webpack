const File = require('vinyl');

function memoryFsToStream(fs, stream, root=process.cwd()){
	// traverse to root first
	let cwd = fs.data;
	let rootSegments = root
		.replace(/^\//, '')
		.replace(/\/$/, '')
		.split('/');
	for(let segment of rootSegments){
		cwd = cwd[segment];
	}

	// pump out files
	_pumpDir(cwd, stream, '');
}

function _pumpDir(dir, stream, path){
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
			stream.push(vinyl);
		}else{
			_pumpDir(contents, stream, `${path}${basename}/`);
		}
	}
}

module.exports = memoryFsToStream;
