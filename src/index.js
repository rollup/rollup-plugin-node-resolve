import { dirname, resolve } from 'path';
import builtins from 'builtin-modules';
import nodeResolve from 'resolve';
import browserResolve from 'browser-resolve';

const COMMONJS_BROWSER_EMPTY = nodeResolve.sync( 'browser-resolve/empty.js', __dirname );
const ES6_BROWSER_EMPTY = resolve( __dirname, '../src/empty.js' );

export default function npm ( options ) {
	options = options || {};

	const skip = options.skip || [];
	const useMain = options.main !== false;

	const resolveId = options.browser ? browserResolve : nodeResolve;

	return {
		resolveId ( importee, importer ) {
			const parts = importee.split( /[\/\\]/ );
			const id = parts.shift();

			if ( ~skip.indexOf(id) ) return null;

			// disregard entry module
			if ( !importer ) return null;

			return new Promise( ( accept, reject ) => {
				resolveId(
					importee,
					{
						basedir: dirname( importer ),
						packageFilter ( pkg ) {
							const id = pkg[ 'name' ];
							if ( options.jsnext ) {
								const main = pkg[ 'jsnext:main' ];
								if ( main ) {
									pkg[ 'main' ] = main;
								} else if ( !useMain ) {
									reject( Error( `Package ${id} (imported by ${importer}) does not have a jsnext:main field. You should either allow legacy modules with options.main, or skip it with options.skip = ['${id}'])` ) );
								}
							} else if ( !useMain ) {
								reject( Error( `To import from a package in node_modules (${id}), either options.jsnext or options.main must be true` ) );
							}
							return pkg;
						}
					},
					( err, resolved ) => {
						if ( err ) {
							reject( err );
						} else {
							if ( resolved === COMMONJS_BROWSER_EMPTY ) resolved = ES6_BROWSER_EMPTY;
							if ( ~builtins.indexOf( resolved ) ) resolved = null;

							accept( resolved );
						}
					}
				);
			});
		}
	};
}
