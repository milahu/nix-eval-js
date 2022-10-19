# challenges

## recursive function calls

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

### Let’s Build A Simple Interpreter

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

### Lexical scope

https://chelseatroy.com/2021/05/06/how-to-implement-variable-assignment-in-a-programming-language/

> Lexical scope allows us to use specific tokens to identify when to create a new child environment. In Lox, we use curly braces for this {}, as do Swift and Java. Ruby also functions with curly braces, although using do..end is more idiomatic. Python determines scope with level of indentation.

### crafting interpreters

https://craftinginterpreters.com/functions.html

https://craftinginterpreters.com/calls-and-functions.html

### parser context objects

https://stackoverflow.com/questions/53724871/why-does-parser-generated-by-antlr-reuse-context-objects

> you should put your mutable state into your visitor object. For your specific problem that means having a **call stack** containing the local variables of each run-time function call. Each time a function starts execution, you can push a frame onto the stack and each time a function exits, you can pop it. That way the top of the stack will always contain the local variables of the function currently being executed.

### interpret an abstract syntax tree without recursion

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

### what would others do?

toy interpreters in javascript:

https://github.com/search?l=JavaScript&q=toy+interpreter&type=Repositories

#### scheme

https://github.com/shuding/scheme/blob/f8113e91c83293d7691c2249929020c3fd995fd4/src/core.js#L85

* class Scope

#### toy_lang

https://github.com/JustinSDK/toy_lang/blob/9f2966f060897bdd03b0016cd993520f08d0f52a/toy_lang/js/context.js#L80

* class Context

#### toy-interpreter

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

#### lisp-thing

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

#### js-lisp

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

#### simple-lang

https://github.com/kesava/simple-lang/tree/master/app/js/simple

many files, but pretty

#### scheme.js

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

#### joelisp-js

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

### what would nix do?

nix/src/libmain/stack.cc

* detect stack overflow, usually from infinite recursion

nix/src/libexpr/eval.hh

```cc
class EvalState : public std::enable_shared_from_this<EvalState>
{
    EvalState(
        const Strings & _searchPath,
        ref<Store> store,
        std::shared_ptr<Store> buildStore = nullptr
    );

    SearchPath searchPath;

    /* The base environment, containing the builtin functions and
       values. */
    Env & baseEnv;

    /* Evaluate an expression to normal form, storing the result in
       value `v'. */
    void eval(Expr * e, Value & v);

    inline Value * lookupVar(Env * env, const ExprVar & var, bool noEval);

    void callFunction(Value & fun, size_t nrArgs, Value * * args, Value & vRes, const PosIdx pos);

    void concatLists(Value & v, size_t nrLists, Value * * lists, const PosIdx pos);
}
```

nix/src/libexpr/eval.hh


```cc
    Setting<bool> traceFunctionCalls{this, false, "trace-function-calls",
        R"(
          If set to `true`, the Nix evaluator will trace every function call.
          Nix will print a log message at the "vomit" level for every function
          entrance and function exit.

              function-trace entered undefined position at 1565795816999559622
              function-trace exited undefined position at 1565795816999581277
              function-trace entered /nix/store/.../example.nix:226:41 at 1565795253249935150
              function-trace exited /nix/store/.../example.nix:226:41 at 1565795253249941684

          The `undefined position` means the function call is a builtin.

          Use the `contrib/stack-collapse.py` script distributed with the Nix
          source code to convert the trace logs in to a format suitable for
          `flamegraph.pl`.
        )"};
```

nix/src/libexpr/eval.cc

```cc
void EvalState::callFunction(Value & fun, size_t nrArgs, Value * * args, Value & vRes, const PosIdx pos)
{
    auto trace = evalSettings.traceFunctionCalls
        ? std::make_unique<FunctionCallTrace>(positions[pos])
        : nullptr;
```

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

### what would toros do?

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

## lezer tree: node interface or cursor interface

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
