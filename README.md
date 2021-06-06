# esbuild-plugin-less

Plugin for `esbuild` to import `.less` files in JavaScript or TypeScript.

## Install

```bash
npm i @arnog/esbuild-plugin-less
```

## Usage

```js
// In your JS file:
import style from "style.less";
console.log(style);
```

```js
// In your esbuild build file:
import { build } from "esbuild";
import { less } from "@arnog/esbuild-plugin-less";

build({
  entryPoints: ["index.js"],
  bundle: true,
  outfile: "build/index.js",
  plugins: [less()],
});
```

You can pass to the `less()` function an option object literal as described [here](https://lesscss.org/usage/#less-options).

### Credits

This plugin was inspired from [@iam-medvedev/esbuild-plugin-less](https://github.com/iam-medvedev/esbuild-plugin-less).
