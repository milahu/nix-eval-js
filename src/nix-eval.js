// https://github.com/dtao/lazy.js
//import * as Lazy from "lazy.js";

// TODO sharing = caching of node values, based on semantic equality of nodes

import { parser as LezerParserNix } from "./lezer-parser-nix/dist/index.js"
//import { parser as LezerParserNix } from "../demo/src/codemirror-lang-nix/src/lezer-parser-nix/dist/index.js"
//import { parser as LezerParserNix } from "../demo/src/codemirror-lang-nix/dist/index.js"



import { setThunkOfNodeType } from "./nix-thunks.js"
import { NixEvalError, NixSyntaxError, NixEvalNotImplemented } from "./nix-errors.js"

// "export { ... } from '...'" is not working in vite
export {
  LezerParserNix,
  setThunkOfNodeType,
  NixEvalError,
  NixSyntaxError,
  NixEvalNotImplemented,
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

    //console.log(`NixEval.evalTree`);
/*
    // TODO check tree for parse errors
NixEvalNotImplemented
setThunk is empty for token ⚠

*/

    let depth = 0;
    const cursor = tree.cursor();



    const rootNode = {};

    Object.defineProperties(rootNode, {
      'type': { value: "Nix", enumerable: true },
      'text': { value: source, enumerable: true },
      'thunk': { value: null, writable: true }, // hidden
      'depth': { value: depth }, // hidden
      'parent': { value: null }, // hidden
      'children': { value: [], enumerable: true },
    });

    rootNode.toString = nodeToString;

    let parentNode = rootNode;



    // walk tree of nodes

    // https://en.wikipedia.org/wiki/Tree_traversal#In-order,_LNR
    // In-order, LNR
    // 1. Recursively traverse the current node's left subtree. // cursor.firstChild
    // 2. Visit the current node.
    // 3. Recursively traverse the current node's right subtree. // cursor.nextSibling
    // https://rosettacode.org/wiki/Tree_traversal#JavaScript
    // https://github.com/lezer-parser/common/blob/main/src/tree.ts # TreeCursor.iterate

    while (true) {

      const cursorText = source.slice(cursor.from, cursor.to);
      const cursorType = cursor.name;
      //const cursorTypeId = cursor.type.id; // TODO use numeric types

      // defineProperties:
      // hide some properties -> prettier output from console.dir
      // make some properties read-only -> better performance?

      const thisNode = {};

      Object.defineProperties(thisNode, {
        'type': { value: cursorType, enumerable: true },
        'text': { value: cursorText, enumerable: true },
        'thunk': { value: null, writable: true }, // hidden
        'depth': { value: depth }, // hidden
        'parent': { value: parentNode }, // hidden
        'children': { value: [], enumerable: true },
      });

      thisNode.toString = nodeToString;

      parentNode.children.push(thisNode);



      // 1. Recursively traverse the current node's left subtree.
      // case "left": if (this.left) this.left.walk(func, order); break;
      //console.log(`${'  '.repeat(depth)}1. ${cursorType}: ${cursorText}`);
      //console.log(`step 1: thisNode:`); console.dir(thisNode);

      // deep first
      // try to move down
      if (cursor.firstChild()) {
        // moved down
        parentNode = thisNode;
        depth++;
        continue;
      }



      // 2. Visit the current node.
      // case "this": func(this.value); break;

      //console.log(`step 2: thisNode:`); console.dir(thisNode);
      //console.log(`${'  '.repeat(depth)}2. ${cursorType}: ${cursorText}`);

      // bottom-up
      //console.log(`NixEval.evalTree: ${'  '.repeat(depth)}${cursorTypeId}=${cursorType}: ${cursorText} rootNode`, rootNode, 'parentNode', parentNode);

      function nodeSetThunk(node) {
        const setThunk = setThunkOfNodeType[node.type]; // all node types must be mapped
        if (setThunk) {
          //console.log(`setThunk for token ${node.type}`);
          setThunk(node);
        }
        else if (setThunk === undefined) {
          throw new NixEvalNotImplemented(`setThunk is empty for token ${node.type}`);
        }
      }

      let currentNode = thisNode;
      while (currentNode = currentNode.parent) {
        for (const node of currentNode.children) {
          nodeSetThunk(node);
        }
        //nodeSetThunk(currentNode); // no
      }

      //console.log('NixEval.evalTree: done convert. rootNode', rootNode); // FIXME this should be Nix

      //console.log('NixEval.evalTree: final eval: rootNode.children[0]', rootNode.children[0]); // Nix

      // TODO? continue walking nodes in tree

      /*
      // try to move up and right
      if (cursor.parent() && cursor.nextSibling()) { // TODO verify
        // moved up and right
        parentNode = parentNode.parent;
        continue;
      }
      */



      // 3. Recursively traverse the current node's right subtree.
      // case "right": if (this.right) this.right.walk(func, order); break;

      //console.log(`step 3: thisNode:`); console.dir(thisNode);
      //console.log(`${'  '.repeat(depth)}3. ${cursorType}: ${cursorText}`);

      // move right and up

      //console.log(`${'  '.repeat(depth)}4. ${cursorType}: ${cursorText}`);

      while (true) {
        if (cursor.nextSibling()) {
          // moved right
          break
        }
        if (cursor.parent()) {
          // moved up
          parentNode = parentNode.parent;
          depth--;
        }
        else {
          // not moved up
          // done walking all nodes

          if (rootNode.children[0].children.length == 0) {
            // empty input
            return undefined;
          }

          const evalResult = rootNode.children[0].thunk();
          //console.log('NixEval.evalTree: evalResult', evalResult);
          return evalResult;
        }
      }
    }
  }
}


