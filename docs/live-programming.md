# live programming

https://en.wikipedia.org/wiki/Interactive_programming

Interactive programming is the procedure of
writing parts of a program while it is already active.

The principle of **rapid feedback** in extreme programming
is radicalized and becomes more explicit.

Interactive programming has also been used in applications
that need to be rewritten without stopping them,
a feature which the computer language Smalltalk is famous for.

this feature is an apparent need in sound design and algorithmic composition

## figwheel

clojurescript &rarr; google closure compiler &rarr; javascript

https://figwheel.org/docs/reloadable_code.html

## hazel

https://github.com/hazelgrove/hazel

https://news.ycombinator.com/item?id=24299852

## Elm

https://elm-lang.org/news/interactive-programming

Pushing the limits of hot-swapping

It is possible to change a program so much that it is no longer compatible with previous versions. If we try to hot-swap with incompatible code, it will lead to runtime errors.

To make hot-swapping reliable, we must know when programs are incompatible.

There are two major categories of incompatibilies:

1. The API has changed.
2. It is not possible to copy the old state into the new program. 

... both cases can be addressed with features like
static types, immutability and purity, and predictable structure.

## Learnable Programming

design goals for live programming environments

http://worrydream.com/LearnableProgramming/
