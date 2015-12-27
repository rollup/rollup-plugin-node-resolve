var assert = require( 'assert' );
var rollup = require( 'rollup' );
var commonjs = require( 'rollup-plugin-commonjs' );
var babel = require( 'rollup-plugin-babel' );
var npm = require( '..' );

process.chdir( __dirname );

describe( 'rollup-plugin-npm', function () {
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

	it( 'handles a trailing slash', function () {
		return rollup.rollup({
			entry: 'samples/trailing-slash/main.js',
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
				npm(),
				babel()
			]
		}).then( function ( bundle ) {
			var generated = bundle.generate({
				format: 'cjs'
			});

			var fn = new Function ( 'module', generated.code );
			var module = {};

			fn( module );

			assert.equal( module.exports, 'FOO' );
		});
	});

	it( 'loads local directories by finding index.js within them', function () {
		return rollup.rollup({
			entry: 'samples/local-index/main.js',
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

			assert.equal( module.exports, 42 );
		});
	});

	it( 'loads package directories by finding index.js within them', function () {
		return rollup.rollup({
			entry: 'samples/package-index/main.js',
			plugins: [
				npm()
			]
		}).then( function ( bundle ) {
			var generated = bundle.generate({
				format: 'cjs'
			});

			assert.ok( ~generated.code.indexOf( 'setPrototypeOf' ) );
		});
	});

	it( 'allows skipping by package name', function () {
		return rollup.rollup({
			entry: 'samples/skip/main.js',
			plugins: [
				npm({
					main: true,
					skip: [ 'vlq' ]
				})
			]
		}).then( function ( bundle ) {
			var generated = bundle.generate({
				format: 'cjs'
			});

			assert.ok( generated.code.indexOf( 'encode' ) < 0 );
		});
	});
});
