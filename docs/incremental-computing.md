# incremental computing

https://en.wikipedia.org/wiki/Incremental_computing

https://github.com/janestreet/incremental - A library for incremental computations, in OCaml

https://github.com/adapton/adapton.rust - General-purpose abstractions for incremental computing, in Rust

https://github.com/carlssonia/adaptive - Library for incremental computing, in Haskell

Delta ML - Self-adjusting Computation with Delta ML

https://github.com/MetaBorgCube/IceDust - A language for data modeling and incremental computing of derived values, with Java backend

## bidirectional transformation

https://en.wikipedia.org/wiki/Bidirectional_transformation

> bidirectional transformations (bx) are programs in which a single piece of code can be run in several ways, such that the same data are sometimes considered as input, and sometimes as output

https://en.wikipedia.org/wiki/Boomerang_(programming_language)

> lenses: well-behaved bidirectional transformations

> Boomerang grew out of the Harmony generic data synchronizer, which grew out of the Unison file synchronization project.

### lenses

bidirectional programming

https://news.ycombinator.com/item?id=31890781

#### paper

https://www.cs.cornell.edu/~jnfoster/papers/lenses.pdf

Combinators for Bi-Directional Tree Transformations

A Linguistic Approach to the View Update Problem

#### Boomerang Lenses

https://www.seas.upenn.edu/~harmony/

A bidirectional programming language for ad-hoc, textual data.

Boomerang is a programming language for writing lenses—well-behaved bidirectional transformations—that operate on ad-hoc, textual data formats. Every lens program, when read from left to right, describes a function that maps an input to an output; when read from right to left, the very same program describes a "backwards" function that maps a modified output, together with the original input, back to a modified input.

#### Rust Lenses

https://lib.rs/crates/lenses

> Rust Lenses
>
> This project is inspired in the Lens functional design pattern for changing immutable fields in algebraic data types. This project is inspired on Julien Truffaut's Monocle library for Scala and Scala.js (which in turn is inspired in Haskell's Lens).

> Lenses are composable higher-order structures to manipulate data types.

#### Monocle Lenses

https://blog.luitjes.it/posts/monocle-bidirectional-code-generation/

https://github.com/snootysoftware/prototypes/tree/main/monocle

Monocle is a bidirectional code generation library. It lets you write all sorts of development tools that don’t exist yet. The basic idea:

https://news.ycombinator.com/item?id=31001922

> There is a fair amount of academic work on bidirectional tree transformation with lenses, e.g. <https://www.cs.cornell.edu/~jnfoster/papers/lenses.pdf>. It breaks down to proving three operations (Get, Put, Create) that observe three laws (called GetPut, PutGet, and CreateGet); these give you bidirectional transformations you can compose arbitrarily.

> As I understand it, with lenses you generally define them through a DSL. Monocle lets you define them through example code. The goal was to make it as easy as possible for a decent programmer to write a lot of them.

> Inflex (https://inflex.io/) does this bidirectional editing: you can edit any data structure as either a graphical object or the associated code, and the other one updates appropriately. (See e.g. https://discourse.inflex.io/t/how-to-make-and-access-a-record-in-inflex/25)
>
> As for the problem of which things of a data frame are generated from a formula and which are from normal form, Inflex compares the structure with the AST of the source, making it easy to tell that [{foo: ...}] are normal form and so editable graphically, whereas xs.filter(..) is not. The neat thing is you can still edit formulae that are deep within a normal form nested structure.

> Yeah back in the 90's it was called "round-tripping"
>
> https://www.ibm.com/docs/en/rhapsody/8.2?topic=developing-roundtripping-code


> As for similar concepts, several projects by builder.io have some overlap. Most notably Mitosis[1], but I’d be shocked if TS-Lite[2] isn’t using similar techniques. Potentially Qwik[3] as well but I’m not sure, I would have bet that’s using Mitosis but it looks like that’s the other way around.
>
> 1: https://github.com/BuilderIO/mitosis
>
> 2: https://github.com/BuilderIO/ts-lite/tree/main/packages/core
>
> 3: https://github.com/BuilderIO/qwik

> are you interested in using/supporting tree-sitter grammars?

#### Augeas Lenses

https://en.wikipedia.org/wiki/Augeas_(software)

Augeas uses programs called lenses (in reference to the Harmony Project[3]) to map a filesystem to an XML tree which can then be parsed using an XPath syntax, using a bidirectional transformation. Writing such lenses extends the amount of files Augeas can parse.

## Transformation language

https://en.wikipedia.org/wiki/Transformation_language

## recursion

> With cycles in the dependency graph, a single pass through the graph may not be sufficient to reach a fixed point. In some cases, complete reevaluation of a system is semantically equivalent to incremental evaluation, and may be more efficient in practice if not in theory.[8]

this is relevant for nixpkgs

but ...

## small effects

in the context of a Language Server, we assume the simple case
where **small changes have small effects** on the eval result

## limited eval

when a change has **large effects** then we pause evaluation
wait for new user input, hoping that it will revert the large effects

if we still have large effects, ask the user:
"should we continue this expensive eval?"
