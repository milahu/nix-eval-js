# nix-eval-js/doc

## architecture

aka: how does this work?

im trying to build a browser-based editor for the [Nix](https://github.com/NixOS/nix) language

i have not seen something like this (incremental interpreter based on lezer-parser), so im sharing my concept here

my goal is to build something like [figwheel](https://figwheel.org/docs/reloadable_code.html) (live coding in ClojureScript, based on [Google Closure Compiler](https://developers.google.com/closure/compiler/)), but with a more narrow focus on intellisense (autocompletion, introspection of variables in scope)

the main component is [nix-eval-js](https://github.com/milahu/nix-eval-js), which is a Nix interpreter based on lezer-parser

the demo integrates this with codemirror

on every update of EditorState, i call this function:

```js
// nix-eval-js/demo/src/App.jsx

function onEditorState(editorState) {
  // handle new tree
  // eval
  const source = editorState.doc.sliceString(0, editorState.doc.length);
  let evalResult;
  try {
    // eval magic
    evalResult = editorState.tree.topNode.type.thunk(editorState.tree.cursor(), source);
  }
  catch (error) {
    console.error(error);
    evalResult = `# error: ${error.name}: ${error.message}`;
  }
  setStore('evalResult', evalResult); // set store.evalResult
}
```

onEditorState is called from dispatch

```js
// nix-eval-js/demo/src/createCodeMirror.js
// https://github.com/nimeshnayaju/solid-codemirror/pull/8

// Construct a new EditorView instance
view = new EditorView({
  state,
  parent: ref(),
  dispatch: (tr) => {
    if (!view)
      return;
    view.update([tr]);
    if (!tr.docChanged) {
      return;
    }
    if (props.onEditorStateChange) {
      const newEditorState = tr.state; // call: get state
      props.onEditorStateChange(newEditorState);
    }
  },
});
```

the eval magic happens in `editorState.tree.topNode.type.thunk`

what is `topNode.type.thunk`?

the `thunk` functions are added in `codemirror.jsx`

```jsx
// nix-eval-js/demo/src/codemirror.jsx
import { createCodeMirror } from "./createCodeMirror.js";
import { nix as codemirrorLangNix } from "./codemirror-lang-nix/dist/index.js";
import { thunkOfNodeType } from '../../src/nix-thunks-lezer-parser.js';

export function CodeMirror(props) {

  let ref;
  const codeMirrorExtensions = {};

  const { createExtension } = createCodeMirror({
    onEditorStateChange: props.onEditorStateChange,
    value: props.value,
  }, () => ref);

  // load the nix language extension
  codeMirrorExtensions.codemirrorLangNix = codemirrorLangNix();

  // add thunks to types
  const parser = codeMirrorExtensions.codemirrorLangNix.extension.language.parser;
  for (const nodeType of parser.nodeSet.types) {
    nodeType.thunk = thunkOfNodeType[nodeType.name];
  }

  return (
    <div ref={ref} />
  );
}
```

what are the `thunk` functions?

```js
// nix-eval-js/src/nix-thunks-lezer-parser.js.txt

function callThunk(cursor, source) {
  if (!cursor.type.thunk) {
    throw new NixEvalNotImplemented(`thunk is undefined for type ${cursor.type.name}`);
  }
  return cursor.type.thunk(cursor, source);
}

const thunkOfNodeType = {};

thunkOfNodeType['⚠'] = (cursor, _source) => {
  throw new NixSyntaxError(`error at position ${cursor.from}`);
};

thunkOfNodeType.Nix = (cursor, source) => {
  if (!cursor.firstChild() || !skipComments(cursor) || cursor == null) {
    // input is empty
    return;
  }
  return callThunk(cursor, source);
};

thunkOfNodeType.Add = (cursor, source) => {
  // arithmetic addition or string concat
  if (!cursor.firstChild() || !skipComments(cursor) || cursor == null) {
    throw new NixEvalError('ConcatStrings: no firstChild')
  }
  const arg1 = callThunk(cursor, source);
  if (!cursor.nextSibling() || !skipComments(cursor) || cursor == null) {
    throw new NixEvalError('ConcatStrings: no nextSibling')
  }
  const arg2 = callThunk(cursor, source);
  return arg1 + arg2;
};

thunkOfNodeType.Int = (cursor, source) => {
  return parseInt(nodeText(cursor, source));
};

export { thunkOfNodeType }
```

## challenges

### recursive function calls

```nix
# Fibonacci
let
  f = i: n: m:
    if i == 0 then n
    else f (i - 1) m (n + m);
  fib = n: f n 1 1;
in
fib 1 # == 1
```

result:

> EvalError undefined variable 'i'

tree:

<details>

```
Nix:0: # Fibonacci
 Comment:0: # Fibonacci
 Let:12: let                    # data: f, fib
  Attr:18: f = i: n: m:
   Identifier:18: f
   Lambda:22: i: n: m:
    Identifier:22: i
    Lambda:25: n: m:            # data: i - on bodyNode of Lambda:22
     Identifier:25: n
     Lambda:28: m:              # data: n - on bodyNode of Lambda:25
      Identifier:28: m
      If:35: if i == 0 then n   # data: m - on bodyNode of Lambda:28
       Eq:38: i == 0
        Var:38: i
         Identifier:38: i
        Int:43: 0
       Var:50: n
        Identifier:50: n
       Call:61: f (i - 1) m (n + m)
        Call:61: f (i - 1) m
         Call:61: f (i - 1)
          Var:61: f
           Identifier:61: f
          Parens:63: (i - 1)
           Sub:64: i - 1
            Var:64: i
             Identifier:64: i
            Int:68: 1
         Var:71: m
          Identifier:71: m
        Parens:73: (n + m)
         Add:74: n + m
          Var:74: n
           Identifier:74: n
          Var:78: m
           Identifier:78: m
  Attr:84: fib = n: f n 1 1;
   Identifier:84: fib
   Lambda:90: n: f n 1 1
    Identifier:90: n
    Call:93: f n 1 1            # data: n - on bodyNode of Lambda:90
     Call:93: f n 1
      Call:93: f n
       Var:93: f
        Identifier:93: f
       Var:95: n
        Identifier:95: n
      Int:97: 1
     Int:99: 1
  Call:105: fib 1
   Var:105: fib
    Identifier:105: fib
   Int:109: 1
 Comment:111: # == 1
```

</details>

logs:

<details>

```
thunkOfNodeType.Var:105: getting variable fib: find scope: node Var:105 {}
thunkOfNodeType.Var:105: getting variable fib: find scope: parent Call:105 {}
thunkOfNodeType.Var:105: getting variable fib: find scope: parent Let:12 {"f":«lambda @ (string):3:7»,"fib":«lambda @ (string):6:9»}
thunkOfNodeType.Var:105: done getting variable fib: found in parent Let:12 {"f":«lambda @ (string):3:7»,"fib":«lambda @ (string):6:9»}
thunkOfNodeType.Lambda:90: setting variable n=1 on Call:93 {} for bodyNode Call:93 {}
thunkOfNodeType.Lambda:90: setting variable n=1 on Call:93 {"n":1} - done
thunkOfNodeType.Var:93: getting variable f: find scope: node Var:93 {}
2thunkOfNodeType.Var:93: getting variable f: find scope: parent Call:93 {}
thunkOfNodeType.Var:93: getting variable f: find scope: parent Call:93 {"n":1}
thunkOfNodeType.Var:93: getting variable f: find scope: parent Lambda:90 {}
thunkOfNodeType.Var:93: getting variable f: find scope: parent Attr:84 {}
thunkOfNodeType.Var:93: getting variable f: find scope: parent Let:12 {"f":«lambda @ (string):3:7»,"fib":«lambda @ (string):6:9»}
thunkOfNodeType.Var:93: done getting variable f: found in parent Let:12 {"f":«lambda @ (string):3:7»,"fib":«lambda @ (string):6:9»}
thunkOfNodeType.Var:95: getting variable n: find scope: node Var:95 {}
2thunkOfNodeType.Var:95: getting variable n: find scope: parent Call:93 {}
thunkOfNodeType.Var:95: getting variable n: find scope: parent Call:93 {"n":1}
thunkOfNodeType.Var:95: done getting variable n: found in parent Call:93 {"n":1}
thunkOfNodeType.Lambda:22: setting variable i=1 on Lambda:25 {} for bodyNode Lambda:25 {}
thunkOfNodeType.Lambda:22: setting variable i=1 on Lambda:25 {"i":1} - done
thunkOfNodeType.Lambda:25: setting variable n=1 on Lambda:28 {} for bodyNode Lambda:28 {}
thunkOfNodeType.Lambda:25: setting variable n=1 on Lambda:28 {"n":1} - done
thunkOfNodeType.Lambda:28: setting variable m=1 on If:35 {} for bodyNode If:35 {}
thunkOfNodeType.Lambda:28: setting variable m=1 on If:35 {"m":1} - done
thunkOfNodeType.Var:38: getting variable i: find scope: node Var:38 {}
thunkOfNodeType.Var:38: getting variable i: find scope: parent Eq:38 {}
thunkOfNodeType.Var:38: getting variable i: find scope: parent If:35 {"m":1}
thunkOfNodeType.Var:38: getting variable i: find scope: parent Lambda:28 {}
thunkOfNodeType.Var:38: getting variable i: find scope: parent Lambda:25 {}
thunkOfNodeType.Var:38: getting variable i: find scope: parent Lambda:22 {}
thunkOfNodeType.Var:38: getting variable i: find scope: parent Attr:18 {}
thunkOfNodeType.Var:38: getting variable i: find scope: parent Let:12 {"f":«lambda @ (string):3:7»,"fib":«lambda @ (string):6:9»}
thunkOfNodeType.Var:38: getting variable i: find scope: parent Nix:0 {}
```

</details>

questions:

* where should we store variables?
* how do we read variables?

#### Let’s Build A Simple Interpreter

https://github.com/rspivak/lsbasi

https://ruslanspivak.com/lsbasi-part17/

> Let’s Build A Simple Interpreter. Part 17: Call Stack and Activation Records
>
> At its core, the new memory system is a stack data structure that holds dictionary-like objects as its elements. This stack is called the “call stack” because it’s used to track what procedure/function call is being currently executed. The call stack is also known as the run-time stack, execution stack, program stack, or just “the stack”. The dictionary-like objects that the call stack holds are called activation records. You may know them by another name: “stack frames”, or just “frames”.

> A very basic implementation could look like this:

```py
class Stack:
    def __init__(self):
        self.items = []

    def push(self, item):
        self.items.append(item)

    def pop(self):
        return self.items.pop()

    def peek(self):
        return self.items[-1]
```

> what is an activation record?
>
> For our purposes, an activation record is a dictionary-like object for maintaining information about the currently executing invocation of a procedure or function, and also the program itself. The activation record for a procedure invocation, for example, will contain the current values of its formal parameters and its local variables.

#### Lexical scope

https://chelseatroy.com/2021/05/06/how-to-implement-variable-assignment-in-a-programming-language/

> Lexical scope allows us to use specific tokens to identify when to create a new child environment. In Lox, we use curly braces for this {}, as do Swift and Java. Ruby also functions with curly braces, although using do..end is more idiomatic. Python determines scope with level of indentation.

#### crafting interpreters

https://craftinginterpreters.com/functions.html

https://craftinginterpreters.com/calls-and-functions.html

#### parser context objects

https://stackoverflow.com/questions/53724871/why-does-parser-generated-by-antlr-reuse-context-objects

> you should put your mutable state into your visitor object. For your specific problem that means having a **call stack** containing the local variables of each run-time function call. Each time a function starts execution, you can push a frame onto the stack and each time a function exits, you can pop it. That way the top of the stack will always contain the local variables of the function currently being executed.

#### interpret an abstract syntax tree without recursion

https://softwareengineering.stackexchange.com/questions/387526/how-can-one-interpret-an-abstract-syntax-tree-without-recursion

> How can one interpret an Abstract Syntax Tree without recursion?
>
> I just want to use a stack and not rely on the recursion capability of the host language.
>
> I can traverse the tree fine by just using a stack (i.e. without recursion) but the problem comes about when I need to resolve a value and then, e.g. assign the result of the evaluation.

> This article explains it well:
>
> https://web.archive.org/web/20120227170843/http://cs.saddleback.edu/rwatkins/CS2B/Lab%20Exercises/Stacks%20and%20Recursion%20Lab.pdf
>
> TOPIC: Stacks and Recursion Elimination

> You need an operand stack (to store intermediate values) as well as a call stack where you place something to remind you what to do next when you return from a sub-activity. 

> You can systematically calculate such an approach.
>
> Transformation 1: CPS transform
> https://en.wikipedia.org/wiki/Continuation-passing_style
>
> Transformation 2: Defunctionalization
> https://en.wikipedia.org/wiki/Defunctionalization
> We go through and replace each anonymous function (lambda) with a data constructor which will hold the free variables, and then write an apply function to interpret that data constructor as the body of the lambda it replaced.
>
> Finally, refactoring to a while-loop. We can think of the two arguments of evalS and of consumeStack as being mutable variables that are being updated as we go around a loop.

#### what would others do?

toy interpreters in javascript:

https://github.com/search?l=JavaScript&q=toy+interpreter&type=Repositories

##### scheme

https://github.com/shuding/scheme/blob/f8113e91c83293d7691c2249929020c3fd995fd4/src/core.js#L85

* class Scope

##### toy_lang

https://github.com/JustinSDK/toy_lang/blob/9f2966f060897bdd03b0016cd993520f08d0f52a/toy_lang/js/context.js#L80

* class Context

##### toy-interpreter

https://github.com/sanxiyn/toy-interpreter/blob/master/javascript/interpreter.js

no local scopes?

```js
function interpretCallExpression(context, ret, expression) {
  let func_ret = {};
  interpretExpression(context, func_ret, expression.callee);
  let func = func_ret.value;

  let values = [];
  for (let argument of expression.arguments) {
    let value_ret = {};
    interpretExpression(context, value_ret, argument);
    values.push(value_ret.value);
  }

  func(context, ret, values);
}
```

##### lisp-thing

https://github.com/jsh1/lisp-thing/blob/master/src/eval.js

note: env

```js
function eval_(form, env) {

  if (symbolp(fun)) {
    var value, term;
    switch (fun.sym) {

    case 'set!':
      return env_set(env, car(form), eval_(cadr(form), env));

  }

  fun = eval_(fun, env);

  if (macrop(fun)) {
    return eval_(apply(macro_function(fun), form), env);
  }

  return fun.apply(null, eval_list(form, env));
}
```

https://github.com/jsh1/lisp-thing/blob/master/src/repl.js

```js
// our global environment
var user_env = {};
var environment = list(user_env, Mcore, Mread, Meval, Mload, Mprint);

// FIXME: so it can be passed to load and eval!?
user_env.environment = environment;

      var result = Meval.eval(form, environment);
```

##### js-lisp

https://github.com/andrelaszlo/js-lisp/blob/master/js-lisp.js

note: scope

```js
    switch (prog[0]) {
    case 'lambda':
        var formal_parameters = prog[1];
        var lambda_body = prog[2];

        var lambda_fun = function() {
            if (formal_parameters.length != arguments.length) {
                throw new Error("Wrong number of args, " + arguments.length + " instead of " + formal_parameters.length);
            }

            // Bind the parameters to variables in the local scope.
            var scope = this.push();
            _.zip(formal_parameters, arguments).forEach(
                function(binding) {
                    scope.set(binding[0], binding[1]);
                });

            return interpret(lambda_body, scope);
        };

        lambda_fun.toString = function() { return "[Lambda]"; };

        return lambda_fun;
    case 'let':
        var scope = parent_scope.push();
        var bindings = prog[1];
        var body = prog[2];
        bindings.forEach(function(bind) {
            scope.set(bind[0], interpret(bind[1], parent_scope));
        });
      return interpret(body, scope);
    case 'set':
        var pairs = prog.slice(1);
        var name, value;
        for (var i = 0; i < pairs.length-1; i++) {
            name = pairs[i];
            value = interpret(pairs[i+1], parent_scope);
            parent_scope.set(name, value);
        }
        return value;
```

##### simple-lang

https://github.com/kesava/simple-lang/tree/master/app/js/simple

many files, but pretty

##### scheme.js

https://github.com/abstractOwl/scheme.js/blob/master/scheme.js

```js
    /**
     * Environment class containing the identifier mappings for the current
     * scope.
     */
    function Env(env, outer) {
        var children = [];
        outer.addChild(this);

        /**
         * Adds a child Env.
         *
         * @param {Env} child - Child to add
         */
        this.addChild = function (child) {
            children.push(child);
        };

        /**
         * Recursively looks up a symbol from the minimum scope up.
         *
         * @class Env
         * @param {string} sym - Symbol to look up
         * @return {Env} Environment containing this symbol's mapping
         */
        this.find = function (sym) {
            if (sym in env) {
                return this;
            } else {
                return outer.find(sym);
            }
        };

        /**
         * Returns the mapped value of the specified symbol in this scope.
         *
         * @class Env
         * @param {string} sym - Symbol to look up
         * @return Value the symbol maps to
         */
        this.get = function (sym) {
            return env[sym];
        };
```

##### joelisp-js

https://github.com/joeattueyi/joelisp-js/blob/master/main.js

note: Environment

```js
else if(expr[0] === 'fn'){
	//fn [args] expr
	//fn [a b] (* a b)
	//function(a,b){return a*b}
	var _vars = expr[1];
	var exp = expr[2];
	return function(){
	    return eval(exp, new Environment(_vars, Array.prototype.slice.call(arguments), env));
	}
}

else if(expr[0] === 'let'){
	//(let [x exp] exp)

	var bindings = expr[1];
	var body = expr[2];
	if(bindings.length % 2 !== 0) throw new Error("Bindings are not Even");

	var newEnv = new Environment(null,null,env);
	
	for(var i=0; i<bindings.length; i+=2){
	    newEnv.env[bindings[i]] = eval(bindings[i+1], newEnv);
	}
	return eval(body, newEnv);
}
```

```js
function Environment(parms, args, outer){
    this.env = {};
    if(outer){
	this.outer = outer;
    }
    if(parms && args){
	this.update(parms, args);
    }
};

Environment.prototype.find = function(v){
    if (this.env[v]){
	return this.env;
    }
    else if(this.outer.env[v]) {
	return this.outer.find(v);
    } else {
	console.log(this.env);
	throw new Error("Error while trying to find environment for "+ v );
    }
};

Environment.prototype.update =  function(arr1, arr2){
    //2 arrays, add arr1[0] arr2[0] to env as key value pairs
    var shortest = arr1.length < arr2.length ? arr1 : arr2;

    for(var i=0; i<shortest.length; i++){
	this.env[arr1[i]] = arr2[i];
    }
}
```

#### what would nix do?

nix/src/libmain/stack.cc

* detect stack overflow, usually from infinite recursion

nix/src/libexpr/eval.cc

* stack is allocated with boehmgc
* EvalState::autoCallFunction
* EvalState::callFunction

```cc
void EvalState::autoCallFunction(Bindings & args, Value & fun, Value & res)
{
    auto pos = fun.determinePos(noPos);

    forceValue(fun, pos);

    if (fun.type() == nAttrs) {
        auto found = fun.attrs->find(sFunctor);
        if (found != fun.attrs->end()) {
            Value * v = allocValue();
            callFunction(*found->value, fun, *v, pos);
            forceValue(*v, pos);
            return autoCallFunction(args, *v, res);
        }
    }

    if (!fun.isLambda() || !fun.lambda.fun->hasFormals()) {
        res = fun;
        return;
    }

    auto attrs = buildBindings(std::max(static_cast<uint32_t>(fun.lambda.fun->formals->formals.size()), args.size()));

    if (fun.lambda.fun->formals->ellipsis) {
        // If the formals have an ellipsis (eg the function accepts extra args) pass
        // all available automatic arguments (which includes arguments specified on
        // the command line via --arg/--argstr)
        for (auto & v : args)
            attrs.insert(v);
    } else {
        // Otherwise, only pass the arguments that the function accepts
        for (auto & i : fun.lambda.fun->formals->formals) {
            Bindings::iterator j = args.find(i.name);
            if (j != args.end()) {
                attrs.insert(*j);
            } else if (!i.def) {
                throwMissingArgumentError(i.pos, R"(cannot evaluate a function that has an argument without a value ('%1%')

Nix attempted to evaluate a function as a top level expression; in
this case it must have its arguments supplied either by default
values, or passed explicitly with '--arg' or '--argstr'. See
https://nixos.org/manual/nix/stable/expressions/language-constructs.html#functions.)", symbols[i.name],                 
                *fun.lambda.env, *fun.lambda.fun);
            }
        }
    }

    callFunction(fun, allocValue()->mkAttrs(attrs), res, noPos);
}
```

```cc
void EvalState::callFunction(Value & fun, size_t nrArgs, Value * * args, Value & vRes, const PosIdx pos)
{
    auto trace = evalSettings.traceFunctionCalls
        ? std::make_unique<FunctionCallTrace>(positions[pos])
        : nullptr;

    forceValue(fun, pos);

    Value vCur(fun);

    auto makeAppChain = [&]()
    {
        vRes = vCur;
        for (size_t i = 0; i < nrArgs; ++i) {
            auto fun2 = allocValue();
            *fun2 = vRes;
            vRes.mkPrimOpApp(fun2, args[i]);
        }
    };

    Attr * functor;

    while (nrArgs > 0) {

        if (vCur.isLambda()) {

            ExprLambda & lambda(*vCur.lambda.fun);

            auto size =
                (!lambda.arg ? 0 : 1) +
                (lambda.hasFormals() ? lambda.formals->formals.size() : 0);
            Env & env2(allocEnv(size));
            env2.up = vCur.lambda.env;

            Displacement displ = 0;

            if (!lambda.hasFormals())
                env2.values[displ++] = args[0];
            else {
                forceAttrs(*args[0], pos);

                if (lambda.arg)
                    env2.values[displ++] = args[0];

                /* For each formal argument, get the actual argument.  If
                   there is no matching actual argument but the formal
                   argument has a default, use the default. */
                size_t attrsUsed = 0;
                for (auto & i : lambda.formals->formals) {
                    auto j = args[0]->attrs->get(i.name);
                    if (!j) {
                        if (!i.def) throwTypeError(pos, "%1% called without required argument '%2%'",
                            lambda, i.name, *fun.lambda.env, lambda);
                        env2.values[displ++] = i.def->maybeThunk(*this, env2);
                    } else {
                        attrsUsed++;
                        env2.values[displ++] = j->value;
                    }
                }

                /* Check that each actual argument is listed as a formal
                   argument (unless the attribute match specifies a `...'). */
                if (!lambda.formals->ellipsis && attrsUsed != args[0]->attrs->size()) {
                    /* Nope, so show the first unexpected argument to the
                       user. */
                    for (auto & i : *args[0]->attrs)
                        if (!lambda.formals->has(i.name)) {
                            std::set<std::string> formalNames;
                            for (auto & formal : lambda.formals->formals)
                                formalNames.insert(symbols[formal.name]);
                            throwTypeError(
                                pos,
                                Suggestions::bestMatches(formalNames, symbols[i.name]),
                                "%1% called with unexpected argument '%2%'",
                                lambda, i.name, *fun.lambda.env, lambda);
                        }
                    abort(); // can't happen
                }
            }

            nrFunctionCalls++;
            if (countCalls) incrFunctionCall(&lambda);

            /* Evaluate the body. */
            try {
                auto dts = debugRepl
                    ? makeDebugTraceStacker(
                        *this, *lambda.body, env2, positions[lambda.pos],
                        "while evaluating %s",
                        lambda.name
                        ? concatStrings("'", symbols[lambda.name], "'")
                        : "anonymous lambda")
                    : nullptr;

                lambda.body->eval(*this, env2, vCur);
            } catch (Error & e) {
                if (loggerSettings.showTrace.get()) {
                    addErrorTrace(e, lambda.pos, "while evaluating %s",
                        (lambda.name
                            ? concatStrings("'", symbols[lambda.name], "'")
                            : "anonymous lambda"));
                    addErrorTrace(e, pos, "from call site%s", "");
                }
                throw;
            }

            nrArgs--;
            args += 1;
        }

        else if (vCur.isPrimOp()) {

            size_t argsLeft = vCur.primOp->arity;

            if (nrArgs < argsLeft) {
                /* We don't have enough arguments, so create a tPrimOpApp chain. */
                makeAppChain();
                return;
            } else {
                /* We have all the arguments, so call the primop. */
                nrPrimOpCalls++;
                if (countCalls) primOpCalls[vCur.primOp->name]++;
                vCur.primOp->fun(*this, pos, args, vCur);

                nrArgs -= argsLeft;
                args += argsLeft;
            }
        }

        else if (vCur.isPrimOpApp()) {
            /* Figure out the number of arguments still needed. */
            size_t argsDone = 0;
            Value * primOp = &vCur;
            while (primOp->isPrimOpApp()) {
                argsDone++;
                primOp = primOp->primOpApp.left;
            }
            assert(primOp->isPrimOp());
            auto arity = primOp->primOp->arity;
            auto argsLeft = arity - argsDone;

            if (nrArgs < argsLeft) {
                /* We still don't have enough arguments, so extend the tPrimOpApp chain. */
                makeAppChain();
                return;
            } else {
                /* We have all the arguments, so call the primop with
                   the previous and new arguments. */

                Value * vArgs[arity];
                auto n = argsDone;
                for (Value * arg = &vCur; arg->isPrimOpApp(); arg = arg->primOpApp.left)
                    vArgs[--n] = arg->primOpApp.right;

                for (size_t i = 0; i < argsLeft; ++i)
                    vArgs[argsDone + i] = args[i];

                nrPrimOpCalls++;
                if (countCalls) primOpCalls[primOp->primOp->name]++;
                primOp->primOp->fun(*this, pos, vArgs, vCur);

                nrArgs -= argsLeft;
                args += argsLeft;
            }
        }

        else if (vCur.type() == nAttrs && (functor = vCur.attrs->get(sFunctor))) {
            /* 'vCur' may be allocated on the stack of the calling
               function, but for functors we may keep a reference, so
               heap-allocate a copy and use that instead. */
            Value * args2[] = {allocValue(), args[0]};
            *args2[0] = vCur;
            /* !!! Should we use the attr pos here? */
            callFunction(*functor->value, 2, args2, vCur, pos);
            nrArgs--;
            args++;
        }

        else
            throwTypeError(pos, "attempt to call something which is not a function but %1%", vCur);
    }

    vRes = vCur;
}
```

#### what would toros do?

https://github.com/kamadorueda/toros/blob/764adeffce3a070ed260050c450d8b939160f126/src/interpreter/runtime.rs#L30

* Value::FunctionApplication
* Value::Function

```rs
impl Runtime {
    pub(crate) fn new() -> Runtime {
        Runtime { stack: LinkedList::new() }
    }

    fn add_stack_frame(&mut self, description: String, location: Location) {
        let stack_frame = RuntimeStackFrame { description, location };
        log::trace!("stack += {stack_frame}");
        self.stack.push_back(stack_frame);
    }
```

### lezer tree: node interface or cursor interface

which is better: node interface or cursor interface?

https://lezer.codemirror.net/docs/ref/#common.Tree

> most client code will want to use the TreeCursor or SyntaxNode interface

https://lezer.codemirror.net/docs/ref/#common.SyntaxNodeRef

> if you need an object that is guaranteed to stay stable in the future,
> you need to use the node accessor. (not the cursor)

https://lezer.codemirror.net/docs/ref/#common.SyntaxNode

> A syntax node provides an immutable pointer to a given node in a tree.
>
> When iterating over large amounts of nodes,
> you may want to use a mutable cursor instead, which is more efficient.

## javascript internals

https://blog.sessionstack.com/how-javascript-works-parsing-abstract-syntax-trees-asts-5-tips-on-how-to-minimize-parse-time-abfcf7e8a0c8

How JavaScript works: Parsing, Abstract Syntax Trees (ASTs) + 5 tips on how to minimize parse time

https://blog.sessionstack.com/how-does-javascript-actually-work-part-1-b0bacc073cf

How JavaScript works: an overview of the engine, the runtime, and the call stack

## float precision

```
nix-repl> 0.300001 # 6 digits after comma
0.300001

nix-repl> 0.3000001 # 7 digits after comma
0.3
```

### C++

```cc
#include <stdio.h>
int main(int argc, char *argv[])
{
	double a = 0.1;
    double b = 0.2;
    double result = a + b;
    printf("%.17f", result);
	return 0;
}
```

result:

> 0.30000000000000004

live demo: https://godbolt.org/z/WfxGTbxGa

## serialize data

* https://www.npmjs.com/package/pretty-format Stringify any JavaScript value.
  * https://github.com/facebook/jest/tree/main/packages/pretty-format

## live coding

### figwheel

https://figwheel.org/docs/reloadable_code.html

powered by: [Google Closure Compiler](https://developers.google.com/closure/compiler/)

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


