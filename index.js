const WebpackPlugin = require('./lib/webpackPlugin');
const gutil = require('gulp-util');

function factory(config, Plugin=WebpackPlugin){
	// ease migration from webpack-stream
	if(Plugin.Compiler && Plugin.optimize){
		throw new gutil.PluginError('piped-webpack', 'Second argument should not be a webpack instance');
	}

	let plugin = new Plugin(config);

	return plugin.run();
}

module.exports = factory;
