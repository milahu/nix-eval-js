# editors

https://github.com/topics/editor

https://github.com/topics/ide

favorites

* graphical
  * vscodium
  * lapce
* terminal
  * helix editor
  * neovim

## vscodium

problem: syntax highlighting by regex

&rarr; plugin: tree-sitter for syntax

syntax highlighting not via intellisense?

https://github.com/microsoft/vscode

https://github.com/VSCodium/vscodium

https://github.com/microsoft/monaco-editor

https://github.com/coder/code-server

140K stars

## lapce

https://github.com/lapce/lapce

20K stars

spiritual successor of xi-editor

How can I make extension for lapce
https://github.com/lapce/lapce/issues/1409

## atom

minus: electron = javascript = slow

https://github.com/atom/atom

60K stars

## Neovim

terminal based editor

written in C, plugins in Lua etc

tree-sitter for syntax

https://github.com/neovim/neovim

60K stars

https://console.dev/articles/neovim-best-code-editor-ide-for-developers/

### NvChad

make neovim cli functional like an IDE

https://github.com/NvChad/NvChad

10K stars

### LunarVim

IDE layer for Neovim

https://github.com/LunarVim/LunarVim

10K stars

## helix editor

terminal based editor

similar to Neovim

written in Rust

tree-sitter for syntax

https://github.com/helix-editor/helix

15K stars

## kakoune

terminal based editor

similar to Neovim

written in C++

https://github.com/mawww/kakoune

10K stars

## eclipse theia

IDE for browser and desktop

* Support building browser-based and desktop IDEs
* Provide a highly flexible architecture for adopters
* Support VS Code Extension protocol
* Develop under vendor-neutral open-source governance

built on Monaco Editor

minus: electron = javascript = slow

https://github.com/eclipse-theia/theia

20K stars

## graphql-editor

Visual Editor & GraphQL IDE

https://github.com/graphql-editor/graphql-editor

5K stars

## xi-editor

dead project

https://raphlinus.github.io/xi/2020/06/27/xi-retrospective.html

### Syntax highlighting

It may be surprising just how much slower regex-based highlighting is than fast parsers. The library that xi uses, syntect, is probably the fastest open source implementation in existence (the one in Sublime is faster but not open source). Even so, it is approximately 2500 times slower for parsing Markdown than [pulldown-cmark](https://github.com/raphlinus/pulldown-cmark).

As part of this work, I explored an alternative syntax highlighting engine based on parser combinators. If I had pursued that, the result would have been lightning fast, of comparable quality to the regex approach, and difficult to create syntax descriptions, as it involved a fair amount of manual factoring of parsing state. While the performance would have been nice to have, ultimately I don’t think there’s much niche for such a thing. If I were trying to create the best possible syntax highlighting experience today, I’d adapt Marijn Haverbeke’s [Lezer](https://marijnhaverbeke.nl/blog/lezer.html).

#### pulldown-cmark

https://github.com/raphlinus/pulldown-cmark

Why a pull parser?

There are many parsers for Markdown and its variants, but to my knowledge none use pull parsing. Pull parsing has become popular for XML, especially for memory-conscious applications, because it uses dramatically less memory than constructing a document tree, but is much easier to use than push parsers. Push parsers are notoriously difficult to use, and also often error-prone because of the need for user to delicately juggle state in a series of callbacks.

In a clean design, the parsing and rendering stages are neatly separated, but this is often sacrificed in the name of performance and expedience. Many Markdown implementations mix parsing and rendering together, and even designs that try to separate them (such as the popular hoedown), make the assumption that the rendering process can be fully represented as a serialized string.

Pull parsing is in some sense the most versatile architecture. It's possible to drive a push interface, also with minimal memory, and quite straightforward to construct an AST. Another advantage is that source-map information (the mapping between parsed blocks and offsets within the source text) is readily available; you can call into_offset_iter() to create an iterator that yields (Event, Range) pairs, where the second element is the event's corresponding range in the source document.

##### Pull Parsing vs Push Parsing

https://docs.oracle.com/cd/E19159-01/819-3669/bnbdy/index.html

Streaming **pull parsing** refers to a programming model in which a client application calls methods on an XML parsing library when it needs to interact with an XML infoset; that is, **the client only gets (pulls) XML data when it explicitly asks for it.**

Streaming **push parsing** refers to a programming model in which an XML parser sends (pushes) XML data to the client as the parser encounters elements in an XML infoset; that is, **the parser sends the data whether or not the client is ready to use it at that time.**

### Modular

> I think one of the strongest positive models was the database / business logic split, which is arguably the most successful example of process separation. In this model, the database is responsible for performance and integrity, and the business logic is in a separate process, so it can safely do things like crash and hang. I very much thought of xi-core as a database-like engine, capable of handling concurrent text modification much like a database handles transactions.

### Rope

My favorite aspect of the rope as a data structure is its excellent worst-case performance. Basically, there aren’t any cases where it performs badly. And even the concern about excess copying because of its immutability might not be a real problem; Rust has a copy-on-write mechanism where you can mutate in-place when there’s only one reference to the data.

The main argument against the rope is its complexity. I think this varies a lot by language; in C a gapped buffer might be preferable, but I think in Rust, a rope is the sweet spot. A large part of the reason is that in C, low level implementation details tend to leak through; you’ll often be dealing with a pointer to the buffer. For the common case of operations that don’t need to span the gap, you can hand out a pointer to a contiguous slice, and things just don’t get any simpler than that. Conversely, if any of the invariants of the rope are violated, the whole system will just fall apart.

In Rust, though, things are different. Proper Rust style is for all access to the data structure to be mediated by a well-defined interface. Then the details about how that’s implemented are hidden from the user. A good way to think about this is that the implementation has complexity, but that complexity is contained. It doesn’t leak out.

I think the rope in xi-editor meets that ideal. A lot of work went into getting it right, but now it works. Certain things, like navigating by line and counting UTF-16 code units, are easy and efficient. It’s built in layers, so could be used for other things including binary editing.

One of the best things about the rope is that it can readily and safely be shared across threads. Ironically we didn’t end up making much use of that in xi-editor, as it was more common to share across processes, using sophisicated diff/delta and caching protocols.

A rope is a fairly niche data structure. You really only want it when you’re dealing with large sequences, and also doing a lot of small edits on them. Those conditions rarely arise outside text editors. But for people building text editing in Rust, I think xi-rope holds up well and is one of the valuable artifacts to come from the project.

There’s a good [HN discussion of text editor data structures](https://news.ycombinator.com/item?id=15381886) where I talk about the rope more, and can also point people to the [Rope science](https://xi-editor.io/docs/rope_science_00.html) series for more color.
