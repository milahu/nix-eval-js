// https://github.com/dtao/lazy.js
//import * as Lazy from "lazy.js";

// TODO sharing = caching of node values, based on semantic equality of nodes

import { parser as LezerParserNix } from "./lezer-parser-nix/dist/index.js"
//import { parser as LezerParserNix } from "../demo/src/codemirror-lang-nix/src/lezer-parser-nix/dist/index.js"
//import { parser as LezerParserNix } from "../demo/src/codemirror-lang-nix/dist/index.js"

import { resetInfiniteLoopCounter, thunkOfNodeType } from './nix-thunks-lezer-parser.js';
import { NixEvalError, NixSyntaxError, NixEvalNotImplemented } from "./nix-errors.js"
import { configure as getStringifyResult } from '../src/nix-eval-stringify/index.js'



// "export { ... } from '...'" is not working in vite
export {
  LezerParserNix,
  thunkOfNodeType,
  getStringifyResult,
  NixEvalError,
  NixSyntaxError,
  NixEvalNotImplemented,
}

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
  /** @type {function({ source: string })} */
  constructor({ source }) {
    this.source = source
    this.stack = new CallStack(this)
  }
}



const debugEnv = false

export class Env {
  /** @type {Record<string, any>} */
  data = {}
  parent = null // aka "outer env"
  constructor(parent = null, data = {}) {
    if (parent) this.parent = parent
    this.depth = parent ? (parent.depth + 1) : 0
    if (data) this.data = data
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

  eval(source) {

    // default: strict is false
    //tree = LezerParserNix.parse(source);

    const strictParser = LezerParserNix.configure({
      strict: true, // throw on parse error
    });

    // add thunks to types
    // TODO? move to evalTree
    for (const nodeType of strictParser.nodeSet.types) {
      nodeType.thunk = thunkOfNodeType[nodeType.name];
    }

    let tree;
    try {
      tree = strictParser.parse(source);
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
    return this.evalTree(tree, source);
  }

  evalTree(tree, source) {
    const evalState = new State({
      source,
    })
    const evalEnv = new Env(null, {
      //test: 'hello world',
    })
    const topNode = tree.topNode;
    return topNode.type.thunk(topNode, evalState, evalEnv);
  }
}
