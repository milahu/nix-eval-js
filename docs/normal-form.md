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

## others

### nickel

https://github.com/tweag/nickel/blob/master/src/term.rs

```rs
    /// Determine if a term is in evaluated from, called weak head normal form (WHNF).
    pub fn is_whnf(&self) -> bool {
        match self {
            Term::Null
            | Term::Bool(_)
            | Term::Num(_)
            | Term::Str(_)
            | Term::Fun(_, _)
            | Term::Lbl(_)
            | Term::Enum(_)
            | Term::Record(..)
            | Term::Array(..)
            | Term::SealingKey(_) => true,
            Term::Let(..)
            | Term::LetPattern(..)
            | Term::FunPattern(..)
            | Term::App(_, _)
            | Term::Var(_)
            | Term::Switch(..)
            | Term::Op1(_, _)
            | Term::Op2(_, _, _)
            | Term::OpN(..)
            | Term::Sealed(..)
            | Term::MetaValue(_)
            | Term::Import(_)
            | Term::ResolvedImport(_)
            | Term::StrChunks(_)
            | Term::RecRecord(..)
            | Term::ParseError(_) => false,
        }
    }
```

https://github.com/tweag/nickel/blob/master/src/transform/share_normal_form.rs

<blockquote>

Share normal form.

Replace the subexpressions of WHNFs that are not functions by thunks, such that they can be
shared. It is similar to the behavior of other lazy languages with respect to data
constructors.  To do so, subexpressions are replaced by fresh variables, introduced by new let
bindings put at the beginning of the WHNF.

For example, take the expression:
```text
let x = {a = 1 + 1} in x.a + x.a
```

The term `{a = 1 + 1}` is a record, and hence a WHNF. In consequence, the thunk allocated to x
is never updated. Without additional machinery, `a` will be recomputed each time is it used,
two times here.

The transformation replaces such subexpressions, namely the content of the fields
of records and the elements of arrays - `(1 + 1)` in our example -, with fresh variables
introduced by `let`  added at the head of the term:

```text
let x = (let var = 1 + 1 in {a = var}) in x.a + x.a
```

Now, the field `a` points to the thunk introduced by `var`: at the evaluation of the first
occurrence of `x.a`, this thunk is updated with `2`, and is not recomputed the second time.

Newly introduced variables begin with a special character to avoid clashing with user-defined
variables.

</blockquote>

```rs
/// Determine if a subterm of a WHNF should be wrapped in a thunk in order to be shared.
///
/// Sharing is typically useless if the subterm is already a WHNF which can be copied without
/// duplicating any work. On the other hand, a WHNF which can contain other shareable
/// subexpressions, such as a record, should be shared.
pub fn should_share(t: &Term) -> bool {
    match t {
        Term::Null
        | Term::Bool(_)
        | Term::Num(_)
        | Term::Str(_)
        | Term::Lbl(_)
        | Term::SealingKey(_)
        | Term::Var(_)
        | Term::Enum(_)
        | Term::Fun(_, _) => false,
        _ => true,
    }
}
```
