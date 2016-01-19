var path = require( 'path' );
var assert = require( 'assert' );
var rollup = require( 'rollup' );
var commonjs = require( 'rollup-plugin-commonjs' );
var babel = require( 'rollup-plugin-babel' );
var npm = require( '..' );

process.chdir( __dirname );

function executeBundle ( bundle ) {
	const generated = bundle.generate({
		format: 'cjs'
	});

	const fn = new Function ( 'module', 'exports', 'assert', generated.code );
	let module = { exports: {} };

	fn( module, module.exports, assert );

	return module;
}

describe( 'rollup-plugin-npm', function () {
	it( 'finds a module with jsnext:main', function () {
		return rollup.rollup({
			entry: 'samples/jsnext/main.js',
			plugins: [
				npm({ jsnext: true })
			]
		}).then( executeBundle ).then( module => {
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
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports, 'It works!' );
		});
	});

	it( 'handles a trailing slash', function () {
		return rollup.rollup({
			entry: 'samples/trailing-slash/main.js',
			plugins: [
				npm({ main: true }),
				commonjs()
			]
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports, 'It works!' );
		});
	});

	it( 'finds a file inside a package directory', function () {
		return rollup.rollup({
			entry: 'samples/granular/main.js',
			plugins: [
				npm(),
				babel()
			]
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports, 'FOO' );
		});
	});

	it( 'loads local directories by finding index.js within them', function () {
		return rollup.rollup({
			entry: 'samples/local-index/main.js',
			plugins: [
				npm()
			]
		}).then( executeBundle ).then( module => {
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

	it( 'disregards top-level browser field by default', function () {
		return rollup.rollup({
			entry: 'samples/browser/main.js',
			plugins: [
				npm({
					main: true,
					browser: false
				})
			]
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports, 'node' );
		});
	});

	it( 'allows use of the top-level browser field', function () {
		return rollup.rollup({
			entry: 'samples/browser/main.js',
			plugins: [
				npm({
					main: true,
					browser: true
				})
			]
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports, 'browser' );
		});
	});

	it( 'disregards object browser field by default', function () {
		return rollup.rollup({
			entry: 'samples/browser-object/main.js',
			plugins: [
				npm({
					main: true,
					browser: false
				})
			]
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports.env, 'node' );
			assert.equal( module.exports.dep, 'node-dep' );
			assert.equal( module.exports.test, 42 );
		});
	});

	it( 'allows use of the object browser field', function () {
		return rollup.rollup({
			entry: 'samples/browser-object/main.js',
			plugins: [
				npm({
					main: true,
					browser: true
				})
			]
		}).then( executeBundle ).then( module => {
			assert.equal( module.exports.env, 'browser' );
			assert.equal( module.exports.dep, 'browser-dep' );
			assert.equal( module.exports.test, 43 );
		});
	});

	it( 'supports `false` in browser field', function () {
		return rollup.rollup({
			entry: 'samples/browser-false/main.js',
			plugins: [
				npm({
					main: true,
					browser: true
				})
			]
		}).then( executeBundle );
	});

	it( 'skips builtins', function () {
		return rollup.rollup({
			entry: 'samples/builtins/main.js',
			plugins: [ npm() ]
		}).then( bundle => {
			const { code } = bundle.generate({ format: 'cjs' });
			const fn = new Function ( 'module', 'exports', 'require', code );

			fn( module, module.exports, id => require( id ) );

			assert.equal( module.exports, path.sep );
		});
	});

	it( 'allows scoped packages to be skipped', () => {
		return rollup.rollup({
			entry: 'samples/scoped/main.js',
			plugins: [
				npm({
					skip: [ '@scoped/foo' ]
				})
			]
		}).then( bundle => {
			assert.deepEqual( bundle.imports, [ '@scoped/foo' ]);
		});
	});

	it( 'skip: true allows all unfound non-jsnext:main dependencies to be skipped without error', () => {
		return rollup.rollup({
			entry: 'samples/skip-true/main.js',
			plugins: [
				npm({
					jsnext: true,
					main: false,
					skip: true
				})
			]
		}).then( bundle => {
			assert.deepEqual( bundle.imports, [ 'legacy', 'missing' ]);
		});
	});

	it( 'skip: true allows all unfound dependencies to be skipped without error', () => {
		return rollup.rollup({
			entry: 'samples/skip-true/main.js',
			plugins: [
				npm({
					jsnext: false,
					main: false,
					skip: true
				})
			]
		}).then( bundle => {
			assert.deepEqual( bundle.imports, [ 'jsnext', 'legacy', 'missing' ]);
		});
	});
});
