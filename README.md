# Piped Webpack

[webpack](https://webpack.js.org) as a [Gulp](http://gulpjs.com) plugin.

## Why?
### Why Gulp?
Webpack already function as a great build tool, and in many cases you don't even need Gulp.

Combining Gulp with webpack, however, allow you to do many more things without writing webpack plugins:

- Separate CSS workflow that does not go into the bundle (eg. for non-SPA apps)
- Mangle other type of assets with the vast collection of Gulp plugins
- Run webpack output through Gulp plugins

### Why not webpack-stream?
At [TipMe](https://tipme.in.th) we started out with [webpack-stream](https://github.com/shama/webpack-stream). However, we found that it doesn't work with DllPlugin ([#149](https://github.com/shama/webpack-stream/issues/149)). So we set out to create a new implementation:

- Webpack is now on `peerDependencies`, so you can use any version you wanted without passing the instance.
- Dump memory-fs to stream directly, so all output files will always be discovered
- No unnecessary config mangling:
  - We don't set `output` for you, make sure that your `output.path` is not set or set to `process.cwd()`
  - We don't add any plugins for you (webpack-stream can add `ProgressPlugin`). If you want any plugin you can add them manually.
- Extensible class-based design

The reason we name this as piped-webpack is because webpack-stream also appear as [gulp-webpack](https://www.npmjs.com/package/gulp-webpack) on npm.

Migrating from webpack-stream is simple: just change your `require` to `piped-webpack` and, if you're passing webpack instance, remove it. Also remove callback argument if you're using it. We'll implement something later.

## Usage

Pipe your entrypoint files to piped-webpack:

```js
const gulp = require('gulp');
const pipedWebpack = require('piped-webpack');

gulp.task('webpack', function(){
	return gulp.src(['js/entry1.js', 'js/entry2.js'])
		.pipe(pipedWebpack({
			// your webpack config
		}))
		.pipe(gulp.dest(__dirname + '/static/'));
});
```

In the above case, the webpack config can omit the `entry` object.

If you already have `entry` set, you can pipe an empty stream to pipedWebpack:

```js
gulp.src([])
	.pipe(pipedWebpack({
		entry: {
			// your entrypoints
		},
		// your webpack config
	}))
	.pipe(gulp.dest(__dirname + '/static/'));
```

Note that due to webpack's limitation we don't actually use the files from stream, only path. Therefore, don't pipe anything else but `gulp.src` into this plugin.

## Tips
### Submit source maps to Sentry
Here's how we submit source maps to Sentry, and removing it from production servers

```js
const gulp = require('gulp');
const filter = require('gulp-filter');
const sentryRelease = require('gulp-sentry-release');
const merge = require('merge-stream');
const pipedWebpack = require('piped-webpack');

const SENTRY_URL = 'https://app.getsentry.com/api/0/projects/mycompany/myapp/';
const SENTRY_API_KEY = 'apikeygoeshere'; // see gulp-sentry-release docs on how to get this key

const webpackConfig = {
	// ...
	// sentry requires that your source map have a visible comment
	devtool: 'source-map',
};

gulp.task('webpack', function(){
	// filter out source maps
	let mapFilter = filter(['**', '!**/*.map'], {restore: true, passthrough: false});

	let codeStream = gulp.src(['*/js/*.js', '!static/**'])
		.pipe(pipedWebpack(webpackConfig))
		.pipe(mapFilter) // remove all map files
		.pipe(gulp.dest(__dirname + '/static/'));

	let mapStream = mapFilter.restore
		.pipe(sentryRelease({
			API_URL: SENTRY_URL,
			API_KEY: SENTRY_API_KEY,
			DOMAIN: '~',
			version: '1.0.0', // you can use git-rev to update this automatically
		}).release());

	return merge(codeStream, mapStream);
});
```

## License
piped-webpack is licensed under the [MIT License](LICENSE)
