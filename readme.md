# nix-eval-js

[nix](https://github.com/NixOS/nix) interpreter in javascript

## status

proof of concept

## demos

* [nix repl](https://milahu.github.io/nix-eval-js/demo/dist/) - live demo

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

## related

* [lezer-parser-nix](https://github.com/milahu/lezer-parser-nix)
* [nixos-config-webui](https://github.com/milahu/nixos-config-webui)
* [nijs](https://github.com/svanderburg/nijs) - Nix bindings for JavaScript

## keywords

* nix evaluator in javascript
* eval nix code in javascript
* evaluate nix code in javascript
