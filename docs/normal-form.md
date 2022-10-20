# normal form

normalization of expressions into their normal form

https://en.wikipedia.org/wiki/Normal_form_(abstract_rewriting)

Normalizing Expressions
http://homepages.math.uic.edu/~jan/mcs320/mcs320notes/lec15.html

## why

we need normalization for "maximal" sharing

== a minimal number of "cache miss"

## example

the extra parens lead to "cache miss"

note: we do get a cache hit for `((1 + 1))`

```
$ ./bin/nix-eval -e '( (1+1) + (1+1) )'

cache miss: ((((1 + 1)) + ((1 + 1))))
cache miss: ((((1 + 1)) + ((1 + 1))))
cache miss: (((1 + 1)) + ((1 + 1)))
cache miss: ((1 + 1))
cache miss: (1 + 1)
cache miss: 1
cache hit : 1
cache hit : ((1 + 1))
4
```

## how

term rewriting

https://en.wikipedia.org/wiki/Rewriting

> rewriting covers a wide range of methods of replacing subterms of a formula with other terms.

https://en.wikipedia.org/wiki/Rewriting#Term_rewriting_systems

http://rewriting.loria.fr/systems.html

http://homepages.math.uic.edu/~jan/mcs320/mcs320notes/lec15.html

## performance

lisp-family languages are good for this problem

probably because of tail-call recursion

### clojurescript

Experiments with fast term-rewriting in clojure
https://github.com/kovasb/combinator

### scheme

fastest scheme interpreter
https://github.com/cisco/ChezScheme

### rust

https://github.com/joshrule/term-rewriting-rs
