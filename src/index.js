import { dirname } from 'path';
import builtins from 'builtin-modules';
import resolve from 'resolve';

export default function npm ( options ) {
	options = options || {};

	const skip = options.skip || [];
	const useMain = options.main !== false;

	return {
		resolveId( importee, importer ) {
			const parts = importee.split( /[\/\\]/ );
			const id = parts.shift();

			if ( ~skip.indexOf(id) ) return null;

			// disregard entry modules and builtins
			if ( !importer || ~builtins.indexOf( importee )  ) return null;

			return new Promise( ( accept, reject ) => {
				resolve(
					importee,
					{
						basedir: dirname( importer ),
						packageFilter( pkg ) {
							const id = pkg[ 'name' ];
							if ( options.jsnext ) {
								const main = pkg[ 'jsnext:main' ];
								if ( main ) {
									pkg[ 'main' ] = main;
								} else if ( !useMain ) {
									throw new Error( `Package ${id} (imported by ${importer}) does not have a jsnext:main field. You should either allow legacy modules with options.main, or skip it with options.skip = ['${id}'])` );
								}
							} else if ( !useMain ) {
								throw new Error( `To import from a package in node_modules (${id}), either options.jsnext or options.main must be true` );
							}
							return pkg;
						}
					},
					( err, resolved ) => err ? reject( err ) : accept( resolved )
				);
			});
		}
	};
}
