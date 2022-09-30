# nix-eval-js/doc/todo

## generalize

* cheerp: C++ to javascript
  * could be useful for porting nix.cc to nix.js
  * https://github.com/NixOS/nixpkgs/issues/193648
  * backed by leaningtech.com
* dart: compile to javascript or binary (x64 desktop, ARM mobile)
  * https://dart.dev/
  * nice tooling (hot reload)
  * backed by google.com
* cito: compile to javascript, C, C++, python, java
  * https://github.com/pfusik/cito
  * cito is not a general-purpose programming language. Instead, it is meant for implementing portable reusable libraries.
* nim: compile to javascript, C, C++
* reasonML: functional. compile to javascript or OCaml (OCaml compiles to binary)

## autocompletion

https://codemirror.net/examples/autocompletion/#completing-from-syntax

[demo/src/codemirror-lang-nix/src/index.js](../demo/src/codemirror-lang-nix/src/index.js)

lookup: source location &rarr; node in syntax tree &rarr; env in eval state

problem: one node can be visited many times in one eval

&rarr; use the first or last visit?

can we do both?

first visit = better performance on re-eval

last visit = final state = fixpoint https://en.wikipedia.org/wiki/Fixed_point_(mathematics)

= "final, non-recursive representation" https://github.com/NixOS/nixpkgs/blob/master/lib/fixed-points.nix

## fixpoint

https://duckduckgo.com/?q=implementing+lazy+cached+evaluation+infinite+recursion+fixpoint

https://nixos.org/guides/nix-pills/nixpkgs-overriding-packages.html

```nix
# fix: Take a function and evaluate it with its own returned value.
let
  fix = f: let x = f x; in x;
in
fix (self: { x = "abc"; x2 = self.x + "123"; })
```

> At first sight, it's an infinite loop. With lazy evaluation it isn't, because the call is done only when needed.

http://r6.ca/blog/20140422T142911Z.html

> Static scoping means that variables are statically bound; all variable references are resolved based on their scope at declaration time.

> If we write `nixpkgs // { boost = boost149; }` then we only update the boost field of the nix package collection and none of the packages depending on boost will change. Instead we need to use the `config.packageOverrides` to change boost in such a way that all expressions depending on boost are also updated. Our goal is to understand the technique that packageOverrides and other similar overrides employ to achieve this sort of dynamic binding in a statically scoped language such as Nix.

```nix
let fix = f: let fixpoint = f fixpoint; in fixpoint; in
   let a = fix (self: { x = "abc"; x2 = self.x + "123"; }); in
   a
```

### what would nix do

how does nix know

* when there is nothing left to call
* when a recursion has reached its fixpoint
* when an expression is in "normal form"

[nix-fixpoint.cc](nix-fixpoint.cc)

[nix-thesis.md](nix-thesis.md)

## Nix Evaluation Performance

https://nixos.wiki/wiki/Nix_Evaluation_Performance

## implement global functions and objects

as reporeted by `nix repl` when hitting `Tab` key

### done

* builtins.true
* builtins.false
* builtins.null

### started

* builtins.import

### todo

builtins = primop builtins + extra builtins

primop builtins:

```
builtins.add
builtins.addErrorContext
builtins.all
builtins.any
...
```

[nix-builtins-primops.txt](nix-builtins-primops.txt)

extra builtins:

```
...
builtins.abort
builtins.baseNameOf
builtins.builtins
builtins.derivation
```

[nix-builtins-extra.txt](nix-builtins-extra.txt)

primops

```
__add
__addErrorContext
__all
__any
...
```

[nix-primops.txt](nix-primops.txt)

## avoid recursion

implement tail call?

## parser throws on long input

limitation of lezer-parser?

&rarr; use incremental parser interface?

https://lezer.codemirror.net/docs/ref/#common.Incremental_Parsing

https://lezer.codemirror.net/docs/ref/#common.Parser.startParse

> `fragments` can be passed in to make the parse incremental.

> By default, the entire input is parsed.

> You can pass ranges, which should be a sorted array of non-empty, non-overlapping ranges, to parse only those ranges. The tree returned in that case will start at `ranges[0].from`.

https://lezer.codemirror.net/docs/ref/#common.PartialParse.advance



```
$ # 3389 ! + true
$ ./bin/nix-eval "$(dd if=/dev/zero bs=1 count=3389 status=none | tr '\0' '!')true"
false

# 3389 ! + space + true
$ ./bin/nix-eval "$(dd if=/dev/zero bs=1 count=3389 status=none | tr '\0' '!') true"
false

# 3389 ! + space + space + true
$ ./bin/nix-eval "$(dd if=/dev/zero bs=1 count=3389 status=none | tr '\0' '!')  true"
Error: tree is empty

# 3390 !
$ ./bin/nix-eval "$(dd if=/dev/zero bs=1 count=3390 status=none | tr '\0' '!')true"
Error: tree is empty
```

## github pages takes forever to upload

todo: upload only when demo/dist/ was changed

added `.nojekyll` to disable jekyll &rarr; faster upload

## patching the lezer-parser runtime @lezer/lr

[lezer-parser.md](lezer-parser.md)
