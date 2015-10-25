import { dirname, resolve } from 'path';
import { readdirSync, readFileSync } from 'fs';
import builtins from 'builtin-modules';

var absolutePath = /^(?:\/|(?:[A-Za-z]:)?[\\|\/])/;

function dirExists ( dir ) {
	try {
		readdirSync( dir );
		return true;
	} catch ( err ) {
		return false;
	}
}

export default function npm ( options ) {
	options = options || {};

	var skip = options.skip || [];

	return {
		resolveId: function ( importee, importer ) {
			// disregard relative paths, absolute paths, and entry modules
			if ( importee[0] === '.' || absolutePath.test( importee ) || !importer ) return null;

			// lop off trailing slash to handle bizarro cases like
			// https://github.com/nodejs/readable-stream/blob/077681f08e04094f087f11431dc64ca147dda20f/lib/_stream_readable.js#L125
			if ( importee.slice( -1 ) === '/' ) importee = importee.slice( 0, -1 );

			var parts = importee.split( /[\/\\]/ );
			var id = parts.shift();

			// npm scoped packages – @user/package
			if ( id[0] === '@' && parts[0] ) {
				id += '/' + parts.shift();
			}

			// exclude skipped modules
			if ( ~skip.indexOf( id ) ) return;

			var root = absolutePath.exec( importer )[0];
			var dir = dirname( importer );

			var modulePath;

			while ( dir !== root && dir !== '.' ) {
				modulePath = resolve( dir, 'node_modules', id );

				if ( dirExists( modulePath ) ) {
					// `foo/src/bar`
					if ( parts.length ) {
						return resolve( modulePath, ...parts ).replace( /\.js$/, '' ) + '.js';
					}

					if ( !options.jsnext && !options.main ) {
						throw new Error( `To import from a package in node_modules (${id}), either options.jsnext or options.main must be true` );
					}

					// `foo`
					const pkgPath = resolve( modulePath, 'package.json' );
					let pkg;

					try {
						pkg = JSON.parse( readFileSync( pkgPath, 'utf-8' ) );
					} catch ( err ) {
						throw new Error( `Missing or malformed package.json: ${modulePath}` );
					}

					if ( options.jsnext ) {
						const main = pkg[ 'jsnext:main' ];
						if ( main ) return resolve( dirname( pkgPath ), main ).replace( /\.js$/, '' ) + '.js';

						if ( !options.main ) {
							throw new Error( `Package ${id} (imported by ${importer}) does not have a jsnext:main field. You should either allow legacy modules with options.main, or skip it with options.skip = ['${id}'])` );
						}
					}

					if ( options.main ) {
						const main = pkg[ 'main' ] || 'index.js';
						if ( main ) return resolve( dirname( pkgPath ), main ).replace( /\.js$/, '' ) + '.js';
					}

					if ( ~builtins.indexOf( id ) ) return false;

					throw new Error( `Could not import module ${id} (imported by ${importer})` );
				}

				dir = dirname( dir );
			}

			return null;
		}
	};
}
