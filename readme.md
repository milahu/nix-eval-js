# nix-eval-js

[nix](https://github.com/NixOS/nix) interpreter in javascript

## status

proof of concept

## demos

* [nixos-config-webui](https://github.com/milahu/nixos-config-webui)

## nix implementation

implementation details of the original nix interpreter

TLDR for now, but has all the details on performance optimization

### Nix thesis

[The Purely Functional Software Deployment Model. by Eelco Dolstra](https://edolstra.github.io/pubs/phd-thesis.pdf)

PDF page 89, print page 81

<blockquote>

4.4. Implementation

Maximal laziness Nix expression evaluation is implemented using the ATerm library
\[166], which is a library for the efficient storage and runtime manipulation of terms.

</blockquote>

<blockquote>

A very nice property of the ATerm library is its maximal sharing: if two terms are
syntactically equal, then they occupy the same location in memory. This means that a
shallow pointer equality test is sufficient to perform a deep syntactic equality test. Maximal
sharing is implemented through a hash table. Whenever a new term is created, the term is
looked up in the hash table. If the term already exists, the address of the term obtained from
the hash table is returned. Otherwise, the term is allocated, initialised, and added to the
hash table. A garbage collector takes care of freeing terms that are no longer referenced.
Maximal sharing is extremely useful in the implementation of a Nix expression interpreter since it allows easy caching of evaluation results, which speeds up expression evaluation by removing unnecessary evaluation of identical terms. The interpreter maintains a
hash lookup table cache : ATerm → ATerm that maps ATerms representing Nix expressions
to their normal form.

</blockquote>

<blockquote>

\[166] Mark van den Brand, Hayco de Jong, Paul Klint, and Pieter Olivier. Efficient annotated terms. Software—
Practice and Experience, 30:259–291, 2000.

</blockquote>

### Maximal Laziness

[Maximal Laziness. An Efficient Interpretation Technique for Purely Functional DSLs. by Eelco Dolstra](https://edolstra.github.io/pubs/laziness-ldta2008-final.pdf)

<blockquote>

In interpreters for functional languages based on term rewriting, maximal laziness is much easier to achieve. In a term rewriting approach, the abstract syntax
term representing the program is rewritten according to the semantic rules of the
language until a normal form — the evaluation result — is reached. In fact, maximal
laziness comes naturally when one implements the interpreter in a term rewriting
system that has the property of maximal sharing, such as ASF+SDF \[23] or the
Stratego/XT program transformation system \[24], both of which rely on the ATerm
library \[20] to implement maximal sharing of terms. In such systems, if two terms
are syntactically equal, then they occupy the same location in memory — i.e., any
term is stored only once (a technique known as hash-consing in Lisp). This makes
it easy and cheap to add a simple memoisation to the term rewriting code to map
abstract syntax trees to their normal forms, thus “caching” evaluation results and
achieving maximal laziness.

</blockquote>

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

## keywords

* nix evaluator in javascript
* eval nix code in javascript
* evaluate nix code in javascript
