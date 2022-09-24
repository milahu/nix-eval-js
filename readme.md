# nix-eval-js

[nix](https://github.com/NixOS/nix) interpreter in javascript

## status

proof of concept

## demos

* [nix repl](https://milahu.github.io/nix-eval-js/demo/dist/) - live demo

## documentation

see [docs/](docs/)

## install

```sh
git clone --recurse-submodules https://github.com/milahu/nix-eval-js
cd nix-eval-js
pnpm install
cd demo
pnpm install
npm run dev
```

## goals

### incremental evaluator

create a prototype for an **incremental** evaluator

#### example

```nix
__head [ 1 ]
```

this evaluates to the result `1`

adding values to the list does not change the result

```nix
__head [ 1 2 ]
```

still evaluates to the result `1`

only changing the first value changes the result

```nix
__head [ 3 ]
```

this evaluates to the result `3`

### intellisense

#### autocompletion

```nix
let
  pkgs = {
    hello = ''
      #! /bin/sh
      echo hello
    '';
  };
in
pkgs.
#    ^ cursor
```

at this cursor, i want the autocompletion `hello`

this should also work with `callPackage` and `makeScope`

## related

* [rnix-lsp](https://github.com/nix-community/rnix-lsp) - language server for nix
* [lezer-parser-nix](https://github.com/milahu/lezer-parser-nix)
* [nixos-config-webui](https://github.com/milahu/nixos-config-webui)
* [nijs](https://github.com/svanderburg/nijs) - Nix bindings for JavaScript

## keywords

* nix evaluator in javascript
* eval nix code in javascript
* evaluate nix code in javascript
