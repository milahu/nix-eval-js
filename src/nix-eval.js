// https://github.com/dtao/lazy.js
//import * as Lazy from "lazy.js";

// TODO sharing = caching of node values, based on semantic equality of nodes

const debug = false

import { parser as LezerParserNix } from "./lezer-parser-nix/dist/index.js"
//import { parser as LezerParserNix } from "../demo/src/codemirror-lang-nix/src/lezer-parser-nix/dist/index.js"
//import { parser as LezerParserNix } from "../demo/src/codemirror-lang-nix/dist/index.js"

// TODO rename to evalOfNodeType
import * as thunkOfNodeType from './nix-thunks-lezer-parser.js';
import * as formatOfNodeType from "./lezer-parser-nix/src/nix-format-thunks.js"
import normalThunks from "./nix-normal-thunks.js"

import {
  callThunk,
  firstChild,
  nextSibling,
  nodeText,
  printNode,
  Path,
} from './nix-utils.js';

import { NixPrimops, nixTypeWithArticle } from './nix-primops-lezer-parser.js';
import * as NixBuiltins from './nix-builtins.js';
import { NixEvalError, NixSyntaxError, NixEvalNotImplemented } from "./nix-errors.js"
import { configure as getStringifyResult } from '../src/nix-eval-stringify/index.js'
import { resetInfiniteLoopCounter, } from './infinite-loop-counter.js';

import { stringifyTree } from './lezer-parser-nix/src/nix-format.js'

import fs from 'node:fs'
import path from 'node:path'

// "export { ... } from '...'" is not working in vite
export {
  LezerParserNix,
  thunkOfNodeType,
  callThunk,
  firstChild,
  nextSibling,
  nodeText,
  printNode,
  getStringifyResult,
  NixEvalError,
  NixSyntaxError,
  NixEvalNotImplemented,
  stringifyTree,
}



// TODO rename "result" to "value"
const stringifyValue = getStringifyResult()



/** @typedef {Record<string, any>} Options */



class CallStack {
  constructor(state) {
    /** @type {SyntaxNode[]} */
    this.stack = []
    this.state = state
  }
  /** @type {function(SyntaxNode): void} */
  push(node) {
    this.stack.push(node)
  }
  /** @type {function(): SyntaxNode?} */
  pop() {
    return this.stack.pop() || null
  }
  /** @type {function(): SyntaxNode?} */
  peek() {
    return this.stack[this.stack.length - 1] || null
  }
  /** @type {function(): string} */
  toString() {
    const result = []
    for (const node of this.stack) {
      let src = this.state.source.slice(node.from, node.to)
      src = src.replace(/\n/g, '\\n')
      result.push(`${node.from}-${node.to}: ${node.type.name}: ${src}`)
    }
    return result.join('\n')
  }
}

export class State {
  /** @type {string} */
  source = ''
  // TODO refactor. make this more like EvalState in nix
  /** @type {function({ source: string, options: Object })} */
  constructor({ source, options }) {
    this.source = source
    this.options = options
    this.stack = new CallStack(this)
  }
}

const debugEnv = false

export class Env {
  /** @type {Record<string, any>} */
  data = {}
  parent = null // aka "outer env"
  /** @type {Env[]} */
  children = []
  node = null
  constructor(
    /** @type {Env} */
    parent = null,
    /** @type {SyntaxNode} */
    node = null,
  ) {
    if (parent) this.parent = parent
    this.depth = parent ? (parent.depth + 1) : 0
    if (node) this.node = node
    if (node) {
      //console.log(`Env: node`, node)
      //console.log(`Env: node.constructor.name`, node.constructor.name)
      // this breaks in production build
      // Error expected node type BufferNode, actual node type BufferNode$1
      //if (node.constructor.name != 'BufferNode') {
      // no. BufferNode is not exported in node_modules/@lezer/common/dist/index.js
      // TODO feature request: export BufferNode (etc) from @lezer/common for instanceof checks
      //if (!(node instanceof BufferNode)) {
      // no. typeof(node) == 'object'
      //if (typeof(node) != 'BufferNode') {
      /* TODO why error?
      if (
        node.constructor.name != 'BufferNode'
        // quickfix for vite production build
        // TODO disable mangling of class names in esbuild?
        // see vite.config.js
        && node.constructor.name != 'BufferNode$1'
      ) {
        throw new Error(`expected node type BufferNode, actual node type ${node.constructor.name}`)

      }
      */
    }
  }
  newChild(
    /** @type {SyntaxNode} */
    node = null,
  ) {
    const env = new this.constructor(this, node);
    this.children.push(env);
    return env;
  }
  /** @type {function(): string} */
  toString() {
    return this.data.toString()
  }
  /** @type {function(string, any | undefined): void} */
  set(key, value) {
    this.data[key] = value
  }
  /** @type {function(string): any | undefined} */
  get(key) {
    let env = this
    while (env) {
      if (Object.hasOwn(env.data, key)) {
        debugEnv && console.log(`Env.get: key=${key} depth=${env.depth} -> found`)
        return env.data[key]
      }
      debugEnv && console.log(`Env.get: key=${key} depth=${env.depth} env_keys=${Object.keys(env.data)}`)
      env = env.parent
    }
    // variable is undefined
    //throw new ReferenceError()
    debugEnv && console.log(`Env.get: key=${key} -> NOT found`)
    return undefined
  }
  has(key) {
    return Object.hasOwn(this.data, key);
  }
}

// TODO class Node?
// pretty print
// TODO function signature of toString?
// NOTE this will add a trailing newline,
// so instead of console.log(String(node))
// use process.stdout.write(String(node))

function nodeToString(depth = 0, maxDepth = 5, indent = "  ", extraDepth = 0) {
  const thisIndent = indent.repeat(extraDepth + depth);
  const children = depth < maxDepth ? this.children.map(
    child => child.toString(depth + 1, maxDepth, indent, extraDepth)
  ).join('') : '[Children]\n';
  const thisString = `${thisIndent}${this.type}: ${this.text}\n${children}`;
  // debug
  //if (this.type == 'Primop' && this.text == '__add') console.log(); console.dir({ depth, extraDepth, type: this.type, text: this.text, thisIndent, children, thisString }); console.log();
  return thisString;
};



export class NixEval {

  constructor() {
    //console.log(`NixEval.constructor`);
    resetInfiniteLoopCounter();
  }

  /**
  * evalute a nix expression
  *
  * @param {string} source
  * @param {Options} options
  * @return {any}
  */
  eval(source, options) {

    if (!options) options = {}
    if (!options.workdir) options.workdir = process.cwd();

    // default: strict is false
    //tree = LezerParserNix.parse(source);

    const parser = this.getParser();

    /* not used
    const trivialValueTypeSet = new Set([
      'boolean',
      'string',
      'number',
      'bigint',
    ]);

    // nix/src/libexpr/eval.cc
    // bool Value::isTrivial() const
    const isTrivialValue = (value) => (
      trivialValueTypeSet.has(typeof value) ||
      value === null ||
      false
    );
    */

    const valueCache = new Map();
    const debugCache = false

    const evalNode = (node, state, env) => {
      // dont cache
      //return node.type.evalHidden(node, state, env);
      // cache
      //const debugCache = true
      //debugCache && console.log("evalNode"); console.dir(node);
      //const cacheKey = node; // fail. no cache hits
      const cacheKey = this.normalNode(node, state.source);
      if (valueCache.has(cacheKey)) {
        // cache hit -> read cache
        // FIXME valueCache must be scoped -> move to Env
        const value = valueCache.get(cacheKey);
        debugCache && console.log(`cache read : ${node.type.name}: ${cacheKey} -> ${stringifyValue(value)}`);
        return value;
      }
      // cache miss
      // compute value
      //const value = node.type.thunk(node, state, env);
      const value = node.type.evalHidden(node, state, env);
      //debugCache && console.log(`cache miss: ${cacheKey} -> ${stringifyValue(value)}`);
      //debugCache && console.dir({f: "cache miss", cacheKey, value, type: node.type.name });
      // write cache
      // FIXME only store constants ("trivial" values), dont store variables
      //if (isTrivialValue(value)) {
      if (!(
        node.type.name == "Identifier" ||
        node.type.name == "Int" ||
        node.type.name == "Nix" ||
        // TODO more. see isTrivialValue
        false
      )) {
        debugCache && console.log(`cache write: ${node.type.name}: ${cacheKey} -> ${stringifyValue(value)}`);
        valueCache.set(cacheKey, value);
      }
      return value;
    };

    for (const type of parser.nodeSet.types) {
      type.eval = evalNode;
    }

    const tree = this.getTree(source, {parser});

    return this.evalTree(tree, source, options);
  }

  /**
  * evalute a nix expression from a nix file
  *
  * @param {string} filePath
  * @param {Options} options
  * @return {any}
  */
  evalFile(filePath, options) {
    if (!options) options = {}
    if (!options.workdir) options.workdir = path.dirname(filePath)
    const source = fs.readFileSync(filePath, 'utf8');
    return this.eval(source, options)
  }

  /**
  * evalute a nix expression from a parse tree
  *
  * @param {Tree} tree
  * @param {string} source
  * @param {Options} options
  * @return {any}
  */
  evalTree(tree, source, options) {
    if (!options) options = {}
    // multicall hack ... todo refactor?
    if (options.normal) {
      // only nomalize
      return this.normalTree(tree, source, options);
    }
    if (!options.workdir) options.workdir = process.cwd();
    const evalState = new State({
      source,
      options,
    })
    const evalEnv = new Env();
    evalEnv.data = {
      // import is just a global function, which can be shadowed
      // nix-repl> let import = x: "shadow"; in import 1
      // "shadow"
      /** @type {function(Path): any} */
      import: (filePath) => {
        const debug = true
        if (filePath instanceof Path) {
          filePath = String(filePath)
        }
        else if (typeof(filePath) == 'string') {
          if (filePath[0] != '/') {
            throw new NixEvalError(`string '${filePath}' doesn't represent an absolute path`)
          }
        }
        else {
          throw new NixEvalError(`cannot coerce ${nixTypeWithArticle(filePath)} to a string`)
        }

        debug && console.log(`NixEval.evalTree import: filePath`, filePath);
        // FIXME path is resolved in thunk PathRelative
        filePath = path.resolve(options.workdir, filePath)
        debug && console.log(`NixEval.evalTree import: resolved filePath`, filePath);
        return this.evalFile(filePath);
      },

      abort: (message) => {
        throw new NixEvalError(`aborted: ${message}`)
      },

      toString: (value) => {
        // TODO ...
        // use stringifyValue?
        return String(value)
      },
    }
    const builtinsEnv = evalEnv.data.builtins = evalEnv.newChild();

    //builtinsEnv.data.typeOf = NixPrimops.__typeOf;
    for (const primopKey in NixPrimops) {
      // remove the "__" prefix
      const primopName = primopKey.slice(2);
      builtinsEnv.data[primopName] = NixPrimops[primopKey];
    }

    for (const key in NixBuiltins) {
      builtinsEnv.data[key] = NixBuiltins[key];
    }

    builtinsEnv.data['true'] = true;
    builtinsEnv.data['false'] = false;
    builtinsEnv.data['null'] = null;

    builtinsEnv.data['import'] = evalEnv.data['import'];

    const topNode = tree.topNode;
    return topNode.type.eval(topNode, evalState, evalEnv);
  }

  /**
  * normalize a nix expression to its normal form
  *
  * @param {string} source
  * @param {Options} options
  * @return {string}
  */
  normal(source, options) {
    const tree = this.getTree(source);
    return this.normalTree(tree, source, options);
  }

  /**
  * normalize a parsed nix expression to its normal form
  *
  * @param {Tree} tree
  * @param {string} source
  * @param {Options} options
  * @return {string}
  */
  normalTree(tree, source, options) {
    return this.normalNode(tree.topNode, source, options)
  }

  /**
  * normalize a parsed nix expression to its normal form
  *
  * @param {TreeNode} node
  * @param {string} source
  * @param {Options} options
  * @return {string}
  */
  normalNode(node, source, options) {
    if (!options) options = {}
    if (!options.workdir) options.workdir = path.dirname(filePath)
    const state = { source, options };
    // note: env ist not passed to format
    return node.type.normal(node, state);
  }

  /** @return {Parser} */
  getParser() {
    const parser = LezerParserNix.configure({
      strict: true, // throw on parse error
    });

    // add thunks to types
    for (const type of parser.nodeSet.types) {
      //type.eval = evalNode; // calls evalHidden
      // eval is cached, evalHidden is not cached
      type.evalHidden = thunkOfNodeType[type.name];
      type.format = formatOfNodeType[type.name];
      type.normal = normalThunks[type.name];
    }

    return parser
  }

  /** @return {Tree} */
  getTree(source, options) {
    if (!options) options = {};
    const parser = options.parser || this.getParser();
    try {
      return parser.parse(source);
    }
    catch (error) {
      if (error instanceof SyntaxError) {
        // TODO error message?
        throw new NixSyntaxError('unexpected invalid token');
      }
    }
    if (tree === undefined) {
      throw new Error('tree is undefined. FIXME handle large inputs over 3 KByte');
    }
  }

}
