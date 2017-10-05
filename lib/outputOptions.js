// copied from https://github.com/webpack/webpack/blob/master/bin/webpack.js
const gutil = require('gulp-util');
const statsPresetToOptions = require('webpack/lib/Stats.js').presetToOptions;

module.exports = function processOptions(outputOptions){
	/* eslint-disable no-param-reassign */
	if(typeof outputOptions === 'boolean' || typeof outputOptions === 'string'){
		outputOptions = statsPresetToOptions(outputOptions);
	}else if(!outputOptions){
		outputOptions = {};
	}

	outputOptions = Object.create(outputOptions);

	if(typeof outputOptions.colors === 'undefined'){
		outputOptions.colors = gutil.colors.supportsColor;
	}

	if(!outputOptions.json){
		if(typeof outputOptions.cached === 'undefined'){
			outputOptions.cached = false;
		}
		if(typeof outputOptions.cachedAssets === 'undefined'){
			outputOptions.cachedAssets = false;
		}

		if(!outputOptions.exclude){
			outputOptions.exclude = ['node_modules', 'bower_components', 'components'];
		}
	}

	return outputOptions;
};
