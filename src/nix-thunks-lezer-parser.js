import { NixEvalError, NixSyntaxError, NixEvalNotImplemented } from './nix-errors.js';
import { NixPrimops, nixTypeWithArticle } from './nix-primops-lezer-parser.js';
import { checkInfiniteLoop, resetInfiniteLoopCounter, } from './infinite-loop-counter.js';
import { getSourceProp } from './nix-utils.js'

// https://github.com/voracious/vite-plugin-node-polyfills/issues/4
import { join as joinPath } from 'node:path'
import { Env, getStringifyResult } from './nix-eval.js';
//import { join as joinPath } from 'path'

// jsdoc types
// https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html

/** @typedef { import("@lezer/common").SyntaxNode } SyntaxNode */
/** @typedef { import("./nix-eval.js").State } State */
/** @typedef { import("./nix-eval.js").Env } Env */



const stringifyValue = getStringifyResult({
  maximumDepth: 2,
  maximumBreadth: 10,
  indent: "  ",
})


 
/** @type {(node: SyntaxNode, label: string) => void} */
export function printNode(node, label = '') {
  let extraDepth = 0;
  if (label) {
    //console.log(label);
    extraDepth = 1; // indent the node
  }
  // note: this will print a trailing newline
  console.log(node.toString(0, 5, "  ", extraDepth));
}



/** @type {function(SyntaxNode): SyntaxNode} */
function skipComments(node) {
  //checkInfiniteLoop();
  while (
    node && (
      node.type.name == 'Comment' ||
      node.type.name == 'CommentBlock'
    )
  ) {
    node = node.nextSibling;
  }
  return node;
}

/** @type {function(SyntaxNode): SyntaxNode} */
function firstChild(node) {
  if (!(node = node.firstChild)) {
    //console.log(`firstChild: node.firstChild is empty`);
    return null;
  }
  if (!(node = skipComments(node))) {
    //console.log(`firstChild: skipComments failed`);
    return null;
  }
  return node;
}

/** @type {function(SyntaxNode): SyntaxNode} */
function nextSibling(node) {
  if (!(node = node.nextSibling)) {
    //console.log(`nextSibling: node.nextSibling is empty`);
    return null;
  }
  if (!(node = skipComments(node))) {
    //console.log(`nextSibling: skipComments failed`);
    return null;
  }
  return node;
}

/** @type {function(SyntaxNode, State): string} */
function nodeText(node, state) {
  // source = full source code of the Nix file
  // text = source code of this node
  return state.source.slice(node.from, node.to);
}

/** @type {function(SyntaxNode, State, Env): any} */
function callThunk(node, state, env) {
  if (!node.type.thunk) {
    throw new NixEvalNotImplemented(`thunk is undefined for type ${node.type.name}`);
  }
  return node.type.thunk(node, state, env);
}



/** @type {Record<string, (node: SyntaxNode, state: State, env: Env) => any>} */
const thunkOfNodeType = {};



/** @return {never} */
// TODO ignore typescript error: 'state' is declared but its value is never read. ts(6133)
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
thunkOfNodeType['⚠'] = (node, state, env) => {
  checkInfiniteLoop();
  //console.log('thunkOfNodeType.Error: node', node);
  // add context from _source? mostly not needed -> on demand or debounced
  throw new NixSyntaxError(`error at position ${node.from}`);
};



/** @return {any} */
thunkOfNodeType.Nix = (node, state, env) => {
  resetInfiniteLoopCounter();
  //console.log('thunkOfNodeType.Nix: node', node);
  const childNode = firstChild(node);
  if (!childNode) {
    // input is empty
    return;
  }
  //console.log(`thunkOfNodeType.Nix: call thunk of node`, childNode);
  return callThunk(childNode, state, env);
};



/** @return {null} */
thunkOfNodeType.NULL = () => {
  return null;
};

/** @return {boolean} */
thunkOfNodeType.TRUE = () => {
  return true;
};

/** @return {boolean} */
thunkOfNodeType.FALSE = () => {
  return false;
};



/** @return {any} */
thunkOfNodeType.Parens = (node, state, env) => {
  //console.log('thunkOfNodeType.Parens: node', node);
  const childNode = firstChild(node);
  if (!childNode) {
    throw NixSyntaxError("unexpected ')'");
  }
  return callThunk(childNode, state, env);
};



/** @return {bigint} */
thunkOfNodeType.Int = (node, state, env) => {
  //console.log('thunkOfNodeType.Int: node', node);
  //return parseInt(nodeText(node, state));
  // we need BigInt to diff Int vs Float
  // otherwise typeof(1.0) == "int"
  return BigInt(nodeText(node, state));
};



/** @return {number} */
thunkOfNodeType.Float = (node, state, env) => {
  //console.log('thunkOfNodeType.Int: node', node);
  return parseFloat(nodeText(node, state));
};



/** @return {string} */
thunkOfNodeType.Identifier = (node, state, env) => {
  //console.log('thunkOfNodeType.Identifier: node', node);
  return nodeText(node, state);
};



/** @return {function} */
thunkOfNodeType.Primop = (node, state, env) => {
  //console.log('thunkOfNodeType.Primop: node', node);
  const name = nodeText(node, state);
  //console.log('thunkOfNodeType.Primop: name', name);
  const func = NixPrimops[name];
  //console.log('thunkOfNodeType.Primop: func', func);
  if (!func) {
    throw new NixEvalNotImplemented(`primop ${name}`);
  }
  return func;
};



/** @return {number | bigint | string} */
thunkOfNodeType.Add = (node, state, env) => {

  // arithmetic addition or string concat

  checkInfiniteLoop();

  const [value1, value2] = get2Values(node, state, env, { caller: 'Add' })

  // string + string -> string
  if (typeof(value1) == 'string' && typeof(value2) == 'string') {
    return value1 + value2;
  }

  // ""+1
  if (typeof(value1) == 'string' && typeof(value2) == 'bigint') {
    throw new NixEvalError('cannot coerce an integer to a string')
  }
  // ""+1.0
  if (typeof(value1) == 'string' && typeof(value2) == 'number') {
    throw new NixEvalError('cannot coerce a float to a string')
  }
  // 1+""
  if (typeof(value1) == 'bigint' && typeof(value2) == 'string') {
    throw new NixEvalError('cannot add a string to an integer')
  }
  // 1.0+""
  if (typeof(value1) == 'number' && typeof(value2) == 'string') {
    throw new NixEvalError('cannot add a string to a float')
  }

  return NixPrimops.__add(value1)(value2);
};



/** @type {function(SyntaxNode, State, Env, Record<string, any>): [number, number]} */
function get2Numbers(node, state, env, options) {
  if (!options) options = {};
  if (!options.caller) options.caller = 'get2Numbers';

  let [value1, value2] = get2Values(node, state, env, options)

  if (typeof(value1) != typeof(value2)) {
    // float . int -> float
    value1 = parseFloat(value1)
    value2 = parseFloat(value2)
  }

  return [value1, value2];
}



/** @type {function(SyntaxNode, State, Env, Record<string, any>): [any, any]} */
function get2Values(node, state, env, options) {
  if (!options) options = {};
  if (!options.caller) options.caller = 'get2Values';
  //checkInfiniteLoop();
  //console.log('thunkOfNodeType.Mul: node', node);
  let childNode1 = firstChild(node);
  if (!childNode1) {
    throw new NixEvalError(`${options.caller}: no childNode1`)
  }

  // TODO eval now or eval later? deep or broad?
  const evalBroadFirst = true;
  let value1;
  let childNode2;
  if (evalBroadFirst) {
    childNode2 = nextSibling(childNode1);
    if (!childNode2) {
      throw new NixEvalError(`${options.caller}: no childNode2`)
    }
    //console.log('thunkOfNodeType.Mul: arg1 ...');
    value1 = callThunk(childNode1, state, env);
    //console.log('thunkOfNodeType.Mul: arg1', arg1);
  }
  else {
    // eval deep first
    //console.log('thunkOfNodeType.Mul: arg1 ...');
    value1 = callThunk(childNode1, state, env);
    //console.log('thunkOfNodeType.Mul: arg1', arg1);
    childNode2 = nextSibling(childNode1);
    if (!childNode2) {
      throw new NixEvalError(`${options.caller}: no childNode2`)
    }
  }

  //console.log('thunkOfNodeType.Mul: arg2 ...');
  let value2 = callThunk(childNode2, state, env);
  //console.log('thunkOfNodeType.Mul: arg2', arg2);

  return [value1, value2];
}



/*
thunkOfNodeType.Add = (node, state, env) => {
  const [value1, value2] = get2Numbers(node, state, { caller: 'Add' });
  return value1 + value2;
};
*/

thunkOfNodeType.Sub = (node, state, env) => {
  const [value1, value2] = get2Numbers(node, state, env, { caller: 'Sub' });
  return value1 - value2;
};

thunkOfNodeType.Mul = (node, state, env) => {
  const [value1, value2] = get2Numbers(node, state, env, { caller: 'Mul' });
  return value1 * value2;
};

thunkOfNodeType.Div = (node, state, env) => {
  const [value1, value2] = get2Numbers(node, state, env, { caller: 'Div' });
  if (value2 == 0) {
    throw NixEvalError('division by zero')
  }
  return value1 / value2;
};



/** @return {boolean} */
thunkOfNodeType.Not = (node, state, env) => {
  checkInfiniteLoop();
  //console.log('thunkOfNodeType.Add: node', node);
  let childNode = firstChild(node);
  if (!childNode) {
    throw new NixEvalError('Not: no childNode')
  }
  const value = callThunk(childNode, state, env);
  return !value;
};



/** @return {number | bigint} */
thunkOfNodeType.Neg = (node, state, env) => {
  checkInfiniteLoop();
  //console.log('thunkOfNodeType.Neg: node', node);
  let childNode = firstChild(node);
  if (!childNode) {
    throw new NixEvalError('Neg: no childNode')
  }
  const value = callThunk(childNode, state, env);
  // TODO check type
  // nix-repl> -{}
  // error: value is a set while an integer was expected
  return -value;
};



const debugCall = false

/** @return {any} */
thunkOfNodeType.Call = (node, state, env) => {

  state.stack.push(node)

  debugCall && console.log(`thunkOfNodeType.Call: state.stack:\n${state.stack}`)

  // call a function
  // TODO check types

  checkInfiniteLoop();
  //console.log('thunkOfNodeType.Call: node', node);

  let functionNode = firstChild(node);
  if (!functionNode) {
    throw new NixEvalError('Call: no functionNode')
  }
  // eval deep first: get functionValue now, childNode2 later
  //console.log('thunkOfNodeType.Call: functionNode', functionNode.type.name, functionNode);

  //if (functionNode.type.name == 'Primop' && nodeText(functionNode, state) == '__typeOf') {
    // call primop with syntax tree
    // TODO do more primops need access to syntax tree?
    // special case to handle
    // __typeOf 1.0
    // should return "float", but javascript has only "number" so returns "int"
    // WONTFIX?
    // this fails for complex cases:
    // __typeOf (0 + 1.0)
    // let x = 0; in __typeOf (x + 1.0)
  //}

  const functionValue = callThunk(functionNode, state, env);
  //console.log('thunkOfNodeType.Call: functionValue', functionValue);

  if (typeof(functionValue) != 'function') {
    throw new NixEvalError(`attempt to call something which is not a function but ${nixTypeWithArticle(functionValue)}`);
  }

  const argumentNode = nextSibling(functionNode);
  if (!argumentNode) {
    throw new NixEvalError('Call: no arg2')
  }

  //console.log('thunkOfNodeType.Call: argumentNode', argumentNode.type.name, argumentNode);

  const argumentValue = callThunk(argumentNode, state, env);
  //console.log('thunkOfNodeType.Call: argumentValue', argumentValue);

  return functionValue(argumentValue);

  /*
  // Lambda. also pass callNode
  // call function lambda(argumentValue)
  // Primop
  return functionValue.apply(callNode, [argumentValue]); // this == callNode
  //return functionValue(argumentNode, source);
  //return functionValue.apply(callNode, [argumentNode, source]);
  */
};



/** @return {any} */
thunkOfNodeType.If = (node, state, env) => {

  // if condition then expression else alternative

  checkInfiniteLoop();
  //console.log('thunkOfNodeType.If: node', node);

  let ifNode = firstChild(node);
  if (!ifNode) {
    throw new NixEvalError('If: no ifNode')
  }

  const ifValue = callThunk(ifNode, state, env);
  //console.log('thunkOfNodeType.If: ifValue', ifValue);

  const thenNode = nextSibling(ifNode);
  if (!thenNode) {
    throw new NixEvalError('If: no thenNode')
  }

  if (ifValue) {
    return callThunk(thenNode, state, env);
  }

  const elseNode = nextSibling(thenNode);
  if (!elseNode) {
    throw new NixEvalError('If: no elseNode')
  }

  return callThunk(elseNode, state, env);
};



/** @return {boolean} */
thunkOfNodeType.Eq = (node, state, env) => {
  let [value1, value2] = get2Values(node, state, env, { caller: 'thunkOfNodeType.Eq' })
  // TODO? types
  return (value1 == value2);
};



/** @return {boolean} */
thunkOfNodeType.NEq = (node, state, env) => {
  let [value1, value2] = get2Values(node, state, env, { caller: 'thunkOfNodeType.NEq' })
  // TODO? types
  return (value1 != value2);
};

/** @return {boolean} */
thunkOfNodeType.GT = (node, state, env) => {
  let [value1, value2] = get2Values(node, state, env, { caller: 'thunkOfNodeType.GT' })
  // TODO? types
  return (value1 > value2);
};



/** @typedef {any[]} LazyArray */
/** @return {LazyArray} */
thunkOfNodeType.List = (node, state, env) => {
  //console.log('thunkOfNodeType.List: list node type', node.type.name);
  //console.log('thunkOfNodeType.List: call stack', new Error());

  checkInfiniteLoop();

  // https://codetagteam.com/questions/any-way-to-define-getters-for-lazy-variables-in-javascript-arrays
  function LazyArray() {
    return new Proxy([], {
      get: (obj, prop) => {
        //if (typeof obj[prop] === 'function') {
        if (obj[prop] instanceof Function) {
          // replace the function with the result
          obj[prop] = obj[prop]()
        }
        return obj[prop]
      },
    })
  }

  /** @type {LazyArray} */
  var list = LazyArray();

  let childNode;

  if (!(childNode = firstChild(node))) {
    // empty list
    return list;
  }

  //console.log(`thunkOfNodeType.List: first childNode`, childNode);
  let idx = 0;
  while (true) {
    //checkInfiniteLoop();
    function getThunk(childNodeCopy) {
      // force copy of childNode
      // fix: thunkOfNodeType.List: call thunk of childNode null
      // this will "move" childNode from thunkOfNodeType.List to thunk
      // TODO better?
      return () => {
        //console.log('thunkOfNodeType.List value thunk: node', node.type.name, node);
        //console.log(`thunkOfNodeType.List: call thunk of childNode`, childNode);
        return callThunk(childNodeCopy, state, env);
      };
    }
    list[idx] = getThunk(childNode);

    if (!(childNode = nextSibling(childNode))) {
      break;
    }
    //console.log(`thunkOfNodeType.List: next childNode`, childNode);
    idx++;
  }
  //console.log('thunkOfNodeType.List: list parent node type', node.type.name);
  return list;
};



/** @return {string} */
thunkOfNodeType.String = (node, state, env) => {
  // similar to list: zero or more childNodes

  checkInfiniteLoop();

  let childNode;

  /** @type {string} */
  let result = '';

  if (!(childNode = firstChild(node))) {
    // empty string
    return result;
  }

  //console.log(`thunkOfNodeType.String: first childNode`, childNode);
  let idx = 0;

  while (true) {
    //checkInfiniteLoop();
    const stringPart = callThunk(childNode, state, env);
    result += stringPart;
    if (!(childNode = nextSibling(childNode))) {
      break;
    }
    //console.log(`thunkOfNodeType.String: next childNode`, childNode);
    idx++;
  }

  return result;
};



/** @return {string} */
thunkOfNodeType.StringContent = thunkOfNodeType.Identifier;



/** @return {string} */
thunkOfNodeType.PathAbsolute = thunkOfNodeType.Identifier;



/** @return {string} */
thunkOfNodeType.PathRelative = (node, state, env) => {
  const relativePath = nodeText(node, state);
  const absolutePath = joinPath('/home/user', relativePath);
  return absolutePath;
};



/** @typedef {Record<string, any>} LazyObject */
/** @return {Env} */
thunkOfNodeType.Set = (node, state, env) => {

  checkInfiniteLoop();

  //if (!node) {
  //  throw NixEvalError('Set: node is null')
  //}

  const childEnv = new Env(env);

  //console.log('thunkOfNodeType.Set: typeof(node)', typeof(node));

  //console.log('thunkOfNodeType.Set: typeof(node.firstChild)', typeof(node.firstChild));

  //if (!node.firstChild) {
  //  throw NixEvalError('Set: node.firstChild is empty. node:', node)
  //}

  //console.log('thunkOfNodeType.Set ------------------------');
  //console.log('thunkOfNodeType.Set: node', node);

  let attrNode;

  if (!(attrNode = firstChild(node))) {
    // empty set
    return childEnv;
  }

  while (true) {
    //checkInfiniteLoop();
    //console.log('thunkOfNodeType.Set: attrNode', attrNode);

    const keyNode = firstChild(attrNode);
    if (!keyNode) {
      throw new NixEvalError('Set Attr: no key');
    }
    //console.log('thunkOfNodeType.Set: keyNode', keyNode);

    const valueNode = nextSibling(keyNode);
    if (!valueNode) {
      throw new NixEvalError('Set Attr: no value');
    }
    //console.log('thunkOfNodeType.Set: valueNode', valueNode);

    //const copyNode = (node) => node;
    //const valueNodeCopy = copyNode(valueNode);

    const key = state.source.slice(keyNode.from, keyNode.to);
    //console.log('thunkOfNodeType.Set: key', key);

    function getThunk(valueNodeCopy) {
      // create local copy of valueNode
      return () => {
        //console.log(`Set key=${key}: value thunk: call thunk of valueNodeCopy`, valueNodeCopy)
        return valueNodeCopy.type.thunk(
          valueNodeCopy,
          //state, childEnv // RecSet
          state, env // Set
        );
      }
    }

    Object.defineProperty(childEnv.data, key, {
      get: getThunk(valueNode),
      enumerable: true,
      // fix: TypeError: Cannot redefine property: a
      configurable: true,
    });


    if (!(attrNode = nextSibling(attrNode))) {
      break;
    }
  }

  return childEnv;
};



/** @typedef {Record<string, any>} LazyObject */

const debugRecSet = false

/** @return {Env} */
thunkOfNodeType.RecSet = (node, state, env) => {

  // depends on Var
  // TODO refactor with Set

  checkInfiniteLoop();

  const childEnv = new Env(env);

  //console.log('thunkOfNodeType.Set: typeof(node)', typeof(node));

  //console.log('thunkOfNodeType.Set: typeof(node.firstChild)', typeof(node.firstChild));

  //if (!node.firstChild) {
  //  throw NixEvalError('Set: node.firstChild is empty. node:', node)
  //}

  //console.log('thunkOfNodeType.Set ------------------------');
  //console.log('thunkOfNodeType.Set: node', node);

  let attrNode;

  if (!(attrNode = firstChild(node))) {
    // empty set
    return childEnv;
  }

  while (true) {
    //checkInfiniteLoop();
    //console.log('thunkOfNodeType.Set: attrNode', attrNode);

    const keyNode = firstChild(attrNode);
    if (!keyNode) {
      throw new NixEvalError('Set Attr: no key');
    }
    //console.log('thunkOfNodeType.Set: keyNode', keyNode);

    const valueNode = nextSibling(keyNode);
    if (!valueNode) {
      throw new NixEvalError('Set Attr: no value');
    }
    //console.log('thunkOfNodeType.Set: valueNode', valueNode);

    //const copyNode = (node) => node;
    //const valueNodeCopy = copyNode(valueNode);

    const key = state.source.slice(keyNode.from, keyNode.to);
    debugRecSet && console.log(`thunkOfNodeType.RecSet:${node.from}: key`, key);

    function getThunk(valueNodeCopy) {
      // create local copy of valueNode
      // TODO? const valueNodeCopy = valueNode
      return () => {
        //console.log(`Set value thunk: call thunk of valueNodeCopy`, valueNodeCopy)
        return valueNodeCopy.type.thunk(
          valueNodeCopy,
          state, childEnv
        );
      }
    }

    Object.defineProperty(childEnv.data, key, {
      get: getThunk(valueNode),
      enumerable: true,
      // fix: TypeError: Cannot redefine property: a
      configurable: true,
    });

    if (!(attrNode = nextSibling(attrNode))) {
      break;
    }
  }

  return childEnv;
};



const debugSelect = false

// void ExprSelect::eval(EvalState & state, Env & env, Value & v)
/** @return {any} */
thunkOfNodeType.Select = (node, state, env) => {
  // first child: Set
  // other children: attr keys
  checkInfiniteLoop();
  const setNode = firstChild(node);
  if (!setNode) {
    throw new NixEvalError('Select: no setNode')
  }

  // e->eval(state, env, vTmp);
  // call thunk of Set or RecSet
  /** @type {Env} */
  const setValue = callThunk(setNode, state, env);
  debugSelect && console.log(`thunkOfNodeType.Select:${node.from}: setValue`, setValue)

  let keyNode = nextSibling(setNode);
  if (!keyNode) {
    throw new NixEvalError('Select: no keyNode')
  }

  let result = setValue;

  // loop attrPath
  // for (auto & i : attrPath) {
  while (keyNode) {
    // auto name = getName(i, state, env);
    const keyValue = callThunk(keyNode, state, env);

    // state.forceAttrs(*vAttrs, pos);

    // j = vAttrs->attrs->find(name)

    // if (j == vAttrs->attrs->end())
    //   state.throwEvalError(pos, , "attribute '%1%' missing"
    debugSelect && console.log(`thunkOfNodeType.Select:${node.from}: result`, result)
    if (!Object.hasOwn(result.data, keyValue)) {
      throw new NixEvalError(`attribute '${keyValue}' missing`)
    }

    // vAttrs = j->value;
    // not: dont use result.get(keyValue)
    // because that would also search in parent env's
    result = result.data[keyValue];

    keyNode = nextSibling(keyNode);
  }

  return result;
};



/** @return {any} */
thunkOfNodeType.Var = (node, state, env) => {
  // input: a
  // tree:
  // Nix: a
  //   Var: a
  //     Identifier: a
  checkInfiniteLoop();
  const keyNode = firstChild(node);
  if (!keyNode) {
    throw new NixEvalError('Var: no keyNode')
  }
  // FIXME source is undefined when called from Call
  const key = nodeText(keyNode, state);
  //console.log(`thunkOfNodeType.Var: key`, key);

  const value = env.get(key)

  if (value === undefined) {
    throw new NixEvalError(`undefined variable '${key}'`);
  }

  return value
};



/** @return {function} */
thunkOfNodeType.Lambda = (node, state, env) => {
  checkInfiniteLoop();
  const argumentNode = firstChild(node);
  if (!argumentNode) {
    throw new NixEvalError('Lambda: no argumentNode')
  }

  let bodyNode = nextSibling(argumentNode);
  if (!bodyNode) {
    throw new NixEvalError('Lambda: no bodyNode')
  }

  if (argumentNode.type.name != 'Identifier') {
    throw new NixEvalNotImplemented(`Lambda: argumentNode type ${argumentNode.type.name} is not implemented: ${nodeText(argumentNode, state)}`)
  }

  // argumentNode.type.name == 'Identifier'
  // simple function: f = x: (x + 1)
  const argumentName = nodeText(argumentNode, state);

  function lambda(argumentValue) {
    // lambda is called from Call
    // TODO handle complex args: formals, formals-at-binding
    const childEnv = new Env(env, {
      [argumentName]: argumentValue,
    });
    return callThunk(bodyNode, state, childEnv);
  }

  // store source location of lambda
  lambda.source = getSourceProp(node, state);

  return lambda;
};



thunkOfNodeType.Let = (node, state, env) => {
  // syntax sugar: let a=1; in a -> rec {a=1;}.a

  // depends on Var
  // TODO refactor with Set, RecSet

  checkInfiniteLoop();

  const childEnv = new Env(env, {});

  //console.log('thunkOfNodeType.Let: node', node);

  let childNode;

  if (!(childNode = firstChild(node))) {
    throw new NixEvalError('Let: no key')
  }

  while (true) {
    //checkInfiniteLoop();
    //console.log('thunkOfNodeType.Let: childNode', childNode);

    let nextChildNode = nextSibling(childNode);

    if (nextChildNode) {
      const attrNode = childNode;

      // copy paste from Set, RecSet
      const keyNode = firstChild(attrNode);
      if (!keyNode) {
        throw new NixEvalError('Let Attr: no key');
      }
      //console.log('thunkOfNodeType.Let: keyNode', keyNode);

      const valueNode = nextSibling(keyNode);
      if (!valueNode) {
        throw new NixEvalError('Let Attr: no value');
      }
      //console.log('thunkOfNodeType.Let: valueNode', valueNode);

      const key = state.source.slice(keyNode.from, keyNode.to);
      //console.log('thunkOfNodeType.Let: key', key);

      function getThunk(valueNodeCopy) {
        // create local copy of valueNode
        return () => {
          return valueNodeCopy.type.thunk(
            valueNodeCopy,
            state, childEnv
          );
        }
      }

      Object.defineProperty(childEnv.data, key, {
        get: getThunk(valueNode),
        enumerable: true,
        configurable: true,
      });

      childNode = nextChildNode;
    }

    else {
      // last childNode: similar to bodyNode in Lambda
      return callThunk(childNode, state, childEnv);
    }
  }
};



/*

TODO LibraryPath

nix/src/libexpr/parser.y

"StringPath" in lezer-parser-nix/src/nix.grammar

== content of <...> LibraryPath

SearchPath?
SystemPath?

  | SPATH {
      std::string path($1.p + 1, $1.l - 2);
      $$ = new ExprCall(CUR_POS,
          new ExprVar(data->symbols.create("__findFile")),
          {new ExprVar(data->symbols.create("__nixPath")),
           new ExprString(path)});



TODO Var

Var("__nixPath")

-> parse env $NIX_PATH

nix-repl> __nixPath       
[ { ... } { ... } { ... } ]

nix-repl> __elemAt
__elemAt
nix-repl> __elemAt __nixPath 0
{ path = "/home/user/.nix-defexpr/channels"; prefix = ""; }

nix-repl> __elemAt __nixPath 1
{ path = "/nix/store/k6h78frhk0w6ll4w7dfdh7fa5y0kdxkq-source/nixos"; prefix = "nixos"; }

nix-repl> __elemAt __nixPath 2
{ path = "/nix/store/k6h78frhk0w6ll4w7dfdh7fa5y0kdxkq-source"; prefix = "nixpkgs"; }



Var("__findFile")
-> primop __findFile

*/



export { thunkOfNodeType }
