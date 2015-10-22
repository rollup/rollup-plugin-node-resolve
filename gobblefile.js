var gobble = require( 'gobble' );

module.exports = gobble( 'src' )
	.transform( 'rollup-babel', {
		entry: 'index.js',
		dest: 'rollup-plugin-npm.js',
		format: 'cjs',
		external: [ 'path', 'fs', 'builtin-modules' ]
	});
