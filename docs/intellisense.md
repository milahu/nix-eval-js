# intellisense

## autocomplete

https://en.wikipedia.org/wiki/Intelligent_code_completion

## intellisense based on dynamic analysis

[Intellisense for dynamic languages](http://lambda-the-ultimate.org/node/1981)

<blockquote>

How about in a debugger

If you have a visual debugger
that lets you edit code while the program is at a breakpoint,
then you'll have runtime type information available.

Of course the danger would be
that the user will enter code that won't work next time around
because the type will be different.

</blockquote>

[Practical Type Inference Based on Success Typings](http://lambda-the-ultimate.org/node/1910)

<blockquote>

We show that it is possible to reconstruct a significant portion of the type information which is implicit in a program, automatically annotate function interfaces, and detect definite type clashes without fundamental changes to the philosophy of the language or imposing a type system which unnecessarily rejects perfectly reasonable programs. To do so, we introduce the notion of success typings of functions. Unlike most static type systems, success typings incorporate subtyping and never disallow a use of a function that will not result in a type clash during runtime. Unlike most soft typing systems that have previously been proposed, success typings allow for compositional, bottom-up type inference which appears to scale well in practice.

</blockquote>

<blockquote>

A recent paper using a subset of Erlang for the examples. This continues the trend of methods for uncovering type errors in dynamically-typed Erlang. One such tool, Dialyzer, is now part of the Erlang distribution.

</blockquote>

<blockquote>

Success typing attempts to find the most restrictive type such that all calls to the function that do not conform to the inferred type fail. The authors use union types when several argument or return types fit the bill. External functions can be typed simply with (any())* -> any().

</blockquote>

<blockquote>

So success typings overapproximate the type as a set of allowed values (and underapproximate its complement).
"Failure" typings do the opposite. Both have their merits.

</blockquote>
