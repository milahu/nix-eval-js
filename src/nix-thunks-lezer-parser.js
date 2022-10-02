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



const debugAllThunks = false

// Let Lambda Call var
const debugCallStack = false



const stringifyValue = getStringifyResult({
  maximumDepth: 2,
  maximumBreadth: 10,
  indent: "  ",
})


 
/** @type {(node: SyntaxNode, label: string) => void} */
export function printNode(node, state, env, options = {}) {
  if (!options) options = {};
  const label = options.label || '';
  let extraDepth = 0;
  if (label) {
    //console.log(label);
    extraDepth = 1; // indent the node
  }
  // note: this will print a trailing newline
  //console.log(node.toString(0, 5, "  ", extraDepth));
  const nodeSource = state.source.slice(node.from, node.to)
  console.log((label ? (label + ': ') : '') + `${node.type.name}: ${nodeSource}`);
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
export function firstChild(node) {
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
export function nextSibling(node) {
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
export function nodeText(node, state) {
  // source = full source code of the Nix file
  // text = source code of this node
  return state.source.slice(node.from, node.to);
}

/** @type {function(SyntaxNode, State, Env): any} */
export function callThunk(node, state, env) {
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



/** @type {function(SyntaxNode, State, Env, Record<string, any>): [boolean, boolean]} */
function get2Bools(node, state, env, options) {
  const [value1, value2] = get2Values(node, state, env, options)
  if (value1 !== true && value1 !== false) {
    throw new NixEvalError(`value is ${nixTypeWithArticle(value1)} while a Boolean was expected`)
  }
  if (value2 !== true && value2 !== false) {
    throw new NixEvalError(`value is ${nixTypeWithArticle(value2)} while a Boolean was expected`)
  }
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



const debugCall = debugAllThunks || debugCallStack || false

/** @return {any} */
thunkOfNodeType.Call = (node, state, env) => {

  state.stack.push(node)

  //debugCall && console.log(`thunkOfNodeType.Call: state.stack:\n${state.stack}`)
  debugCall && console.log(`thunkOfNodeType.Call: stack size: ${state.stack.stack.length}`);
  debugVar && console.log(`Call: stack`, new Error().stack);
  if (debugCall && state.stack.stack.length > 5) {
    throw new Error('stack size')
  }

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

  // TODO env? or is this done in Lambda?
  // nix.cc does this in EvalState::callFunction
  // Env & env2(allocEnv(size));

  // lambda.body->eval(*this, env2, vCur);
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
thunkOfNodeType.And = (node, state, env) => {
  const [value1, value2] = get2Bools(node, state, env, { caller: 'thunkOfNodeType.And' })
  return (value1 && value2);
};

/** @return {boolean} */
thunkOfNodeType.Or = (node, state, env) => {
  const [value1, value2] = get2Bools(node, state, env, { caller: 'thunkOfNodeType.Or' })
  return (value1 || value2);
};

/** @return {boolean} */
thunkOfNodeType.Imply = (node, state, env) => {
  // Logical implication
  // (a -> b) == (!a || b)
  const [value1, value2] = get2Values(node, state, env, { caller: 'thunkOfNodeType.Imply' })
  if (value1 !== true && value1 !== false) {
    throw new NixEvalError(`value is ${nixTypeWithArticle(value1)} while a Boolean was expected`)
  }
  if (value1 === false) {
    return true;
  }
  if (value2 !== true && value2 !== false) {
    throw new NixEvalError(`value is ${nixTypeWithArticle(value2)} while a Boolean was expected`)
  }
  return value2;
};



/** @return {boolean} */
thunkOfNodeType.NEq = (node, state, env) => {
  let [value1, value2] = get2Values(node, state, env, { caller: 'thunkOfNodeType.NEq' })
  // TODO? types
  return (value1 != value2);
};

/** @return {boolean} */
thunkOfNodeType.GT = (node, state, env) => {
  let [value1, value2] = get2Numbers(node, state, env, { caller: 'thunkOfNodeType.GT' })
  return (value1 > value2);
};

/** @return {boolean} */
thunkOfNodeType.GE = (node, state, env) => {
  let [value1, value2] = get2Numbers(node, state, env, { caller: 'thunkOfNodeType.GE' })
  return (value1 >= value2);
};

/** @return {boolean} */
thunkOfNodeType.LT = (node, state, env) => {
  let [value1, value2] = get2Numbers(node, state, env, { caller: 'thunkOfNodeType.LT' })
  return (value1 < value2);
};

/** @return {boolean} */
thunkOfNodeType.LE = (node, state, env) => {
  let [value1, value2] = get2Numbers(node, state, env, { caller: 'thunkOfNodeType.LE' })
  return (value1 <= value2);
};



/** @typedef {any[]} LazyArray */
/** @return {LazyArray} */
thunkOfNodeType.List = (node, state, env) => {
  //console.log('thunkOfNodeType.List: list node type', node.type.name);
  //console.log('thunkOfNodeType.List: call stack', new Error());

  checkInfiniteLoop();

  class LazyArrayThunk {
    constructor(thunk) {
      this.thunk = thunk;
    }
  }

  const debugLazyArray = debugAllThunks || false

  // https://codetagteam.com/questions/any-way-to-define-getters-for-lazy-variables-in-javascript-arrays
  function LazyArray() {
    return new Proxy([], {
      get: (obj, prop) => {
        // note: prop can be Symbol.iterator
        debugLazyArray && console.log(`LazyArray.get`, prop, typeof(prop), )
        // TODO benchmark. less conditions = faster?
        /*
        if (obj[prop] instanceof LazyArrayThunk) {
          obj[prop] = obj[prop].thunk()
        }
        */
        if (
          obj[prop] instanceof Function &&
          (
            (typeof(prop) == 'string' && /^[0-9]+$/.test(prop)) ||
            typeof(prop) == 'number' // not reachable?
          )
          // TODO benchmark
          //(obj[prop].__isLazyArrayThunk == true)
        ) {
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

      /* TODO benchmark
      const thunk = function () {
        return callThunk(childNodeCopy, state, env);
      }
      thunk.__isLazyArrayThunk == true;
      return thunk;
      */
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



const debugConcat = debugAllThunks || false

/** @return {LazyArray} */
thunkOfNodeType.Concat = (node, state, env) => {

  // list concat

  checkInfiniteLoop();

  const [list1, list2] = get2Values(node, state, env, { caller: 'Concat' })

  debugConcat && console.log(`thunkOfNodeType.Concat: list1`, typeof(list1), list1.length, list1);
  debugConcat && console.log(`thunkOfNodeType.Concat: list2`, typeof(list2), list2.length, list2);

  // TODO check types

  if (list1.length == 0) {
    return list2;
  }

  if (list2.length == 0) {
    return list1;
  }

  for (const itemThunk of list2) {
    list1.push(itemThunk);
  }

  return list1;
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



// TODO remove indent
/** @return {string} */
thunkOfNodeType.IndentedString = (node, state, env) => {
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

  // TODO remove indent

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
thunkOfNodeType.StringInterpolation = (node, state, env) => {

  checkInfiniteLoop();

  let childNode = firstChild(node);

  if (!childNode) {
    return '';
  }

  const childValue = callThunk(childNode, state, env);

  if (typeof(childValue) != 'string') {
    throw new NixEvalError(`cannot coerce ${nixTypeWithArticle(childValue)} to a string`)
  }

  return childValue;
};



/** @return {string} */
thunkOfNodeType.IndentedStringInterpolation = thunkOfNodeType.StringInterpolation;



/** @return {string} */
thunkOfNodeType.StringContent = thunkOfNodeType.Identifier;



/** @return {string} */
thunkOfNodeType.IndentedStringContent = thunkOfNodeType.StringContent;



/** @return {string} */
thunkOfNodeType.PathAbsolute = thunkOfNodeType.Identifier;



/** @return {string} */
thunkOfNodeType.PathRelative = (node, state, env) => {
  const relativePath = nodeText(node, state);
  const absolutePath = joinPath('/home/user', relativePath);
  return absolutePath;
};



/** @typedef {Record<string, any>} LazyObject */

/**
* Set and RecSet
*
* @return {Env}
*/

thunkOfNodeType.Set = thunkOfNodeType.RecSet = (node, state, env) => {

  const debugSet = debugAllThunks || debugCallStack || false

  checkInfiniteLoop();

  const childEnv = env.newChild(node);

  debugSet && printNode(node, state, env, { label: 'node' });

  let attrNode;

  if (!(attrNode = firstChild(node))) {
    // empty set
    return childEnv;
  }

  while (attrNode) {
    //checkInfiniteLoop();
    debugSet && printNode(attrNode, state, env, { label: 'attrNode' });

    if (attrNode.type.name == 'Attr') {

      const keyNode = firstChild(attrNode);
      if (!keyNode) {
        throw new NixEvalError('Set Attr: no key');
      }
      debugSet && printNode(keyNode, state, env, { label: 'keyNode' });

      const key = state.source.slice(keyNode.from, keyNode.to);
      debugSet && console.log(`thunkOfNodeType.${node.type.name}: key`, key);

      const valueNode = nextSibling(keyNode);
      debugSet && printNode(valueNode, state, env, { label: 'valueNode' });

      const valueEnv = (node.type.name == 'Set'
        ? env // Set
        : childEnv // RecSet
      );

      const getValue = () => (
        valueNode.type.thunk(valueNode, state, valueEnv)
      );

      Object.defineProperty(childEnv.data, key, {
        get: getValue,
        enumerable: true,
        // fix: TypeError: Cannot redefine property: a
        configurable: true,
      });
    }

    else if (attrNode.type.name == 'AttrInherit') {
      // loop inherit keys. zero or more
      let inheritKeyNode = firstChild(attrNode);
      while (inheritKeyNode) {
        const inheritKey = nodeText(inheritKeyNode, state);
        // greedy eval of unused value:
        // nix-repl> (let a=1; in { inherit a z; }).a
        // error: undefined variable 'z'
        // greedy eval
        const inheritValue = env.get(inheritKey);
        if (inheritValue === undefined) {
          throw new NixEvalError(`undefined variable '${inheritKey}'`)
        }
        const getInheritValue = () => inheritValue;
        // lazy eval
        //const getValue = () => env.get(inheritKey);
        Object.defineProperty(childEnv.data, inheritKey, {
          get: getInheritValue,
          enumerable: true,
          configurable: true,
        });

        inheritKeyNode = nextSibling(inheritKeyNode);
      }
    }

    else if (attrNode.type.name == 'AttrInheritFrom') {
      const inheritSetNode = firstChild(attrNode);
      let inheritKeyNode = nextSibling(inheritSetNode);
      if (!inheritKeyNode) {
        // no inheritKeys -> ignore inheritSet type errors
        // nix-repl> let a=1; in { inherit (a); }
        // { }
        attrNode = nextSibling(attrNode);
        continue;
      }
      // 1 or more inheritKeys -> eval inheritSet
      const inheritSetValue = callThunk(inheritSetNode, state, env);
      if (!(inheritSetValue instanceof Env)) {
        throw new NixEvalError(`error: value is ${nixTypeWithArticle(inheritSetValue)} while a set was expected`)
      }
      while (inheritKeyNode) {
        const inheritKey = nodeText(inheritKeyNode, state);
        // greedy eval of unused value:
        // nix-repl> (let a=1; in { inherit a z; }).a
        // error: undefined variable 'z'
        // greedy eval
        const inheritValue = inheritSetValue.data[inheritKey];
        if (inheritValue === undefined) {
          throw new NixEvalError(`attribute '${inheritKey}' missing`)
        }
        const getInheritValue = () => inheritValue;
        // lazy eval
        //const getValue = () => env.get(inheritKey);
        Object.defineProperty(childEnv.data, inheritKey, {
          get: getInheritValue,
          enumerable: true,
          configurable: true,
        });

        inheritKeyNode = nextSibling(inheritKeyNode);
      }
    }

    else {
      throw new NixEvalNotImplemented(`Set Attr: attrNode type ${attrNode.type.name}`);
    }

    attrNode = nextSibling(attrNode);
  }

  return childEnv;
};



const debugSelect = debugAllThunks || false

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



const debugHasAttr = debugAllThunks || false

/** @return {boolean} */
thunkOfNodeType.HasAttr = (node, state, env) => {
  // similar to Select, but dont return the value
  checkInfiniteLoop();
  const setNode = firstChild(node);
  if (!setNode) {
    throw new NixEvalError('HasAttr: no setNode')
  }

  // call thunk of Set or RecSet
  /** @type {Env} */
  const setValue = callThunk(setNode, state, env);
  debugHasAttr && console.log(`thunkOfNodeType.HasAttr:${node.from}: setValue`, setValue)

  let keyNode = nextSibling(setNode);
  if (!keyNode) {
    // this should be unreachable
    throw new NixEvalError('HasAttr: no keyNode')
  }

  let result = setValue;

  // loop attrPath
  while (keyNode) {
    const keyValue = callThunk(keyNode, state, env);

    debugHasAttr && console.log(`thunkOfNodeType.HasAttr:${node.from}: result`, result)
    if (!(result instanceof Env)) {
      // nix-repl> 1?z  
      // false
      // nix-repl> {a=1;}?a.z
      // false
      return false
    }
    if (!Object.hasOwn(result.data, keyValue)) {
      // nix-repl> {a=1;}?z
      // false
      return false;
    }

    const nextKeyNode = nextSibling(keyNode);

    if (!nextKeyNode) {
      // nix-repl> {a=1;}?a  
      // true
      return true;
    }

    // note: dont use result.get(keyValue)
    // because that would also search in parent env's
    result = result.data[keyValue];

    keyNode = nextKeyNode;
  }

  // this should be unreachable
  throw new NixEvalError('HasAttr: no keyNodes')
};



const debugUpdate = debugAllThunks || false

/** @return {LazyArray} */
thunkOfNodeType.Update = (node, state, env) => {

  // list concat

  checkInfiniteLoop();

  const [set1, set2] = get2Values(node, state, env, { caller: 'Update' })

  debugUpdate && console.log(`thunkOfNodeType.Update: set1`, typeof(set1), set1);
  debugUpdate && console.log(`thunkOfNodeType.Update: set2`, typeof(set2), set2);

  if (!(set1 instanceof Env)) {
    throw new NixEvalError(`value is ${nixTypeWithArticle(set1)} while a set was expected`)
  }

  if (!(set2 instanceof Env)) {
    throw new NixEvalError(`value is ${nixTypeWithArticle(set2)} while a set was expected`)
  }

  if (Object.keys(set1.data).length == 0) {
    return set2;
  }

  if (Object.keys(set2.data).length == 0) {
    return set1;
  }

  for (const key in set2.data) {
    // TypeError: Cannot set property a of #<Object> which has only a getter
    //set1.data[key] = set2.data[key];
    Object.defineProperty(set1.data, key, {
      get: () => set2.data[key], // TODO better? copy the getter function
      enumerable: true,
      configurable: true,
    });
  }

  return set1;
};



/**
* The `with` statement introduces a set's values
* into the lexical scope of the following expression.
*
* @return {any}
*/

thunkOfNodeType.With = (node, state, env) => {

  const debugWith = debugAllThunks || false;

  checkInfiniteLoop();

  const setNode = firstChild(node);
  if (!setNode) {
    throw new NixEvalError('With: no setNode')
  }

  const exprNode = nextSibling(setNode);
  if (!exprNode) {
    // this should be unreachable
    throw new NixEvalError('With: no exprNode')
  }

  // call thunk of Set or RecSet
  /** @type {Env} */
  const setValue = callThunk(setNode, state, env);
  debugWith && console.log(`thunkOfNodeType.With:${node.from}: setValue`, setValue)
  if (!(setValue instanceof Env)) {
    // ignore type errors
    // nix-repl> with null; 1
    // 1
    // nix-repl> with ""; 1
    // 1
    return callThunk(exprNode, state, env);
  }

  const childEnv = env.newChild(node);
  childEnv.data = setValue.data;
  return callThunk(exprNode, state, childEnv);
};



const debugVar = debugAllThunks || false

/** @return {any} */
thunkOfNodeType.Var = (node, state, env) => {
  // input: a
  // tree:
  // Nix: a
  //   Var: a
  //     Identifier: a
  checkInfiniteLoop();
  debugVar && printNode(node, state, env);
  //debugVar && console.log(`Var: stack`, new Error().stack);
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
  let argumentNode = firstChild(node);
  if (!argumentNode) {
    throw new NixEvalError('Lambda: no argumentNode')
  }

  let bodyNode = nextSibling(argumentNode);
  if (!bodyNode) {
    throw new NixEvalError('Lambda: no bodyNode')
  }

  if (
    argumentNode.type.name == 'Identifier' &&
    bodyNode.type.name != 'Formals'
  ) {
    // simple function: f = x: (x + 1)
    // bind arguments
    const argumentName = nodeText(argumentNode, state);
    /** @type {function(any): any} */
    const lambda = function lambda(argumentValue) {
      const childEnv = env.newChild(node);
      childEnv.data[argumentName] = argumentValue;
      // eval function body
      return callThunk(bodyNode, state, childEnv);
    }
    // store source location
    lambda.source = getSourceProp(node, state);
    // lambda is called from Call
    return lambda;
  }

  // function with formals: f = {x, y, ...} @ args: (x + 1)

  const debugFormals = debugAllThunks || false;

  let formalsBindingName = null;
  const formalNameSet = new Set();
  const formalDefaultNodeMap = {};
  let formalsRest = false;

  if (argumentNode.type.name == 'Identifier') {
    // formals with left binding: f = args @ {...}: args
    formalsBindingName = nodeText(argumentNode, state);
    argumentNode = nextSibling(argumentNode);
  }

  if (argumentNode.type.name != 'Formals') {
    throw new NixEvalError(`Lambda: expected Formals, found ${argumentNode.type.name}`)
  }

  debugFormals && printNode(argumentNode, state, env, { label: 'argumentNode' });

  let formalNode = firstChild(argumentNode);
  while (formalNode) {
    if (formalNode.type.name == 'Formal') {
      const formalNameNode = firstChild(formalNode);
      const formalName = nodeText(formalNameNode, state);
      if (formalNameSet.has(formalName)) {
        throw new NixEvalError(`duplicate formal function argument '${formalName}'`)
      }
      formalNameSet.add(formalName);
      const formalDefaultNode = nextSibling(formalNameNode);
      if (formalDefaultNode) {
        // use expr as default value
        formalDefaultNodeMap[formalName] = formalDefaultNode;
      }
    }
    else if (formalNode.type.name == 'FormalsRest') {
      formalsRest = true;
    }
    else {
      throw new NixEvalError(`Lambda Formals: unexpected childNode: ${formalNode.type.name}`)
    }
    debugFormals && printNode(formalNode, state, env, { label: 'formalNode' });
    formalNode = nextSibling(formalNode);
  }

  bodyNode = nextSibling(argumentNode);

  if (bodyNode.type.name == 'Identifier') {
    /* this syntax error is caught in the parser
    if (formalsBindingName != null) {
      throw new NixEvalError(`Lambda Formals: unexpected childNode: ${formalNode.type.name}`)
    }
    */
    // formals with right binding: f = {...} @ args: args
    formalsBindingName = nodeText(bodyNode, state);
    bodyNode = nextSibling(bodyNode);
  }

  /** @type {function(Env): any} */
  const lambda = function lambda(argumentEnv) {
    // check type
    if (!(argumentEnv instanceof Env)) {
      throw new NixEvalError(`value is ${nixTypeWithArticle(argumentEnv)} while a set was expected`)
    }

    // bind arguments
    const childEnv = env.newChild(node);
    for (const formalName of formalNameSet) {
      if (argumentEnv.has(formalName)) {
        // TODO does this copy the value or the getter?
        // do we need this?
        // Object.defineProperty(childEnv.data, formalName, { get() { ... } })
        childEnv.data[formalName] = argumentEnv.data[formalName];
      }
      else if (Object.hasOwn(formalDefaultNodeMap, formalName)) {
        // use default value
        //childEnv.data[formalName] = formalDefaultNodeMap[formalName];
        const formalDefaultNode = formalDefaultNodeMap[formalName];
        Object.defineProperty(childEnv.data, formalName, {
          get() {
            // TODO env or childEnv
            return callThunk(formalDefaultNode, state, env);
          },
          enumerable: true,
          configurable: true,
        });
      }
      else {
        throw new NixEvalError(`function at (string)+${node.from} called without required argument '${formalName}'`)
      }
    }

    if (formalsRest == false) {
      // strict
      for (const argumentName of Object.keys(argumentEnv.data)) {
        if (!formalNameSet.has(argumentName)) {
          throw new NixEvalError(`function at (string)+${node.from} called with unexpected argument '${argumentName}'`)
        }
      }
    }

    if (formalsBindingName) {
      // add one more env
      debugFormals && console.log(`Lambda: formalsBindingName ${formalsBindingName}`)
      // FIXME 
      const childChildEnv = childEnv.newChild(node);
      //childChildEnv.data[formalsBindingName] = childEnv; // wrong
      childChildEnv.data[formalsBindingName] = argumentEnv;
      // eval function body
      return callThunk(bodyNode, state, childChildEnv);
    }

    /* no?
    if (childEnv.has(formalsBindingName)) {
      throw new NixEvalNotImplemented(`name collision for formals binding`)
    }
    childEnv.data[formalsBindingName] = childEnv;
    */

    // eval function body
    return callThunk(bodyNode, state, childEnv);
  };
  // store source location
  lambda.source = getSourceProp(node, state);
  // lambda is called from Call
  return lambda;
};



/**
 * Let
 *
 * @return {any}
 */

thunkOfNodeType.Let = (node, state, env) => {

  // let a=1; in a == rec {a=1;}.a

  const debugLet = debugAllThunks || debugCallStack || false;

  checkInfiniteLoop();

  const childEnv = env.newChild(node);

  debugLet && printNode(node, state, env);

  let attrNode = firstChild(node);
  let nextNode = nextSibling(attrNode);

  // loop all but the last child node
  while (nextNode) {

    // copy paste from LetOld
    const keyNode = firstChild(attrNode);
    if (!keyNode) {
      throw new NixEvalError('Let Attr: no key');
    }
    debugLet && printNode(keyNode, state, env, { label: 'keyNode' })

    const valueNode = nextSibling(keyNode);
    if (!valueNode) {
      throw new NixEvalError('Let Attr: no value');
    }
    debugLet && printNode(valueNode, state, env, { label: 'valueNode' })

    const key = state.source.slice(keyNode.from, keyNode.to);
    debugLet && console.log('thunkOfNodeType.Let: key', key);

    Object.defineProperty(childEnv.data, key, {
      get: () => valueNode.type.thunk(valueNode, state, childEnv),
      enumerable: true,
      configurable: true,
    });

    attrNode = nextNode;
    nextNode = nextSibling(attrNode);
  }

  // last child node
  return callThunk(attrNode, state, childEnv);
};



/**
 * LetOld
 *
 * @return {any}
 */

thunkOfNodeType.LetOld = (node, state, env) => {

  // let { a=1; body=a; } == rec {a=1;body=a;}.body

  const debugLetOld = debugAllThunks || debugCallStack || false

  checkInfiniteLoop();

  const childEnv = env.newChild(node);

  //console.log('thunkOfNodeType.LetOld: node', node);

  let attrNode = firstChild(node);

  while (attrNode) {

    // copy paste from Set, RecSet
    const keyNode = firstChild(attrNode);
    if (!keyNode) {
      throw new NixEvalError('LetOld Attr: no key');
    }
    debugLetOld && printNode(keyNode, state, env, { label: 'keyNode' })

    const valueNode = nextSibling(keyNode);
    if (!valueNode) {
      throw new NixEvalError('LetOld Attr: no value');
    }
    debugLetOld && printNode(valueNode, state, env, { label: 'valueNode' })

    const key = state.source.slice(keyNode.from, keyNode.to);
    debugLetOld && console.log('thunkOfNodeType.LetOld: key', key);

    Object.defineProperty(childEnv.data, key, {
      get: () => valueNode.type.thunk(valueNode, state, childEnv),
      enumerable: true,
      configurable: true,
    });

    attrNode = nextSibling(attrNode);
  }

  if (!Object.hasOwn(childEnv.data, 'body')) {
    throw new NixEvalError(`attribute 'body' missing`)
  }

  debugLetOld && console.log('thunkOfNodeType.LetOld: body', childEnv.data.body);

  return childEnv.data.body;
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
