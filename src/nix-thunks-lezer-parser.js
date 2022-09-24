//import { NixPrimOps } from "./nix-primops.js"
import { NixEvalError, NixSyntaxError, NixEvalNotImplemented } from './nix-errors.js';
import { dropCursor } from "../demo/cm-view.js";
import { NixEval } from "./nix-eval.js";
import { NixPrimops } from './nix-primops-lezer-parser.js';

// jsdoc types
// https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html

/** @typedef { import("@lezer/common").SyntaxNode } SyntaxNode */


 
/** @type {(node: SyntaxNode, label: string) => void} */
export function printNode(node, label = '') {
  let extraDepth = 0;
  if (label) {
    console.log(label);
    extraDepth = 1; // indent the node
  }
  // note: this will print a trailing newline
  console.log(node.toString(0, 5, "  ", extraDepth));
}

let infiniteLoopCounter = 0;
function resetInfiniteLoop() {
  infiniteLoopCounter = 0;
}
function checkInfiniteLoop() {
  infiniteLoopCounter++;
  if (infiniteLoopCounter > 1000) {
    resetInfiniteLoop();
    throw new Error('infinite loop?');
  }
}

/** @type {function(SyntaxNode): SyntaxNode} */
function skipComments(node) {
  checkInfiniteLoop();
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
    console.log(`firstChild: node.firstChild is empty`);
    return null;
  }
  if (!(node = skipComments(node))) {
    console.log(`firstChild: skipComments failed`);
    return null;
  }
  return node;
}

/** @type {function(SyntaxNode): SyntaxNode} */
function nextSibling(node) {
  if (!(node = node.nextSibling)) {
    console.log(`nextSibling: node.nextSibling is empty`);
    return null;
  }
  if (!(node = skipComments(node))) {
    console.log(`nextSibling: skipComments failed`);
    return null;
  }
  return node;
}

/** @type {function(SyntaxNode, string): string} */
function nodeText(node, source) {
  // source = full source code of the Nix file
  // text = source code of this node
  return source.slice(node.from, node.to);
}

/** @type {function(SyntaxNode, string): any} */
function callThunk(node, source) {
  if (!node.type.thunk) {
    throw new NixEvalNotImplemented(`thunk is undefined for type ${node.type.name}`);
  }
  return node.type.thunk(node, source);
}



function nixTypeWithArticle(value) {
  const typeName = NixPrimops.__typeOf(value);
  const resultOfType = {
    'null': 'null',
    'set': 'a set',
    'list': 'a list',
    'integer': 'an integer',
    'float': 'a float',
    'bool': 'a Boolean',
    'string': 'a string',
  };
  return resultOfType[typeName];
}



/** @type {Record<string, (node: SyntaxNode, source: string) => any>} */
const thunkOfNodeType = {};



/** @return {never} */
thunkOfNodeType['⚠'] = (node, _source) => {
  checkInfiniteLoop();
  console.log('thunkOfNodeType.Error: node', node);
  // add context from _source? mostly not needed -> on demand or debounced
  throw new NixSyntaxError(`error at position ${node.from}`);
};



/** @return {any} */
thunkOfNodeType.Nix = (node, source) => {
  //resetInfiniteLoop();
  //console.log('thunkOfNodeType.Nix: node', node);
  const childNode = firstChild(node);
  if (!childNode) {
    // input is empty
    return;
  }
  console.log(`thunkOfNodeType.Nix: call thunk of node`, childNode);
  return callThunk(childNode, source);
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
thunkOfNodeType.Parens = (node, source) => {
  //console.log('thunkOfNodeType.Parens: node', node);
  const childNode = firstChild(node);
  if (!childNode) {
    throw NixSyntaxError("unexpected ')'");
  }
  return callThunk(childNode, source);
};



/** @return {bigint} */
thunkOfNodeType.Int = (node, source) => {
  //console.log('thunkOfNodeType.Int: node', node);
  //return parseInt(nodeText(node, source));
  // we need BigInt to diff Int vs Float
  // otherwise typeof(1.0) == "int"
  return BigInt(nodeText(node, source));
};



/** @return {number} */
thunkOfNodeType.Float = (node, source) => {
  //console.log('thunkOfNodeType.Int: node', node);
  return parseFloat(nodeText(node, source));
};



/** @return {string} */
thunkOfNodeType.Identifier = (node, source) => {
  //console.log('thunkOfNodeType.Identifier: node', node);
  return nodeText(node, source);
};



/** @return {function} */
thunkOfNodeType.Primop = (node, source) => {
  //console.log('thunkOfNodeType.Primop: node', node);
  const name = nodeText(node, source);
  //console.log('thunkOfNodeType.Primop: name', name);
  const func = NixPrimops[name];
  if (!func) {
    throw new NixEvalNotImplemented(`primop ${name}`);
  }
  return func;
};



/** @return {number | bigint} */
thunkOfNodeType.Add = (node, source) => {

  // arithmetic addition or string concat
  // TODO check types

  // nix-repl> 1+""
  // error: cannot add a string to an integer

  // nix-repl> ""+1
  // error: cannot coerce an integer to a string

  checkInfiniteLoop();
  //console.log('thunkOfNodeType.Add: node', node);
  let childNode1 = firstChild(node);
  if (!childNode1) {
    throw new NixEvalError('Add: no childNode1')
  }

  // TODO eval now or eval later? deep or broad?
  const evalBroadFirst = true;
  let value1;
  let childNode2;
  if (evalBroadFirst) {
    childNode2 = nextSibling(childNode1);
    if (!childNode2) {
      throw new NixEvalError('Add: no arg2')
    }
    //console.log('thunkOfNodeType.Add: arg1 ...');
    value1 = callThunk(childNode1, source);
    //console.log('thunkOfNodeType.Add: arg1', arg1);
  }
  else {
    // eval deep first
    //console.log('thunkOfNodeType.Add: arg1 ...');
    value1 = callThunk(childNode1, source);
    //console.log('thunkOfNodeType.Add: arg1', arg1);
    childNode2 = nextSibling(childNode1);
    if (!childNode2) {
      throw new NixEvalError('Add: no arg2')
    }
  }

  //console.log('thunkOfNodeType.Add: arg2 ...');
  const value2 = callThunk(childNode2, source);
  //console.log('thunkOfNodeType.Add: arg2', arg2);

  // TODO round result of float
  // nix: 0.1 + 0.2 == 0.3
  // js: 0.1 + 0.2 == 0.30000000000000004

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

  // int + float -> float
  if (typeof(value1) == 'bigint' && typeof(value2) == 'number') {
    return parseFloat(value1) + value2;
  }

  // float + int -> float
  if (typeof(value1) == 'number' && typeof(value2) == 'bigint') {
    return value1 + parseFloat(value2);
  }

  // float + float -> float
  if (typeof(value1) == 'number' && typeof(value2) == 'number') {
    return value1 + value2;
  }

  // int + int -> int
  if (typeof(value1) == 'bigint' && typeof(value2) == 'bigint') {
    return value1 + value2;
  }

  // string + string -> string
  if (typeof(value1) == 'string' && typeof(value2) == 'string') {
    return value1 + value2;
  }

  throw new NixEvalError(`cannot coerce ${nixTypeWithArticle(value1)} to a string`)
};



/** @type {function(SyntaxNode, string, Record<string, any>): [number, number]} */
function get2Numbers(node, source, options) {
  if (!options) options = {};
  if (!options.caller) options.caller = 'get2Numbers';
  checkInfiniteLoop();
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
    value1 = callThunk(childNode1, source);
    //console.log('thunkOfNodeType.Mul: arg1', arg1);
  }
  else {
    // eval deep first
    //console.log('thunkOfNodeType.Mul: arg1 ...');
    value1 = callThunk(childNode1, source);
    //console.log('thunkOfNodeType.Mul: arg1', arg1);
    childNode2 = nextSibling(childNode1);
    if (!childNode2) {
      throw new NixEvalError(`${options.caller}: no childNode2`)
    }
  }

  //console.log('thunkOfNodeType.Mul: arg2 ...');
  let value2 = callThunk(childNode2, source);
  //console.log('thunkOfNodeType.Mul: arg2', arg2);

  if (typeof(value1) != typeof(value2)) {
    // float + int -> float
    value1 = parseFloat(value1)
    value2 = parseFloat(value2)
  }

  return [value1, value2];
}

/*
thunkOfNodeType.Add = (node, source) => {
  const [value1, value2] = get2Numbers(node, source, { caller: 'Add' });
  return value1 + value2;
};
*/

thunkOfNodeType.Sub = (node, source) => {
  const [value1, value2] = get2Numbers(node, source, { caller: 'Sub' });
  return value1 - value2;
};

thunkOfNodeType.Mul = (node, source) => {
  const [value1, value2] = get2Numbers(node, source, { caller: 'Mul' });
  return value1 * value2;
};

thunkOfNodeType.Div = (node, source) => {
  const [value1, value2] = get2Numbers(node, source, { caller: 'Div' });
  if (value2 == 0) {
    throw NixEvalError('division by zero')
  }
  return value1 / value2;
};



/** @return {any} */
thunkOfNodeType.Call = (node, source) => {

  // call a function
  // TODO check types

  checkInfiniteLoop();
  //console.log('thunkOfNodeType.Call: node', node);

  let childNode1 = firstChild(node);
  if (!childNode1) {
    throw new NixEvalError('Call: no childNode1')
  }
  // eval deep first: get value1 now, childNode2 later
  console.log('thunkOfNodeType.Call: childNode1', childNode1);

  //if (childNode1.type.name == 'Primop' && nodeText(childNode1, source) == '__typeOf') {
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

  const value1 = callThunk(childNode1, source);
  console.log('thunkOfNodeType.Call: value1', value1);

  const childNode2 = nextSibling(childNode1);
  if (!childNode2) {
    throw new NixEvalError('Call: no arg2')
  }
  console.log('thunkOfNodeType.Call: childNode2', childNode2);
  const value2 = callThunk(childNode2, source);
  //console.log('thunkOfNodeType.Call: arg2', arg2);

  return value1(value2);
};



/** @typedef {any[]} LazyArray */
/** @return {LazyArray} */
thunkOfNodeType.List = (node, source) => {
  //console.log('thunkOfNodeType.List: list node type', node.type.name);
  //console.log('thunkOfNodeType.List: call stack', new Error());

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
    checkInfiniteLoop();
    function getThunk(childNodeCopy) {
      // force copy of childNode
      // fix: thunkOfNodeType.List: call thunk of childNode null
      // this will "move" childNode from thunkOfNodeType.List to thunk
      // TODO better?
      return () => {
        //console.log('thunkOfNodeType.List value thunk: node', node.type.name, node);
        console.log(`thunkOfNodeType.List: call thunk of childNode`, childNode);
        return callThunk(childNodeCopy, source);
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
thunkOfNodeType.String = (node, source) => {
  // similar to list: zero or more childNodes

  let childNode;

  /** @type {string} */
  let result = '';

  if (!(childNode = firstChild(node))) {
    // empty string
    return result;
  }

  console.log(`thunkOfNodeType.String: first childNode`, childNode);
  let idx = 0;

  while (true) {
    checkInfiniteLoop();
    const stringPart = callThunk(childNode, source);
    result += stringPart;
    if (!(childNode = nextSibling(childNode))) {
      break;
    }
    console.log(`thunkOfNodeType.String: next childNode`, childNode);
    idx++;
  }

  return result;
};

/** @return {string} */
thunkOfNodeType.StringContent = (node, source) => {
  // same as Identifier
  //console.log('thunkOfNodeType.StringContent: node', node);
  return nodeText(node, source);
};



/** @typedef {Record<string, any>} LazyObject */
/** @return {LazyObject} */
thunkOfNodeType.Set = (node, source) => {

  checkInfiniteLoop();

  //if (!node) {
  //  throw NixEvalError('Set: node is null')
  //}

  // TODO cache. but where? global cache? local context?
  // node is probably a bad choice
  /*
  if (!node.data) node.data = {};
  const data = node.data;
  */
  // TODO lazy object via Proxy, see LazyArray
  const data = {};

  console.log('thunkOfNodeType.Set: typeof(node)', typeof(node));

  console.log('thunkOfNodeType.Set: typeof(node.firstChild)', typeof(node.firstChild));

  //if (!node.firstChild) {
  //  throw NixEvalError('Set: node.firstChild is empty. node:', node)
  //}

  //console.log('thunkOfNodeType.Set ------------------------');
  //console.log('thunkOfNodeType.Set: node', node);

  let attrNode;

  if (!(attrNode = firstChild(node))) {
    // empty set
    return data;
  }

  while (true) {
    checkInfiniteLoop();
    console.log('thunkOfNodeType.Set: attrNode', attrNode);

    const keyNode = firstChild(attrNode);
    if (!keyNode) {
      throw new NixEvalError('Set Attr: no key');
    }
    console.log('thunkOfNodeType.Set: keyNode', keyNode);

    const valueNode = nextSibling(keyNode);
    if (!valueNode) {
      throw new NixEvalError('Set Attr: no value');
    }
    console.log('thunkOfNodeType.Set: valueNode', valueNode);

    //const copyNode = (node) => node;
    //const valueNodeCopy = copyNode(valueNode);

    const key = source.slice(keyNode.from, keyNode.to);
    console.log('thunkOfNodeType.Set: key', key);

    function getThunk(valueNodeCopy) {
      // create local copy of valueNode
      return () => {
        console.log(`Set value thunk: call thunk of valueNodeCopy`, valueNodeCopy)
        return valueNodeCopy.type.thunk(
          valueNodeCopy,
          source
        );
      }
    }

    Object.defineProperty(data, key, {
      get: getThunk(valueNode),
      enumerable: true,
      // fix: TypeError: Cannot redefine property: a
      configurable: true,
    });


    if (!(attrNode = nextSibling(attrNode))) {
      break;
    }
  }

  return data;
};



/** @return {any} */
thunkOfNodeType.Select = (node, source) => {
  // first child: Set
  // other children: attr keys
  checkInfiniteLoop();
  const setNode = firstChild(node);
  if (!setNode) {
    throw new NixEvalError('Select: no setNode')
  }
  const setValue = callThunk(setNode, source);

  let keyNode = nextSibling(setNode);
  if (!keyNode) {
    throw new NixEvalError('Select: no keyNode')
  }

  let result = setValue;

  while (keyNode) {
    const keyValue = callThunk(keyNode, source);
    result = result[keyValue];

    keyNode = nextSibling(keyNode);
  }

  return result;
};



// derived from other types
/*
getThunkOfNodeType.Let = (node) => (node.thunk = () => {
  // syntax sugar:   let a=1; in a   ->   (rec{a=1;}).a
  // TODO refactor setThunkOfNodeType to class
  //printNode(node, "Let.thunk");
  return 'TODO';
});
*/



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
