#!/bin/sh

#npm run build

echo "removing nested node_modules, so vite does not use them. fix codemirror error:"
echo "  Error: Unrecognized extension value in extension set ([object Object])."
echo "  This sometimes happens because multiple instances of @codemirror/state are loaded, breaking instanceof checks."
( set -x
  rm -rf src/codemirror-lang-nix/node_modules
)

( set -x
  npx vite build
)
