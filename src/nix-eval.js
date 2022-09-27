// https://github.com/dtao/lazy.js
//import * as Lazy from "lazy.js";

// TODO sharing = caching of node values, based on semantic equality of nodes

import { parser as LezerParserNix } from "./lezer-parser-nix/dist/index.js"
//import { parser as LezerParserNix } from "../demo/src/codemirror-lang-nix/src/lezer-parser-nix/dist/index.js"
//import { parser as LezerParserNix } from "../demo/src/codemirror-lang-nix/dist/index.js"

import { thunkOfNodeType } from './nix-thunks-lezer-parser.js';
import { NixEvalError, NixSyntaxError, NixEvalNotImplemented } from "./nix-errors.js"



// "export { ... } from '...'" is not working in vite
export {
  LezerParserNix,
  thunkOfNodeType,
  NixEvalError,
  NixSyntaxError,
  NixEvalNotImplemented,
}

export class State {
  /** @type {string} */
  source = ''
  /** @type {function({source: string})} */
  constructor({ source }) {
    this.source = source
  }
}

export class Env {
  /** @type {Record<string, any>} */
  data = {}
  parent = null // aka "outer env"
  constructor(data = {}, parent = null) {
    if (data) this.data = data
    if (parent) this.parent = parent
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
    return tree.topNode.type.thunk(tree.topNode, source);
  }
}
