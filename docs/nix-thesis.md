# nix-eval-js/docs/nix-thesis

## nix thesis

[The Purely Functional Software Deployment Model. by Eelco Dolstra](https://edolstra.github.io/pubs/phd-thesis.pdf)

PDF page 89, print page 81

<blockquote>

4.4. Implementation

Maximal laziness Nix expression evaluation is implemented using the ATerm library
\[166], which is a library for the efficient storage and runtime manipulation of terms.

</blockquote>

<blockquote>

A very nice property of the ATerm library is its **maximal sharing**: if two terms are
syntactically equal, then they occupy the same location in memory. This means that a
shallow pointer equality test is sufficient to perform a deep syntactic equality test.

Maximal
sharing is implemented through a hash table. Whenever a new term is created, the term is
looked up in the hash table. If the term already exists, the address of the term obtained from
the hash table is returned. Otherwise, the term is allocated, initialised, and added to the
hash table. A garbage collector takes care of freeing terms that are no longer referenced.

Maximal sharing is extremely useful in the implementation of a Nix expression interpreter
since it allows easy **caching of evaluation results**, which speeds up expression evaluation
by removing unnecessary evaluation of identical terms. The interpreter maintains a
hash lookup table cache : ATerm → ATerm that maps ATerms representing Nix expressions
to their **normal form**.

</blockquote>

<blockquote>

\[166] Mark van den Brand, Hayco de Jong, Paul Klint, and Pieter Olivier. Efficient
annotated terms. Software—Practice and Experience, 30:259–291, 2000.

</blockquote>

### Maximal Laziness

[Maximal Laziness. An Efficient Interpretation Technique for Purely Functional DSLs. by Eelco Dolstra](https://edolstra.github.io/pubs/laziness-ldta2008-final.pdf)

<blockquote>

In **interpreters for functional languages based on term rewriting**, maximal laziness
is much easier to achieve. In a term rewriting approach, the **abstract syntax
term** representing the program **is rewritten** according to the semantic rules of the
language **until a normal form — the evaluation result — is reached**.

In fact, maximal
laziness comes naturally when one implements the interpreter in a term rewriting
system that has the property of maximal sharing, such as ASF+SDF \[23] or the
Stratego/XT program transformation system \[24], both of which rely on the ATerm
library \[20] to implement maximal sharing of terms.

In such systems, if two terms
are syntactically equal, then they occupy the same location in memory — i.e., any
term is stored only once (a technique known as **hash-consing in Lisp**).

This makes
it easy and cheap to add a simple **memoisation** to the term rewriting code to **map
abstract syntax trees to their normal forms**, thus “caching” evaluation results and
achieving maximal laziness.

</blockquote>

### fixpoint

problem: this expression does not terminate in a naive nix interpreter:

```nix
# fix: Take a function and evaluate it with its own returned value.
let
  fix = f: let x = f x; in x;
in
fix (self: { x = "abc"; x2 = self.x + "123"; })
```

how does nix know

* when there is nothing left to call
* when a recursion has reached its fixpoint
* when an expression is in "normal form"

search:

* infinite recursion
* normal form

pdf page 81

<blockquote>

Recursive attribute sets introduce
the possibility of recursion, including non-termination:

```nix
rec { x = x; }.x
```

A let-expression, constructed using the let keyword, is syntactic sugar for a recursive
attribute set that automatically selects the special attribute body from the set. Thus,

```nix
let { body = a ++ b; a = "foo"; b = "bar"; }
```

evaluates to "foobar".

As we saw above, when defining an attribute set, attributes values can be inherited from
the surrounding lexical scope or from other attribute sets. The expression

```nix
x: { inherit x; y = 123; }
```

defines a function that returns an attribute set with two attributes: x which is inherited from
the function argument named x, and y which is declared normally. The inherit construct is
just syntactic sugar. The example above could also be written as

```nix
x: { x = x; y = 123; }
```

Note that the right-hand side of the attribute x = x refers to the function argument x, not to
the attribute x. Thus, x = x is not a recursive definition.
Likewise, attributes can be inherited from other attribute sets:

```nix
rec {
as1 = {x = 1; y = 2; z = 3;};
as2 = {inherit (as1) x y; z = 4;};
}
```

Here the set as2 copies attributes x and y from set as1. It desugars to

```nix
rec {
as1 = {x = 1; y = 2; z = 3;};
as2 = {x = as1.x; y = as1.y; z = 4;};
}
```

However, the situation is a bit more complicated for rec attribute sets, whose attributes
are mutually recursive, i.e., are in each other’s scope. The intended semantics of inherit is
still the same: values are inherited from the surrounding scope. But simply desugaring is
no longer enough. So if we desugar

```nix
x: rec { inherit x; y = 123; }
```

to

```nix
x: rec { x = x; y = 123; }
```

we have incorrectly created an **infinite recursion**: the attribute x now evaluates to itself,
rather than the value of the function argument x. For this reason **rec is actually internally
stored as two sets of attributes: the recursive attributes, and the non-recursive attributes.**
The latter are simply the inherited attributes. We denote this internally used representation
of rec sets as

```
rec {as1/as2}
```

where as1 and as2 are the recursive and non-recursive attributes,
respectively.

</blockquote>

pdf page 84

<blockquote>

4.3.4. Evaluation rules

The operational semantics of the language is specified using semantic rules of the form
e1 7→ e2 that transform expression e1 into e2. Rules may only be applied to closed terms,
i.e., terms that have no free variables. Thus it is not allowed to arbitrary apply rules to
subterms.
An expression e is in normal form if no rules are applicable. Not all normal forms are
acceptable evaluation results. For example, no rule applies to the following expressions:

```nix
x
123 x
assert false; 123
{x = 123;}.y
({x}: x) {y = 123;}
```

The predicate good(e) defines whether an expression is a valid evaluation result. It is true
if e is a basic or compound value or a function (lambda), and false otherwise. Since rules
are only allowed to be applied to an expression at top level (i.e., not to subexpressions),
a good normal form is in weak head normal form (WHNF) [133, Section 11.3.1]. Weak
head normal form differs from the notion of head normal form in that right-hand sides of
functions need not be normalised. A nice property of this style of evaluation is that there
can be no name capture [10], which simplifies the evaluation machinery.

An expression e1 is said to evaluate to e2, notation e1
∗
7→ e2, if there exists a sequence
of zero or more applications of semantic rules to e1 that transform it into e2 such that
good(e2) is true; i.e., the normal form must be good. In the implementation, if the normal
form of e1 is not good, its evaluation triggers a runtime error (e.g., “undefined variable” or
“assertion failed”).

Not all expressions have a normal form. For instance, the expression

```nix
(rec {x = x;}).x
```

does not terminate. But if evaluation does terminate, there must be a single normal form.
That is, evaluation is confluent [5]. The confluence property follows from the fact that at
most one rule applies to any expression. The implementation detects some types of infinite
recursion, as discussed below.

</blockquote>

pdf page 90

<blockquote>

Maximal sharing is extremely useful in the implementation of a Nix expression interpreter
since it allows easy caching of evaluation results, which speeds up expression evaluation
by removing unnecessary evaluation of identical terms. The interpreter maintains a
hash lookup table cache : ATerm → ATerm that maps ATerms representing Nix expressions
to their normal form.

Figure 4.7 shows pseudo-code for the caching evaluation function
eval, which “wraps” the evaluation rules defined in Section 4.3.4 in a caching layer. The
function eval simply implements those evaluation rules. It is assumed that eval calls back
into eval to evaluate subterms

and that it aborts with an appropriate error message if e does not evaluate to a good normal
form. Thus we obtain the desired caching. The special value ε denotes that no mapping
exists in the cache for the expression. Note that thanks to maximal sharing, the lookup
cache[e] is very cheap: it is a lookup of a pointer in a hash table

The function eval also perform a trick known as blackholing [134, 110] that allows
detection of certain simple kinds of infinite recursion. When we evaluate an expression e,
we store in the cache a preliminary “fake” normal form blackhole. If, during the evaluation
of e, we need to evaluate e again, the cache will contain blackhole as the normal form for
e. Due to the determinism and purity of the language, this necessarily indicates an infinite
loop, since if we start evaluating e again, we will eventually encounter it another time, and
so on.

Note that blackholing as implemented here differs from conventional blackholing, which
overwrites a value being evaluated with a black hole. This allows discovery of selfreferential
values, e.g., x = ... x ...;. But it does not detect infinite recursions like this:

```nix
(rec {f = x: f x;}).f 10
```

since every recursive call to f creates a new value of x, and so blackholing will not catch
the infinite recursion. In contrast, our blackholing does detect it, since it is keyed on
maximally shared ATerms that represent syntactically equal expressions. The example
above is evaluated as follows:


This final expression is equal to the first (which is blackholed at this time), and so an
infinite recursion is signalled.

The current evaluation cache never forgets the evaluation result of any term. This obviously
does not scale very well, so one might want to clear or prune the cache eventually,
possibly using a least-recently used (LRU) eviction scheme. However, the size of current
Nix expressions (such as those produced during the evaluation of Nixpkgs) has not
compelled me to implement cache pruning yet. It should also be noted that due to maximal
sharing, cached values are stored quite efficiently.

The expression caching scheme described here makes the Nix expression evaluator maximally
lazy. Languages such as Haskell are non-strict, meaning that values such as function
arguments or let-bindings are evaluated only when necessary. A stronger property is
laziness, which means that these values are evaluated at most once. 

Finally, maximal laziness means that syntactically identical terms are evaluated at most
once.

Maximal laziness simplifies the implementation of the Nix expression evaluator. 

</blockquote>

## maximal laziness

[Maximal Laziness. An Efficient Interpretation Technique for Purely Functional DSLs. by Eelco Dolstra](https://edolstra.github.io/pubs/laziness-ldta2008-final.pdf)
