var gobble = require( 'gobble' );
var babel = require( 'rollup-plugin-babel' );

module.exports = gobble([
	gobble( 'src' ).transform( 'rollup', {
		entry: 'index.js',
		dest: 'rollup-plugin-npm.cjs.js',
		plugins: [ babel() ],
		format: 'cjs',
		external: [ 'path', 'fs', 'builtin-modules' ]
	}),

	gobble( 'src' ).transform( 'rollup', {
		entry: 'index.js',
		dest: 'rollup-plugin-npm.es6.js',
		plugins: [ babel() ],
		format: 'es6',
		external: [ 'path', 'fs', 'builtin-modules' ]
	})
]);
