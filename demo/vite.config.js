import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import nodePolyfills from 'vite-plugin-node-stdlib-browser'



const assetsDir = '';
//const assetsDir = 'assets/';

const outputDefaults = {
  //format: 'iife', // default

  // remove hashes from filenames
  entryFileNames: `${assetsDir}[name].js`,
  chunkFileNames: `${assetsDir}[name].js`,
  assetFileNames: `${assetsDir}[name].[ext]`,
}

export default defineConfig({
  //root: "demo",
  base: "./", // generate relative paths in html
  plugins: [
    solidPlugin(),
    nodePolyfills(),
  ],
  server: {
    //host: 'localhost',
    //port: 3000,
  },
  build: {
    target: 'esnext',
    //polyfillDynamicImport: false,
    //sourcemap: true,
    minify: false, // smaller git diffs
    // example sizes for solidjs app with monaco-editor
    // false: 5396.78 KiB // smaller git diffs
    // 'esbuild': 2027.36 KiB // default
    // 'terser': 2002.37 KiB
    rollupOptions: {
      output: {
        ...outputDefaults,
      }
    },
  },
  esbuild: {
    // keep names of functions an classes
    // dont rename class BufferNode to class BufferNode$1
    // https://github.com/evanw/esbuild/issues/510#event-3983228566
    // https://github.com/vitejs/vite/issues/7916
    // see src/nix-eval.js
    // no effect
    keepNames: true,
  },
  worker: {
    rollupOptions: {
      output: {
        ...outputDefaults,
      }
    },
  },
  resolve: {
    // https://vitejs.dev/config/shared-options.html#resolve-dedupe
    // If you have duplicated copies of the same dependency in your app
    // (likely due to hoisting or linked packages in monorepos),
    // use this option to force Vite to always resolve listed dependencies
    // to the same copy (from project root).
    dedupe: [
      // fix: Error: Unrecognized extension value in extension set ([object Object]).
      // This sometimes happens because multiple instances of @codemirror/state are loaded,
      // breaking instanceof checks.
      //'@codemirror/state',
      // this breaks syntax highlighting 0__o
      // -> back to
      // rm -rf src/codemirror-lang-nix/node_modules/
    ],
  },
});
