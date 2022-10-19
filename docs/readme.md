# nix-eval-js/doc

## javascript internals

https://blog.sessionstack.com/how-javascript-works-parsing-abstract-syntax-trees-asts-5-tips-on-how-to-minimize-parse-time-abfcf7e8a0c8

How JavaScript works: Parsing, Abstract Syntax Trees (ASTs) + 5 tips on how to minimize parse time

https://blog.sessionstack.com/how-does-javascript-actually-work-part-1-b0bacc073cf

How JavaScript works: an overview of the engine, the runtime, and the call stack

## float precision

```
nix-repl> 0.300001 # 6 digits after comma
0.300001

nix-repl> 0.3000001 # 7 digits after comma
0.3
```

### C++

```cc
#include <stdio.h>
int main(int argc, char *argv[])
{
	double a = 0.1;
    double b = 0.2;
    double result = a + b;
    printf("%.17f", result);
	return 0;
}
```

result:

> 0.30000000000000004

live demo: https://godbolt.org/z/WfxGTbxGa

## serialize data

* https://www.npmjs.com/package/pretty-format Stringify any JavaScript value.
  * https://github.com/facebook/jest/tree/main/packages/pretty-format

## live coding

### figwheel

https://figwheel.org/docs/reloadable_code.html

powered by: [Google Closure Compiler](https://developers.google.com/closure/compiler/)

send incremental updates to runtime

## error reporting

generate html report for javascript errors

https://github.com/poppinss/youch

https://github.com/filp/whoops

## Garbage Collector

https://github.com/topics/garbage-collector

### boehm-gc

https://github.com/ivmai/bdwgc/wiki/Known-clients

general purpose, garbage collecting storage allocator

This is a garbage collecting storage allocator that is intended to be used as a plug-in replacement for C's malloc.

used by Nix, Harmonia

### meridvia

Garbage Collector in Javascript

https://github.com/Joris-van-der-Wel/meridvia

## similar problems

### incremental compiler

#### inc: an incremental approach to compiler construction

https://github.com/namin/inc

Step-by-step development of a Scheme-to-x86 compiler

http://scheme2006.cs.uchicago.edu/11-ghuloum.pdf

### collaborative editing

the interpreter is an editor too

## nix implementation

implementation details of the original nix interpreter

TLDR for now, but has all the details on performance optimization

### Nix thesis

see [nix-thesis.md](nix-thesis.md)

### javascript bindings for nix

* https://github.com/svanderburg/nijs - NiJS: An internal DSL for Nix in JavaScript
  * https://github.com/svanderburg/slasp - library for asynchronous programming

## transpile nix to javascript

* https://github.com/YZITE/nix2js - Nix &rarr; Rust &rarr; JavaScript

## lazy evaluation

* https://en.wikipedia.org/wiki/Lazy_evaluation
* https://ericnormand.me/podcast/how-do-you-implement-lazy-evaluation
* https://berkeley-cs61as.github.io/textbook/an-interpreter-with-lazy-evaluation.html
* [Structure and Interpretation of Computer Programs: An Interpreter with Lazy Evaluation](https://sicp.sourceacademy.org/chapters/4.2.2.html)
* Implementing lazy functional languages on stock hardware: the Spineless Tagless G-machine. by Simon Peyton-Jones
* [Lazy Evaluation. by Jaemin Hong](https://hjaem.info/articles/en_16_4)

### npm

* https://github.com/dtao/lazy.js - library for lazy functional programming, 6K stars, [npm](https://www.npmjs.com/package/lazy.js), [npm packages depending on lazy.js](https://www.npmjs.com/browse/depended/lazy.js)
  * https://github.com/wonderlang/wonder - lazy functional programming language
    * [wonder/interpreter.js](https://github.com/wonderlang/wonder/blob/master/interpreter.js)
* https://github.com/baconjs/bacon.js
  * Stop working on individual events and work with event-streams instead.
  * [npm packages depending on baconjs](https://www.npmjs.com/browse/depended/baconjs)
* https://github.com/ricokahler/lazy 10 stars

### simple

* https://github.com/SoundRabbit/SR_LazyEvaluation_JS
* https://github.com/jadaradix/lazy-evaluation
* https://github.com/ionutcirja/lazy-evaluation

### generators

generator = `function*`

* https://github.com/zh-rocco/lazy-evaluation
  * https://github.com/milahu/zh-rocco---lazy-evaluation - english translation of readme
* https://github.com/evinism/lazarr

### functions

* https://github.com/RenanSouza2/lazy_javascript_evaluation

### lisp interpreter

lisp interpreter in javascript

* https://github.com/maryrosecook/littlelisp - 600 stars
* https://github.com/jcubic/lips - 300 stars
* https://github.com/willurd/js-lisp - 50 stars
* https://chidiwilliams.com/post/how-to-write-a-lisp-interpreter-in-javascript/#interpreter
  * https://github.com/chidiwilliams/jscheme

## lazy evaluation vs reactive programming

* https://stackoverflow.com/questions/13575498/lazy-evaluation-and-reactive-programming
  * lazy evaluation is a language facility that allows the existence and manipulation of infinite data
    * infinite in the sense that you can pull off as much as you want and still have some left over.
    * you don't "loop forever"
    * performance gains
    * only compute as much of an answer as you need to do more work, and then keep around a holder (typically called a "thunk") that will let you do more work when you need it
  * reactive programming is a programming paradigm oriented around data flows and the propagation of change
    * express static or dynamic data flows
      * define ("declare") how data flows will be propagated
    * the underlying execution model will automatically propagate changes through the data flow
      * without explicitly having to implement it using callbacks and function pointers
    * most people will call GUI frameworks reactive.
      * in language like C or C++, you typically do reactive programming via function pointers or callbacks, without an explicit notion of lazy evaluation
  * in [functional reactive programming (FRP)](http://en.wikipedia.org/wiki/Functional_reactive_programming), you declaratively specify reactive data
    * implemented "under the hood" using the laziness of the Haskell language
  * if you look at libraries like [Bacon.js](https://baconjs.github.io/) or [Lazy.js](https://github.com/dtao/lazy.js), it really seems that under the hood their implementation can easily be realised by using the reactive paradigm (eg, with **streams**)
    * stream of events

## NixExpr to Derivation

* https://github.com/Gabriella439/Haskell-Nix-Derivation-Library

## reactive programming in javascript

### graphical

reactive frameworks for javascript in a web browser

https://github.com/krausest/js-framework-benchmark

IMHO the clear winner is solidjs

compare: vanillajs fullweb-helpers solid svelte react vue

### headless

headless reactive frameworks for nodejs

src: https://github.com/sindresorhus/awesome-nodejs

#### RxJS

[RxJS](https://github.com/reactivex/rxjs) - Functional reactive library for transforming, composing, and querying various kinds of data.

#### Kefir.js

[Kefir.js](https://github.com/kefirjs/kefir) - Reactive library with focus on high performance and low memory usage.

#### Marble.js

[Marble.js](https://github.com/marblejs/marble) - Functional reactive framework for building server-side apps, based on TypeScript and RxJS.

## benchmarks

### performance regression testing

"is the new version faster or slower?"

* https://github.com/GitbookIO/bipbip

### not

frameworks for testing of REST API performance

intended to benchmark HTTP requests

* [artillery](https://github.com/artilleryio/artillery)
* [bench-rest](https://github.com/jeffbski/bench-rest)

## performance

### prototype patching is evil

https://blog.yuzutech.fr/node-investigating-performance-regression/

> Based on this knowledge, we identified a practical JavaScript coding tip that can help boost performance:
>
> don’t mess with prototypes
>
> (or if you really, really need to, then at least do it before other code runs).

bad:

```js
Object.setPrototypeOf(Array.prototype, {})
```


