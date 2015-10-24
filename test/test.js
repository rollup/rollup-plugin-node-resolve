var assert = require( 'assert' );
var rollup = require( 'rollup' );
var commonjs = require( 'rollup-plugin-commonjs' );
var npm = require( '..' );

process.chdir( __dirname );

describe( 'rollup-plugin-commonjs', function () {
	it( 'finds a module with jsnext:main', function () {
		return rollup.rollup({
			entry: 'samples/jsnext/main.js',
			plugins: [
				npm({ jsnext: true })
			]
		}).then( function ( bundle ) {
			var generated = bundle.generate({
				format: 'cjs'
			});

			var fn = new Function ( 'module', generated.code );
			var module = {};

			fn( module );

			assert.equal( module.exports, '2H' );
		});
	});

	it( 'finds and converts a basic CommonJS module', function () {
		return rollup.rollup({
			entry: 'samples/commonjs/main.js',
			plugins: [
				npm({ main: true }),
				commonjs()
			]
		}).then( function ( bundle ) {
			var generated = bundle.generate({
				format: 'cjs'
			});

			var fn = new Function ( 'module', generated.code );
			var module = {};

			fn( module );

			assert.equal( module.exports, 'It works!' );
		})
	});

	it( 'finds a file inside a package directory', function () {
		return rollup.rollup({
			entry: 'samples/granular/main.js',
			plugins: [
				npm()
			]
		}).then( function ( bundle ) {
			var generated = bundle.generate({
				format: 'cjs'
			});

			var fn = new Function ( 'module', generated.code );
			var module = {};

			fn( module );

			assert.equal( module.exports, '.js' );
		});
	});
});
