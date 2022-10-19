# language server

## language server protocol

https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/

> [Completion Request](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_completion)
>
> The Completion request is sent from the client to the server to compute completion items at a given cursor position. Completion items are presented in the IntelliSense user interface. 

## How does code completion work

https://stackoverflow.com/questions/1220099/how-does-code-completion-work

> A trie is a very useful data structure for this problem

> I don't know how it handles incremental changes. As you said, when you're writing code, it's invalid syntax 90% of the time, and reparsing everything whenever you idled would put a huge tax on your CPU for very little benefit, especially if you're modifying a header file included by a large number of source files.

## History of code completion

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
