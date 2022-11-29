# nix-eval-js

[nix](https://github.com/NixOS/nix) interpreter in javascript

## status

early draft

for a list of implemented features, see [test/nix-eval.snapshots.txt](test/nix-eval.snapshots.txt)

### autocompletion

a very simple version of autocompletion is working

this is based on the last valid eval state

see the demo

## demo

[nix-eval-js demo](https://milahu.github.io/nix-eval-js/demo/dist/)

## documentation

see [docs/](docs/)

## install

```sh
git clone --recurse-submodules https://github.com/milahu/nix-eval-js
cd nix-eval-js
pnpm install
```

### commands

```sh
./bin/nix-parse -e 1+1
./bin/nix-eval -e 1+1

./bin/nix-parse -f /etc/nixos/configuration.nix
./bin/nix-eval -f /etc/nixos/configuration.nix

./bin/nix-parse -f ~/src/nixpkgs/pkgs/top-level/all-packages.nix
./bin/nix-eval -f ~/src/nixpkgs/pkgs/top-level/all-packages.nix
```

### offline demo

```sh
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

## Nix Interpreters

aka: Nix Evaluators

status = how much of "the perfect nix" is implemented

* [nix](https://github.com/NixOS/nix) - the original nix interpreter in C++. aka `nix.cc`. Status: 90%
* [tour of nix](https://github.com/nixcloud/tour_of_nix) - nix interpreter in javascript. aka `nix.js`.  
the original nix interpreter, compiled to asm.js. Status: `nix-instantiate`
  * https://nixcloud.io/tour/
  * https://lastlog.de/blog/posts/tour_of_nix.html
  * https://github.com/NixOS/nixpkgs/pull/16208 - emscripten based toolchain for nix
* [hnix](https://github.com/haskell-nix/hnix) - nix interpreter in haskell. aka `nix.hs`. Status: 50%
* [rnix-lsp](https://github.com/nix-community/rnix-lsp) - nix interpreter in rust. error-tolerant interpreter for intellisense. based on the [rnix-parser](https://github.com/nix-community/rnix-parser). aka `nix.rs`. Status: 20%
* [Toros](https://github.com/kamadorueda/toros) - Nix implementation in Rust. Based on the [NixEL](https://github.com/kamadorueda/nixel) parser. aka `nix.rs`. Status: 10%
* [nix-eval-js](https://github.com/milahu/nix-eval-js) - Nix interpreter in pure JavaScript. Proof of concept. Based on the [lezer-parser-nix](https://github.com/milahu/lezer-parser-nix) parser. aka `nix.js`. Status: 5%

in a distant future, nickel can interpret nix https://github.com/tweag/nickel/issues/93

see also https://github.com/nix-community/awesome-nix/pull/133

## related

* [lezer-parser-nix](https://github.com/milahu/lezer-parser-nix) - nix parser in javascript
* [nixos-config-webui](https://github.com/milahu/nixos-config-webui) - old project
* [nijs](https://github.com/svanderburg/nijs) - Nix bindings for JavaScript

## keywords

* nix evaluator in javascript
* eval nix code in javascript
* evaluate nix code in javascript
