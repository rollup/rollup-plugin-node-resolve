# rollup-plugin-npm

Find third party modules in `node_modules`, so that they can be included in a Rollup bundle.

## Installation

```bash
npm install --save-dev rollup-plugin-npm
```

## Usage

```js
import { rollup } from 'rollup';
import npm from 'rollup-plugin-npm';

rollup({
  entry: 'main.js',
  plugins: [
    npm({
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

      // by default, built-in modules such as `fs` and `path` are
      // treated as external if a local module with the same name
      // can't be found. If you really want to turn off this
      // behaviour for some reason, use `builtins: false`
      builtins: false,

      // some package.json files have a `browser` field which
      // specifies alternative files to load for people bundling
      // for the browser. If that's you, use this option, otherwise
      // pkg.browser will be ignored
      browser: true
    })
  ]
}).then( bundle => bundle.write({ dest: 'bundle.js', format: 'iife' }) );

// alongside rollup-plugin-commonjs, for using non-ES6 third party modules
import commonjs from 'rollup-plugin-commonjs';

rollup({
  entry: 'main.js',
  plugins: [
    npm({ jsnext: true, main: true }),
    commonjs()
  ]
}).then( bundle => bundle.write({ dest: 'bundle.js', format: 'iife' }) );
```


## License

MIT
