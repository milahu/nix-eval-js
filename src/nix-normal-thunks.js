// based on nix-thunks-lezer-parser.js

// https://github.com/NixOS/nix/blob/master/src/libexpr/nixexpr.cc

const space = ' ' // debug

// TODO remove unneeded parens
// https://stackoverflow.com/questions/1063316/how-to-get-rid-of-unnecessary-parentheses-in-mathematical-expression

import { NixEvalError, NixSyntaxError, NixEvalNotImplemented } from './nix-errors.js';
import { NixPrimops, nixTypeWithArticle } from './nix-primops-lezer-parser.js';
import { checkInfiniteLoop, resetInfiniteLoopCounter, } from './infinite-loop-counter.js';
import { getSourceProp, firstChild, nextSibling, nodeText, printNode, JavascriptSet, Path, stripIndentation } from './nix-utils.js'

// https://github.com/voracious/vite-plugin-node-polyfills/issues/4
import { join as joinPath, resolve as resolvePath } from 'node:path'
import { Env, getStringifyResult, NixEval } from './nix-eval.js';
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



/** @return {string} */
// TODO ignore typescript error: 'state' is declared but its value is never read. ts(6133)
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// not working
//export const ⚠ = (node, _state, _env) => {
export const SyntaxError = (node, _state, _env) => {
  checkInfiniteLoop();
  //console.log('Error: node', node);
  // add context from _source? mostly not needed -> on demand or debounced
  throw new NixSyntaxError(`error at position ${node.from}`);
};

/** @return {string} */
export const Nix = (node, state, env) => {
  resetInfiniteLoopCounter();
  //console.log('Nix: node', node);
  const childNode = firstChild(node);
  //console.dir({node, childNode}); throw new Error("todo")
  if (!childNode) {
    // input is empty
    return;
  }
  //console.log(`Nix: call thunk of node`, childNode);
  return childNode.type.normal(childNode, state, env);
};



// constants

/** @return {string} */
export const NULL = () => 'null';

/** @return {string} */
export const TRUE = () => 'true';

/** @return {string} */
export const FALSE = () => 'false';



// trivial

/** @return {string} */
export const Identifier = nodeText;

/** @return {string} */
export const Primop = nodeText;



/** @return {string} */
export const Int = (node, state, env) => {
  // TODO int overflow
  // javascript limitation:
  // (9223372036854775808 > 9223372036854775807) == false
  // -> BigInt
  // (BigInt("9223372036854775808") > BigInt("9223372036854775807")) == true
  const nString = nodeText(node, state)
  // check integer overflow
  // nix can parse only positive integers
  // "-1" is paresed as "(__sub 0 1)"
  const n = BigInt(nString)
  const nMax = BigInt("9223372036854775807") // 2**63-1
  if (n > nMax) {
    throw new NixEvalError(`invalid integer '${nString}'`)
  }
  return nString;
}

/** @return {string} */
export const Float = (node, state, env) => {
  //console.log('Int: node', node);
  const n = parseFloat(nodeText(node, state))
  if ((n | 0) == n) {
    // skip decimals
    // nix-instantiate --parse --expr 1.0
    // 1
    return String(n)
  }
  if (n == Infinity) {
    throw new NixEvalError(`invalid float '${nodeText(node, state)}'`)
  }
  return n.toFixed(6).replace(/0+$/, '');
};



/** @return {string} */
export const Parens = (node, state, env) => {
  //console.log('Parens: node', node);
  const childNode = firstChild(node);
  //console.log('Parens: childNode', childNode);
  if (!childNode) {
    throw NixSyntaxError("unexpected ')'");
  }
  //return '(' + space + childNode.type.normal(childNode, state, env) + space + ')';
  //return '(' + childNode.type.normal(childNode, state, env) + ')';
  // note: no parens. parens are only needed for the parser,
  // to force grouping of nodes (to override associativity)
  return childNode.type.normal(childNode, state, env);
};



/** @return {string} */
export const Add = (node, state, env) => {

  // arithmetic addition or string concat

  checkInfiniteLoop();

  const [value1, value2] = get2Values(node, state, env, { caller: 'Add' })

  //return value1 + space + '+' + space + value2;
  return '(' + value1 + space + '+' + space + value2 + ')';
};



/** @type {function(SyntaxNode, State, Env, Record<string, any>): [any, any]} */
function get2Values(node, state, env, options) {
  if (!options) options = {};
  if (!options.caller) options.caller = 'get2Values';
  //checkInfiniteLoop();
  //console.log('Mul: node', node);
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
    //console.log('Mul: arg1 ...');
    value1 = childNode1.type.normal(childNode1, state, env);
    //console.log('Mul: arg1', arg1);
  }
  else {
    // eval deep first
    //console.log('Mul: arg1 ...');
    value1 = childNode1.type.normal(childNode1, state, env);
    //console.log('Mul: arg1', arg1);
    childNode2 = nextSibling(childNode1);
    if (!childNode2) {
      throw new NixEvalError(`${options.caller}: no childNode2`)
    }
  }

  //console.log('Mul: arg2 ...');
  let value2 = childNode2.type.normal(childNode2, state, env);
  //console.log('Mul: arg2', arg2);

  return [value1, value2];
}



/*
export const Add = (node, state, env) => {
  const [value1, value2] = get2Values(node, state, { caller: 'Add' });
  return value1 + value2;
};
*/

export const Sub = (node, state, env) => {
  const [value1, value2] = get2Values(node, state, env, { caller: 'Sub' });
  //return value1 + space + '-' + space + value2;
  return `(__sub ${value1} ${value2})`;

};

export const Mul = (node, state, env) => {
  const [value1, value2] = get2Values(node, state, env, { caller: 'Mul' });
  return value1 + space + '*' + space + value2;
};

export const Div = (node, state, env) => {
  const [value1, value2] = get2Values(node, state, env, { caller: 'Div' });
  // NOTE if values are Int or Float, space is required after /
  return value1 + space + '/' + space + value2;
};



/** @return {string} */
export const Not = (node, state, env) => {
  checkInfiniteLoop();
  //console.log('Add: node', node);
  let childNode = firstChild(node);
  if (!childNode) {
    throw new NixEvalError('Not: no childNode')
  }
  const value = childNode.type.normal(childNode, state, env);
  return `!${value}`;
};



/** @return {string} */
export const Neg = (node, state, env) => {
  checkInfiniteLoop();
  //console.log('Neg: node', node);
  let childNode = firstChild(node);
  if (!childNode) {
    throw new NixEvalError('Neg: no childNode')
  }
  const value = childNode.type.normal(childNode, state, env);
  // TODO check type
  // nix-repl> -{}
  // error: value is a set while an integer was expected
  //return `-${value}`;
  return `(__sub 0 ${value})`;
};



const debugCall = debugAllThunks || debugCallStack || false

/** @return {string} */
export const Call = (node, state, env) => {

  state.stack.push(node)

  //debugCall && console.log(`Call: state.stack:\n${state.stack}`)
  debugCall && console.log(`Call: stack size: ${state.stack.stack.length}`);
  debugVar && console.log(`Call: stack`, new Error().stack);
  if (debugCall && state.stack.stack.length > 5) {
    throw new Error('stack size')
  }

  // call a function
  // TODO check types

  checkInfiniteLoop();
  //console.log('Call: node', node);

  let functionNode = firstChild(node);
  if (!functionNode) {
    throw new NixEvalError('Call: no functionNode')
  }
  // eval deep first: get functionValue now, childNode2 later
  //console.log('Call: functionNode', functionNode.type.name, functionNode);

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

  const functionValue = functionNode.type.normal(functionNode, state, env);
  //console.log('Call: functionValue', functionValue);

  const argumentNode = nextSibling(functionNode);
  if (!argumentNode) {
    throw new NixEvalError('Call: no arg2')
  }

  //console.log('Call: argumentNode', argumentNode.type.name, argumentNode);

  const argumentValue = argumentNode.type.normal(argumentNode, state, env);
  //console.log('Call: argumentValue', argumentValue);

  // TODO env? or is this done in Lambda?
  // nix.cc does this in EvalState::callFunction
  // Env & env2(allocEnv(size));

  return `${functionValue} ${argumentValue}`;
};



/** @return {string} */
export const If = (node, state, env) => {

  // if condition then expression else alternative

  checkInfiniteLoop();
  //console.log('If: node', node);

  let ifNode = firstChild(node);
  if (!ifNode) {
    throw new NixEvalError('If: no ifNode')
  }

  const ifValue = ifNode.type.normal(ifNode, state, env);
  //console.log('If: ifValue', ifValue);

  const thenNode = nextSibling(ifNode);
  if (!thenNode) {
    throw new NixEvalError('If: no thenNode')
  }
  
  const thenValue = thenNode.type.normal(thenNode, state, env);

  const elseNode = nextSibling(thenNode);
  if (!elseNode) {
    throw new NixEvalError('If: no elseNode')
  }

  const elseValue = elseNode.type.normal(elseNode, state, env);

  return `if ${ifValue} then ${thenValue} else ${elseValue}`;
};



/** @return {string} */
export const Eq = (node, state, env) => {
  let [value1, value2] = get2Values(node, state, env, { caller: 'Eq' })
  return `${value1} == ${value2}`;
};



/** @return {string} */
export const And = (node, state, env) => {
  const [value1, value2] = get2Values(node, state, env, { caller: 'And' })
  return `${value1} && ${value2}`;
};

/** @return {string} */
export const Or = (node, state, env) => {
  const [value1, value2] = get2Values(node, state, env, { caller: 'Or' })
  return `${value1} || ${value2}`;
};

/** @return {string} */
export const Imply = (node, state, env) => {
  // Logical implication
  // (a -> b) == (!a || b)
  const [value1, value2] = get2Values(node, state, env, { caller: 'Imply' })
  return `${value1} -> ${value2}`;
};



/** @return {string} */
export const NEq = (node, state, env) => {
  let [value1, value2] = get2Values(node, state, env, { caller: 'NEq' })
  return `${value1} != ${value2}`;
};

/** @return {string} */
export const GT = (node, state, env) => {
  let [value1, value2] = get2Values(node, state, env, { caller: 'GT' })
  return `${value1} > ${value2}`;
};

/** @return {string} */
export const GE = (node, state, env) => {
  let [value1, value2] = get2Values(node, state, env, { caller: 'GE' })
  return `${value1} >= ${value2}`;
};

/** @return {string} */
export const LT = (node, state, env) => {
  let [value1, value2] = get2Values(node, state, env, { caller: 'LT' })
  return `${value1} < ${value2}`;
};

/** @return {string} */
export const LE = (node, state, env) => {
  let [value1, value2] = get2Values(node, state, env, { caller: 'LE' })
  return `${value1} <= ${value2}`;
};



/** @typedef {any[]} LazyArray */
/** @return {string} */
export const List = (node, state, env) => {
  checkInfiniteLoop();
  let childNode;
  if (!(childNode = firstChild(node))) {
    // empty list
    return '[]';
  }
  const result = [];
  while (true) {
    const childValue = childNode.type.normal(childNode, state, env)
    // list items are wrapped in braces
    result.push('(' + childValue + ')')
    if (!(childNode = nextSibling(childNode))) {
      break;
    }
  }
  return '[' + space + result.join(' ') + space + ']';
};



/** @return {string} */
export const Concat = (node, state, env) => {
  // list concat
  checkInfiniteLoop();
  const [list1, list2] = get2Values(node, state, env, { caller: 'Concat' })
  return `${list1} ++ ${list2}`;
};



/** @return {string} */
export const String = (node, state, env) => {
  // similar to list: zero or more childNodes

  checkInfiniteLoop();

  let childNode;

  /** @type {string[]} */
  const result = [];

  // TODO reachable?
  if (!(childNode = firstChild(node))) {
    // empty string
    return '""';
  }

  while (true) {
    //checkInfiniteLoop();
    const stringPart = childNode.type.normal(childNode, state, env);
    result.push(stringPart);
    if (!(childNode = nextSibling(childNode))) {
      break;
    }
  }

  if (result.length == 1) {
    return result[0];
  }

  return '(' + result.join(' + ') + ')';
};



// TODO remove indent
// see also stripIndentation in nix-utils.js
/** @return {string} */
export const IndentedString = (node, state, env) => {
  // similar to list: zero or more childNodes

  checkInfiniteLoop();

  let childNode;

  /** @type {string[]} */
  const stringParts = [];

  // TODO reachable?
  if (!(childNode = firstChild(node))) {
    // empty string
    return '""';
  }

  while (true) {
    //checkInfiniteLoop();
    //const stringPart = childNode.type.normal(childNode, state, env);
    //result.push(stringPart);
    if (childNode.type.name == 'IndentedStringContent') {
      stringParts.push([
        true, // child is string
        nodeText(childNode, state),
      ])
    }
    else {
      stringParts.push([
        false, // child is expression
        childNode.type.normal(childNode, state, env),
      ])
    }
    //else if (childNode.type.name == 'IndentedStringInterpolation') {
    //}
    //else {
    //  // TODO not reachable?
    //  throw new Error(`IndentedString: unexpected child node type ${childNode.type.name}`);
    //}
    if (!(childNode = nextSibling(childNode))) {
      break;
    }
  }

  console.dir(stringParts); throw new Error('todo'); // debug

  // based on: "function stripIndentation" in nix-utils.js

  let minIndent = 1000000

  // first pass
  for (let partIdx = 0; partIdx < stringParts.length; partIdx++) {
    const [isString, part] = stringParts[partIdx];
    if (!isString) continue;
    const lines = part.split("\n")
    if (partIdx == 0) {
      // remove first line if empty or spaces
      if (/^ *$/.test(lines[0])) lines.shift()
    }
    if (partIdx == (stringParts.length - 1)) {
      // right trim last line
      // note: keep empty last line -> unix line format, newline at end of file
      lines[lines.length - 1] = lines[lines.length - 1].replace(/ +$/, '')
    }
    for (const line in lines) {
      //// ignore whitespace lines
      //if (/^ *$/.test(line)) continue
      const curIndent = line.match(/^ */)[0].length
      // ignore whitespace lines
      if (curIndent == line.length) continue
      if (curIndent < minIndent) minIndent = curIndent
    }
    // dont split again in second pass
    stringParts[partIdx][1] = lines;
  }

  // second pass
  for (let partIdx = 0; partIdx < stringParts.length; partIdx++) {
    const [isString, lines] = stringParts[partIdx];
    if (!isString) continue;
    stringParts[partIdx][1] = JSON.stringify(
      lines.map(line => line.slice(minIndent)).join("\n")
    );
  }

  console.dir(stringParts); throw new Error('todo'); // debug

  if (stringParts.length == 1) {
    return stringParts[0][1];
  }

  return '(' + stringParts.map(part => part[1]).join(' + ') + ')';
};



/** @return {string} */
export const StringInterpolation = (node, state, env) => {

  /*

    "a${"b"}c"
    ("a" + "b" + "c")
           ^^^

    "a${}c"
    error: syntax error, unexpected '}'

    "a${1}c"
    ("a" + 1 + "c")

  */

  checkInfiniteLoop();

  let childNode = firstChild(node);

  // empty expression "a${}c" is syntax error
  //if (!childNode) {
  //  return '';
  //}

  const childValue = childNode.type.normal(childNode, state, env);

  //if (typeof(childValue) != 'string') {
  //  throw new NixEvalError(`cannot coerce ${nixTypeWithArticle(childValue)} to a string`)
  //}

  return childValue;
};



/** @return {string} */
export const IndentedStringInterpolation = StringInterpolation;



/** @return {string} */
export const StringContent = (node, state, env) => {
  return JSON.stringify(nodeText(node, state));
}



/** @return {string} */
// FIXME remove indent
// note: not called from IndentedString
export const IndentedStringContent = nodeText;
/*
export const IndentedStringContent = (node, state, env) => {
  return JSON.stringify(nodeText(node, state));
}
*/



/** @return {string} */
export const PathAbsolute = (node, state, env) => {
  return '(TODO PathAbsolute)'

  const absolutePath = nodeText(node, state);
  return new Path(absolutePath);
};



/** @return {string} */
export const PathRelative = (node, state, env) => {
  return '(TODO PathRelative)'
  const relativePath = nodeText(node, state);
  const absolutePath = resolvePath(state.options.workdir, relativePath);
  return new Path(absolutePath);
};


// ReferenceError: Cannot access 'Set' before initialization
//const JavaScriptSet = Set;



/** @typedef {Record<string, any>} LazyObject */

/**
* Set and RecSet
*
* @return {Env}
*/

const _Set = (node, state, env) => {
  const debugSet = debugAllThunks || debugCallStack || false

  checkInfiniteLoop();

  const setEnv = env.newChild(node);

  debugSet && printNode(node, state, env, { label: 'node' });

  let attrNode;

  if (!(attrNode = firstChild(node))) {
    // empty set
    return setEnv;
  }

  while (attrNode) {
    //checkInfiniteLoop();
    debugSet && printNode(attrNode, state, env, { label: 'attrNode' });

    if (attrNode.type.name == 'Attr') {

      // 2 or more children. last child = value
      // similar to Let

      let childNode = firstChild(attrNode);
      let nextNode = nextSibling(childNode);
      let nextNextNode = nextSibling(nextNode);

      if (!childNode) {
        throw new NixEvalError('Set Attr: no key');
      }

      let finalSetEnv = setEnv;
      let key;

      // keys: all but the last child node
      while (nextNode) {
        let keyNode = childNode;
        debugSet && printNode(keyNode, state, env, { label: 'keyNode' });
        key = keyNode.type.normal(keyNode, state, env);
        debugSet && console.log(`${node.type.name}: key`, key);
        if (nextNextNode) {
          finalSetEnv.data[key] = finalSetEnv.newChild();
          finalSetEnv = finalSetEnv.data[key];
        }

        childNode = nextNode;
        nextNode = nextNextNode;
        nextNextNode = nextSibling(nextNode);
      }

      // value: last child node
      const valueNode = childNode;
      debugSet && printNode(valueNode, state, env, { label: 'valueNode' });

      const valueEnv = (node.type.name == 'Set'
        ? env // Set
        : setEnv // RecSet
      );

      const getValue = () => (
        valueNode.type.normal(valueNode, state, valueEnv)
      );

      Object.defineProperty(finalSetEnv.data, key, {
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
        // TODO callThunk
        // TODO loop keys
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
        Object.defineProperty(setEnv.data, inheritKey, {
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
      const inheritSetValue = inheritSetNode.type.normal(inheritSetNode, state, env);
      if (!(inheritSetValue instanceof Env)) {
        throw new NixEvalError(`error: value is ${nixTypeWithArticle(inheritSetValue)} while a set was expected`)
      }
      while (inheritKeyNode) {
        // TODO callThunk
        // TODO loop keys
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
        Object.defineProperty(setEnv.data, inheritKey, {
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

  return setEnv;
};



// TODO put all handlers into an object
/*
const handlers = {};
handlers['Set'] = (node, state, env) => { ... };
export default handlers
*/

export { _Set as Set }



/** @return {string} */

export const RecSet = Set



const debugSelect = debugAllThunks || false

// void ExprSelect::eval(EvalState & state, Env & env, Value & v)
/** @return {string} */
export const Select = (node, state, env) => {
  return '(TODO Select)'
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
  const setValue = setNode.type.normal(setNode, state, env);
  debugSelect && console.log(`Select:${node.from}: setValue`, setValue)

  let keyNode = nextSibling(setNode);
  if (!keyNode) {
    throw new NixEvalError('Select: no keyNode')
  }

  let result = setValue;

  // loop attrPath
  // for (auto & i : attrPath) {
  while (keyNode) {
    // auto name = getName(i, state, env);
    const keyValue = keyNode.type.normal(keyNode, state, env);

    // state.forceAttrs(*vAttrs, pos);

    // j = vAttrs->attrs->find(name)

    // if (j == vAttrs->attrs->end())
    //   state.throwEvalError(pos, , "attribute '%1%' missing"
    debugSelect && console.log(`Select:${node.from}: result`, result)
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

/** @return {string} */
export const HasAttr = (node, state, env) => {
  return '(TODO HasAttr)'
  // similar to Select, but dont return the value
  checkInfiniteLoop();
  const setNode = firstChild(node);
  if (!setNode) {
    throw new NixEvalError('HasAttr: no setNode')
  }

  // call thunk of Set or RecSet
  /** @type {Env} */
  const setValue = setNode.type.normal(setNode, state, env);
  debugHasAttr && console.log(`HasAttr:${node.from}: setValue`, setValue)

  let keyNode = nextSibling(setNode);
  if (!keyNode) {
    // this should be unreachable
    throw new NixEvalError('HasAttr: no keyNode')
  }

  let result = setValue;

  // loop attrPath
  while (keyNode) {
    const keyValue = keyNode.type.normal(keyNode, state, env);

    debugHasAttr && console.log(`HasAttr:${node.from}: result`, result)
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

/** @return {string} */
export const Update = (node, state, env) => {
  return '(TODO Update)'

  // list concat

  checkInfiniteLoop();

  const [set1, set2] = get2Values(node, state, env, { caller: 'Update' })

  debugUpdate && console.log(`Update: set1`, typeof(set1), set1);
  debugUpdate && console.log(`Update: set2`, typeof(set2), set2);

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

export const With = (node, state, env) => {
  return '(TODO With)'

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
  const setValue = setNode.type.normal(setNode, state, env);
  debugWith && console.log(`With:${node.from}: setValue`, setValue)
  if (!(setValue instanceof Env)) {
    // ignore type errors
    // nix-repl> with null; 1
    // 1
    // nix-repl> with ""; 1
    // 1
    return exprNode.type.normal(exprNode, state, env);
  }

  const childEnv = env.newChild(node);
  childEnv.data = setValue.data;
  return exprNode.type.normal(exprNode, state, childEnv);
};



const debugVar = debugAllThunks || false

/** @return {string} */
export const Var = (node, state, env) => {
  const keyNode = firstChild(node);
  const key = nodeText(keyNode, state);
  return key;
};



/** @return {string} */
export const Lambda = (node, state, env) => {
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
    const argument = nodeText(argumentNode, state);
    const body = bodyNode.type.normal(bodyNode, state);
    return `${argument}: ${body}`
  }

  return 'TODO Lambda'

  // function with formals: f = {x, y, ...} @ args: (x + 1)

  const debugFormals = debugAllThunks || false;

  let formalsBindingName = null;
  const formalNameSet = new JavascriptSet();
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
            return formalDefaultNode.type.normal(formalDefaultNode, state, env);
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
      return bodyNode.type.normal(bodyNode, state, childChildEnv);
    }

    /* no?
    if (childEnv.has(formalsBindingName)) {
      throw new NixEvalNotImplemented(`name collision for formals binding`)
    }
    childEnv.data[formalsBindingName] = childEnv;
    */

    // eval function body
    return bodyNode.type.normal(bodyNode, state, childEnv);
  };
  // store source location
  lambda.source = getSourceProp(node, state);

  // set lambda.formals for builtins.functionArgs
  if (formalNameSet.length == 0) {
    lambda.formalHasDefault = null;
  }
  else {
    lambda.formalHasDefault = {};
    for (const formalName of formalNameSet) {
      lambda.formalHasDefault[formalName] = Object.hasOwn(formalDefaultNodeMap, formalName);
    }
  }

  // lambda is called from Call
  return lambda;
};



/**
 * Let
 *
 * @return {any}
 */

export const Let = (node, state, env) => {

  /*

    let b=2; a=1; in a
    (let b = 2; a = 1; in a)

    let a=1; a=1; in a
    error: attribute 'a' already defined at (string):1:5

    let in ""
    (let in "")

  */

  let result = '(let '

  const debugLet = debugAllThunks || debugCallStack || false;

  checkInfiniteLoop();

  //const childEnv = env.newChild(node);
  const childEnv = env;

  debugLet && printNode(node, state, env);

  let attrNode = firstChild(node);
  let nextNode = nextSibling(attrNode);

  const seenKeys = new Set();

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
    debugLet && console.log('Let: key', key);
    if (seenKeys.has(key)) {
      throw new NixEvalError(`attribute '${key}' already defined`);
      // TODO source location: file, line, column
      //throw new NixEvalError(`attribute '${key}' already defined at (string):1:5`);
    }
    seenKeys.add(key);
    result += `${key} = `

    const value = valueNode.type.normal(valueNode, state, childEnv);
    result += `${value}; `

    attrNode = nextNode;
    nextNode = nextSibling(attrNode);
  }

  // last child node
  const body = attrNode.type.normal(attrNode, state, childEnv);

  result += `in ${body})`
  return result;
};



/**
 * LetOld
 *
 * @return {any}
 */

export const LetOld = (node, state, env) => {
  return '(TODO LetOld)'

  // let { a=1; body=a; } == rec {a=1;body=a;}.body

  const debugLetOld = debugAllThunks || debugCallStack || false

  checkInfiniteLoop();

  const childEnv = env.newChild(node);

  //console.log('LetOld: node', node);

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
    debugLetOld && console.log('LetOld: key', key);

    Object.defineProperty(childEnv.data, key, {
      get: () => valueNode.type.normal(valueNode, state, childEnv),
      enumerable: true,
      configurable: true,
    });

    attrNode = nextSibling(attrNode);
  }

  if (!Object.hasOwn(childEnv.data, 'body')) {
    throw new NixEvalError(`attribute 'body' missing`)
  }

  debugLetOld && console.log('LetOld: body', childEnv.data.body);

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
