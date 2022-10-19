# Code Editors

## lapce

spiritual succesor of the xi-editor

with the "ropes" feature for efficient line wrapping

## Eco: A Language Composition Editor

written in Python

https://github.com/softdevteam/eco

https://soft-dev.org/src/eco/

https://soft-dev.org/pubs/html/diekmann_tratt__eco_a_language_composition_editor/

> Language composition editors have traditionally fallen into two extremes: traditional parsing, which is inﬂexible or ambiguous; or syntax directed editing, which programmers dislike. In this paper we extend an incremental parser to create an approach which bridges the two extremes: our prototype editor ‘feels’ like a normal text editor, but the user always operates on a valid tree as in a syntax directed editor. This allows us to compose arbitrary syntaxes while still enabling IDE-like features such as name binding analysis.

&rarr; "hybrid" editor

## yi-editor

The Haskell-Scriptable Editor

https://github.com/yi-editor/yi

https://github.com/yi-editor/yi/issues/70


# Live Programming Environment

incremental development

## Ohm

https://github.com/harc/ohm

parsing toolkit

based on parsing expression grammars (PEG)

TODO do we need GLR to parse Nix?

### Language Hacking in a Live Programming Environment

https://github.com/guevara/read-it-later/issues/4938

<blockquote>

Visualizing Intermediate Results

At any point during the development of an operation, the Ohm Editor can serve as a “playground” that enables the programmer to interactively modify the input and see immediately how their changes affect the result. Our interface naturally supports incremental development: if the programmer enters an input that is not yet supported by the operation, they will immediately see what semantic actions are missing and may add those right then and there (in the appropriate context) if desired.

<blockquote>
