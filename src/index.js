import { dirname, resolve, extname, normalize, sep } from 'path';
import builtins from 'builtin-modules';
import resolveId from 'resolve';
import isModule from 'is-module';
import fs from 'fs';
import packageJSON from '../package.json';

const ES6_BROWSER_EMPTY = resolve( __dirname, '../src/empty.js' );
const CONSOLE_WARN = ( ...args ) => console.warn( ...args ); // eslint-disable-line no-console
// It is important that .mjs occur before .js so that Rollup will interpret npm modules
// which deploy both ESM .mjs and CommonJS .js files as ESM.
const DEFAULT_EXTS = [ '.mjs', '.js', '.json', '.node' ];

let readFileCache = {};
const readFileAsync = file => new Promise((fulfil, reject) => fs.readFile(file, (err, contents) => err ? reject(err) : fulfil(contents)));
const statAsync = file => new Promise((fulfil, reject) => fs.stat(file, (err, contents) => err ? reject(err) : fulfil(contents)));
function cachedReadFile (file, cb) {
	if (file in readFileCache === false) {
		readFileCache[file] = readFileAsync(file).catch(err => {
			delete readFileCache[file];
			throw err;
		});
	}
	readFileCache[file].then(contents => cb(null, contents), cb);
}
let statCache = {};
function cachedStat (file) {
	if (file in statCache === false) {
		statCache[file] = statAsync(file).catch(err => {
			delete statCache[file];
			throw err;
		});
	}
	return statCache[file];
}

function getFileCacheEntry (file) {
	return cachedStat(file).then(({ mtimeMs, size }) => ({ file, mtimeMs, size }), err => ({ file, code: err.code }))
}

function compareFileCacheEntry (cacheEntry) {
	return getFileCacheEntry(cacheEntry.file).then(({ mtimeMs, size, code, }) => {
		return code ? code === cacheEntry.code : mtimeMs === cacheEntry.mtimeMs && size === cacheEntry.size
	})
}

let isFileCache = {};
function cachedIsFile (file, cb) {
	if (file in isFileCache === false) {
		isFileCache[file] = cachedStat(file)
			.then(
				stat => stat.isFile(),
				err => {
					if (err.code == 'ENOENT') return false;
					delete isFileCache[file];
					throw err;
				});
	}
	isFileCache[file].then(contents => cb(null, contents), cb);
}

const resolveIdAsync = (file, opts) => new Promise((fulfil, reject) => resolveId(file, opts, (err, contents) => err ? reject(err) : fulfil(contents)));

export default function nodeResolve ( options = {} ) {
	const useModule = options.module !== false;
	const useMain = options.main !== false;
	const useJsnext = options.jsnext === true;
	const isPreferBuiltinsSet = options.preferBuiltins === true || options.preferBuiltins === false;
	const preferBuiltins = isPreferBuiltinsSet ? options.preferBuiltins : true;
	const customResolveOptions = options.customResolveOptions || {};
	const jail = options.jail;
	const only = Array.isArray(options.only)
		? options.only.map(o => o instanceof RegExp
			? o
			: new RegExp('^' + String(o).replace(/[\\^$*+?.()|[\]{}]/g, '\\$&') + '$')
		)
		: null;
	const browserMapCache = {};

	const onwarn = options.onwarn || CONSOLE_WARN;

	if ( options.skip ) {
		throw new Error( 'options.skip is no longer supported — you should use the main Rollup `external` option instead' );
	}

	if ( !useModule && !useMain && !useJsnext ) {
		throw new Error( `At least one of options.module, options.main or options.jsnext must be true` );
	}

	let preserveSymlinks;

	return {
		name: 'node-resolve',

		options ( options ) {
			preserveSymlinks = options.preserveSymlinks;
		},

		onwrite () {
			isFileCache = {};
			statCache = {};
			readFileCache = {};
		},

		resolveId ( importee, importer ) {
			if ( /\0/.test( importee ) ) return null; // ignore IDs with null character, these belong to other plugins

			// disregard entry module
			if ( !importer ) return null;

			return Promise.resolve(this.cache ? this.cache.get(`${importee}|${importer}`) : false)
				.then((cache) => {
					// If the importer, importee or any package.json files have changed then invalidate the cache:
					return cache && cache.stats.reduce((promise, cacheEntry) => {
						return promise.then(stillValid => stillValid && compareFileCacheEntry(cacheEntry), Promise.resolve(true));
					});
				}).then(cacheIsValid => {
					if (cacheIsValid) {
						return this.cache.get(`${importee}|${importer}`).result;
					}

					if (options.browser && browserMapCache[importer]) {
						const resolvedImportee = resolve( dirname( importer ), importee );
						const browser = browserMapCache[importer];
						if (browser[importee] === false || browser[resolvedImportee] === false) {
							return ES6_BROWSER_EMPTY;
						}
						if (browser[importee] || browser[resolvedImportee] || browser[resolvedImportee + '.js'] || browser[resolvedImportee + '.json']) {
							importee = browser[importee] || browser[resolvedImportee] || browser[resolvedImportee + '.js'] || browser[resolvedImportee + '.json'];
						}
					}


					const parts = importee.split( /[/\\]/ );
					let id = parts.shift();

					if ( id[0] === '@' && parts.length ) {
						// scoped packages
						id += `/${parts.shift()}`;
					} else if ( id[0] === '.' ) {
						// an import relative to the parent dir of the importer
						id = resolve( importer, '..', importee );
					}

					if (only && !only.some(pattern => pattern.test(id))) return null;

					let disregardResult = false;
					let packageBrowserField = false;
					const extensions = options.extensions || DEFAULT_EXTS;
					const checkedFiles = new Set();

					const resolveOptions = {
						basedir: dirname( importer ),
						packageFilter ( pkg, pkgPath ) {
							const pkgRoot = dirname( pkgPath );
							if (options.browser && typeof pkg[ 'browser' ] === 'object') {
								packageBrowserField = Object.keys(pkg[ 'browser' ]).reduce((browser, key) => {
									const resolved = pkg[ 'browser' ][ key ] === false ? false : resolve( pkgRoot, pkg[ 'browser' ][ key ] );
									browser[ key ] = resolved;
									if ( key[0] === '.' ) {
										const absoluteKey = resolve( pkgRoot, key );
										browser[ absoluteKey ] = resolved;
										if ( !extname(key) ) {
											extensions.reduce( ( browser, ext ) => {
												browser[ absoluteKey + ext ] = browser[ key ];
												return browser;
											}, browser );
										}
									}
									return browser;
								}, {});
							}

							if (options.browser && typeof pkg[ 'browser' ] === 'string') {
								pkg[ 'main' ] = pkg[ 'browser' ];
							} else if ( useModule && pkg[ 'module' ] ) {
								pkg[ 'main' ] = pkg[ 'module' ];
							} else if ( useJsnext && pkg[ 'jsnext:main' ] ) {
								pkg[ 'main' ] = pkg[ 'jsnext:main' ];
							} else if ( ( useJsnext || useModule ) && !useMain ) {
								disregardResult = true;
							}
							return pkg;
						},
						readFile (file) {
							checkedFiles.add(file);
							return cachedReadFile(file);
						},
						isFile (file) {
							checkedFiles.add(file);
							return cachedIsFile(file);
						},
						extensions: extensions
					};

					if (preserveSymlinks !== undefined) {
						resolveOptions.preserveSymlinks = preserveSymlinks;
					}

					return resolveIdAsync(
						importee,
						Object.assign( resolveOptions, customResolveOptions )
					)
						.catch(() => false)
						.then(resolved => {
							if (options.browser && packageBrowserField) {
								if (packageBrowserField[ resolved ]) {
									resolved = packageBrowserField[ resolved ];
								}
								browserMapCache[resolved] = packageBrowserField;
							}

							if ( !disregardResult && resolved !== false ) {
								if ( !preserveSymlinks && resolved && fs.existsSync( resolved ) ) {
									resolved = fs.realpathSync( resolved );
								}

								if ( ~builtins.indexOf( resolved ) ) {
									return null;
								} else if ( ~builtins.indexOf( importee ) && preferBuiltins ) {
									if ( !isPreferBuiltinsSet ) {
										onwarn(
											`preferring built-in module '${importee}' over local alternative ` +
											`at '${resolved}', pass 'preferBuiltins: false' to disable this ` +
											`behavior or 'preferBuiltins: true' to disable this warning`
										);
									}
									return null;
								} else if ( jail && resolved.indexOf( normalize( jail.trim( sep ) ) ) !== 0 ) {
									return null;
								}
							}

							if ( resolved && options.modulesOnly ) {
								return readFileAsync( resolved, 'utf-8').then(code => isModule( code ) ? resolved : null);
							} else {
								return resolved === false ? null : resolved;
							}
						})
						.then(resolved => {
							if (this.cache) {
								// We need to stat all files that were checked as part of this algorythm
								// so we can see if they changed the next time we want to read from cache
								return Promise.all(Array.from(checkedFiles).map(getFileCacheEntry)).then(stats => {
									this.cache.set(`${importee}|${importer}`, { stats, result: resolved });
									return resolved;
								});
							}
							return resolved;
						});
				});
		}
	};
}
