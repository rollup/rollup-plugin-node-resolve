# rollup-plugin-node-resolve

*This plugin used to be called rollup-plugin-npm*

Locate modules using the [Node resolution algorithm](https://nodejs.org/api/modules.html#modules_all_together), for using third party modules in `node_modules`

## Installation

```bash
npm install --save-dev rollup-plugin-node-resolve
```

## Usage

```js
import { rollup } from 'rollup';
import nodeResolve from 'rollup-plugin-node-resolve';

rollup({
  entry: 'main.js',
  plugins: [
    nodeResolve({
      // use "jsnext:main" if possible
      // – see https://github.com/rollup/rollup/wiki/jsnext:main
      jsnext: true,

      // use "main" field or index.js, even if it's not an ES6 module
      // (needs to be converted from CommonJS to ES6
      // – see https://github.com/rollup/rollup-plugin-commonjs
      main: true,

      // if there's something your bundle requires that you DON'T
      // want to include, add it to 'skip'
      skip: [ 'some-big-dependency' ],

      // some package.json files have a `browser` field which
      // specifies alternative files to load for people bundling
      // for the browser. If that's you, use this option, otherwise
      // pkg.browser will be ignored
      browser: true,

      // not all files you want to resolve are .js files
      extensions: [ '.js', '.json' ]
    })
  ]
}).then( bundle => bundle.write({ dest: 'bundle.js', format: 'iife' }) );

// alongside rollup-plugin-commonjs, for using non-ES6 third party modules
import commonjs from 'rollup-plugin-commonjs';

rollup({
  entry: 'main.js',
  plugins: [
    nodeResolve({ jsnext: true, main: true }),
    commonjs()
  ]
}).then( bundle => bundle.write({ dest: 'bundle.js', format: 'iife' }) );
```


## License

MIT
