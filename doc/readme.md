# nix-eval-js/doc

## serialize data

* https://www.npmjs.com/package/pretty-format Stringify any JavaScript value.
  * https://github.com/facebook/jest/tree/main/packages/pretty-format

## live coding

### figwheel

https://figwheel.org/docs/reloadable_code.html

powered by: google closure compiler

send incremental updates to runtime

## error reporting

generate html report for javascript errors

https://github.com/poppinss/youch

https://github.com/filp/whoops

## language server protocol

https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/

> [Completion Request](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_completion)
>
> The Completion request is sent from the client to the server to compute completion items at a given cursor position. Completion items are presented in the IntelliSense user interface. 

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

## Code Editor

### Eco: A Language Composition Editor

written in Python

https://github.com/softdevteam/eco

https://soft-dev.org/src/eco/

https://soft-dev.org/pubs/html/diekmann_tratt__eco_a_language_composition_editor/

> Language composition editors have traditionally fallen into two extremes: traditional parsing, which is inﬂexible or ambiguous; or syntax directed editing, which programmers dislike. In this paper we extend an incremental parser to create an approach which bridges the two extremes: our prototype editor ‘feels’ like a normal text editor, but the user always operates on a valid tree as in a syntax directed editor. This allows us to compose arbitrary syntaxes while still enabling IDE-like features such as name binding analysis.

&rarr; "hybrid" editor

### yi-editor

The Haskell-Scriptable Editor

https://github.com/yi-editor/yi

https://github.com/yi-editor/yi/issues/70


## Live Programming Environment

incremental development

### Ohm

https://github.com/harc/ohm

parsing toolkit

based on parsing expression grammars (PEG)

TODO do we need GLR to parse Nix?

#### Language Hacking in a Live Programming Environment

https://github.com/guevara/read-it-later/issues/4938

<blockquote>

Visualizing Intermediate Results

At any point during the development of an operation, the Ohm Editor can serve as a “playground” that enables the programmer to interactively modify the input and see immediately how their changes affect the result. Our interface naturally supports incremental development: if the programmer enters an input that is not yet supported by the operation, they will immediately see what semantic actions are missing and may add those right then and there (in the appropriate context) if desired.

<blockquote>

## incremental interpreter

https://github.com/guevara/read-it-later/issues?q=incremental+interpreter


### Wishlist for Meta Programming and Language-Oriented Programming

https://github.com/racket/rhombus-prototype/issues/136



### The General Problem

https://github.com/guevara/read-it-later/issues/4752

from zero to a fully usable compiler

this series will walk you through building an optimizing compiler from scratch

building a compiler for Scheme

based on [An Incremental Approach to Compiler Construction](http://scheme2006.cs.uchicago.edu/11-ghuloum.pdf)





### An Incremental Interpreter for High-Level Programs with Sensing

Giuseppe De Giacomo, Hector Levesqu

https://www.cs.toronto.edu/kr/publications/incr-exe.pdf

[./incr-exe.pdf](./incr-exe.pdf)

### History of code completion

https://groups.google.com/g/comp.compilers/c/fJHahKDCNGg

<blockquote>

Like many developers I enjoy the addition of code completion (or
insight or intellisense etc) in an IDE. Jbuilder, Delphi, VB and
various other major IDE's have it.
The ability to see a list of possible members (properties & methods)
in OOP is valuable, especially in huge languages like Java.

-- gswork

</blockquote>

<blockquote>

The other style is to leave the programmer with a general text editor,
and then have the editor maintain a parse tree for what the user has
typed -- essentially compiling while the user types. There are
algorithms for incremental parsing and incremental analysis, e.g.:


Thomas Reps, Tim Teitelbaum, Alan Demers.
Incremental Context-Dependent Analysis for Language-Based Editors.
ACM Transactions on Programming Languages and Systems,
Vol. 5, No. 3, July 1983, 449-477.

It's tricky, though -- a lot of the intermediate stages aren't going
to be legal code!

This style is used in VB and Smalltalk, and it's used in syntax
highlighters in, e.g., Emacs. The syntax highlighters in particular
often rely on heuristics instead of doing strictly correct parses, at
least if the current buffer has unsyntactic code in it. I honestly
don't know whether this is due to theoretical limitations or just due
to a lack of effort by the authors.


In either style, note that you *have* to have a language-specific
editor or editor mode for this kind of tool to work. For it to work
well, you furthermore need the editor to be integrated with the
compiler (or at least, the editor needs to know about the compiled
codebase.) For some reason, there is a lot of resistance to such
integrated development environments, partially because they tend to
not cooperate well with other languages.

In my more cynical moments, I sometimes wonder if software-development
tools are driven by a desire to make programming remain "fun". What a
crazy bunch we are!

-Lex
[I've used both kinds of editors. The first kind is incredibly
annoying, because there are lots of common and simple text changes
that are large changes in the parse tree, e.g, move a close brace
down a few lines past some other statements. The second kind is still
around. Teitelbaum et al started a company and turned their stuff
into products. See http://www.grammatech.com/ -John]

-- Lex Spoon

</blockquote>

<blockquote>

Alice influenced my later work on various VC++ features (unrelated to
IntelliSense), but that was long years ago. These days I love the
IntelliSense code prompting and completion in VS.NET beta 2. It makes
exploring the vast surface area of the .NET Framework Class Library
easy and fun. -- Jan Gray

</blockquote>

### Harmonia

base for tree-sitter https://github.com/tree-sitter/tree-sitter/issues/107

- [Efficient and Flexible Incremental Parsing](http://ftp.cs.berkeley.edu/sggs/toplas-parsing.ps)
- [Incremental Analysis of Real Programming Languages](https://pdfs.semanticscholar.org/ca69/018c29cc415820ed207d7e1d391e2da1656f.pdf)


Marat Boshernitsan. Harmonia: A ﬂexible framework for constructing interactive language-based programming tools. Master’s thesis, University of California, Berkeley, Jun 2001.

http://harmonia.cs.berkeley.edu/harmonia/publications/harmonia-pubs.html

http://harmonia.cs.berkeley.edu/harmonia/projects/harmonia-mode/doc/index.html

structural browsing, navigation and search capabilities, and structural elision

Harmonia-mode is language-independent, meaning that support for a particular programming language is provided via plugin module

http://harmonia.cs.berkeley.edu/harmonia/download/index.html

## How does code completion work

https://stackoverflow.com/questions/1220099/how-does-code-completion-work

> A trie is a very useful data structure for this problem

> I don't know how it handles incremental changes. As you said, when you're writing code, it's invalid syntax 90% of the time, and reparsing everything whenever you idled would put a huge tax on your CPU for very little benefit, especially if you're modifying a header file included by a large number of source files.

## similar problems

### incremental compiler

#### inc: an incremental approach to compiler construction

https://github.com/namin/inc

Step-by-step development of a Scheme-to-x86 compiler

http://scheme2006.cs.uchicago.edu/11-ghuloum.pdf

### collaborative editing

the interpreter is an editor too

### database software

views on tables

synchronization

caching

"Nix is a database query language"

#### simple graph database

##### jseg

https://github.com/brandonbloom/jseg

A super simple, in-memory, JS graph database.

#### graph database

aka NoSQL

https://db-engines.com/en/article/Graph+DBMS

> Graph DBMS, also called graph-oriented DBMS or graph database, represent data in graph structures as nodes and edges, which are relationships between nodes. They allow easy processing of data in that form, and simple calculation of specific properties of the graph, such as the number of steps needed to get from one node to another node.

https://en.wikipedia.org/wiki/Graph_database

https://github.com/topics/graph-database

wanted specs

* written in [Rust](https://github.com/topics/graph-database?l=rust)

##### surrealdb

https://github.com/surrealdb/surrealdb

Rust

##### indradb

https://github.com/indradb/indradb

Rust

##### oxigraph

https://github.com/oxigraph/oxigraph

Rust

##### arangodb

https://github.com/arangodb/arangodb

C++

##### nebula

https://github.com/vesoft-inc/nebula

C++

##### Dgraph

18K github stars

https://github.com/dgraph-io/dgraph

https://dgraph.io/

https://db-engines.com/en/system/Dgraph

* written in Go == meh, GC sucks, better than Java

##### Neo4j

https://en.wikipedia.org/wiki/Neo4j

https://db-engines.com/en/system/Neo4j

* 10K github stars
* written in Java == meh
* many language bindings: Java, .NET, JavaScript, Python, Go, Ruby, PHP, R, Erlang/Elixir, C/C++, Clojure, Perl, Haskell
* Open-source, supports ACID, has high-availability clustering for enterprise deployments, and comes with a web-based administration that includes full transaction support and visual node-link graph explorer; accessible from most programming languages using its built-in REST web API interface, and a proprietary Bolt protocol with official drivers.

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


