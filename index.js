const WebpackPlugin = require('./lib/webpackPlugin');

function factory(config, Plugin=WebpackPlugin){
	let plugin = new Plugin(config);

	return plugin.run();
}

module.exports = factory;
