const MemoryFS = require('memory-fs');
const concat = require('concat-stream');
const expect = require('chai').expect;

const MemoryFsStream = require('../lib/memoryFsStream');

describe('MemoryFsStream', function(){
	beforeEach(function(){
		this.fs = new MemoryFS();
		this.fs.writeFileSync('/test.txt', 'a');
		this.fs.mkdirpSync('/path/to/another/');
		this.fs.writeFileSync('/path/to/another/test.txt', 'b');
	});

	it('dump memory-fs to stream', function(cb){
		let stream = concat((buf) => {
			expect(buf.length).to.eql(2);

			expect(buf[0].path).to.eql('test.txt');
			expect(buf[0].contents.toString()).to.eql('a');

			expect(buf[1].path).to.eql('path/to/another/test.txt');
			expect(buf[1].contents.toString()).to.eql('b');

			cb();
		});
		new MemoryFsStream(this.fs, '/')
			.pipe(stream);
	});

	it('can start from subdirectory', function(cb){
		let stream = concat((buf) => {
			expect(buf.length).to.eql(1);

			expect(buf[0].path).to.eql('another/test.txt');
			expect(buf[0].contents.toString()).to.eql('b');
			cb();
		});
		new MemoryFsStream(this.fs, '/path/to/').pipe(stream);
	});
});
