// https://github.com/dtao/lazy.js
//import * as Lazy from "lazy.js";

// TODO sharing = caching of node values, based on semantic equality of nodes

import { parser as LezerParserNix } from "./lezer-parser-nix/dist/index.js"

export default class NixEval {
  constructor() {
    //console.log(`NixEval.constructor`);
  }

  eval(source) {
    const tree = LezerParserNix.parse(source);
    return this.evalTree(tree, source);
  }

  evalTree(tree, source) {
    //console.log(`NixEval.evalTree`);
    const cursor = tree.cursor();
    let depth = 0;

    const rootNode = {};
    Object.defineProperties(rootNode, {
      'type': { value: "Nix", enumerable: true },
      'text': { value: source, enumerable: true },
      'thunk': { value: null, writable: true }, // hidden
      'depth': { value: depth }, // hidden
      'parent': { value: null }, // hidden
      'children': { value: [], enumerable: true },
    });

    let parentNode = rootNode;
    let lastNode = null;
    while (true) {
      const cursorText = source.slice(cursor.from, cursor.to);
      const cursorType = cursor.name;
      const cursorTypeId = cursor.type.id;

      const thisNode = {};
      Object.defineProperties(thisNode, {
        'type': { value: cursorType, enumerable: true },
        'text': { value: cursorText, enumerable: true },
        'thunk': { value: null, writable: true }, // hidden
        'depth': { value: depth }, // hidden
        'parent': { value: parentNode }, // hidden
        'children': { value: [], enumerable: true },
      });

      parentNode.children.push(thisNode);

      //console.log(`NixEval.evalTree: ${'  '.repeat(depth)}${cursorTypeId}=${cursorType}: ${cursorText}`);
      if (cursor.firstChild()) {
        // deep first
        parentNode = thisNode;
        depth++;
        continue;
      }

      if (cursor.nextSibling()) {
        // broad second
        continue;
      }

      // bottom-up
      //console.log(`NixEval.evalTree: ${'  '.repeat(depth)}${cursorTypeId}=${cursorType}: ${cursorText} rootNode`, rootNode, 'parentNode', parentNode);

      const setThunkOfNodeType = {
        'Nix': (node) => (node.thunk = () => node.children[0].thunk()), // identity // TODO remove
        'TRUE': (node) => (node.thunk = () => true),
        'FALSE': (node) => (node.thunk = () => false),
        'NULL': (node) => (node.thunk = () => null),
        'If': (node) => (node.thunk = () => (node.children[0].thunk() ? node.children[1].thunk() : node.children[2].thunk())),
        'Int': (node) => (node.thunk = () => parseInt(node.text)),
        'Float': (node) => (node.thunk = () => parseFloat(node.text)),
        'ConcatStrings': (node) => (node.thunk = () => (node.children[0].thunk() + node.children[1].thunk())),
        'Add': null,
        'CallSub': (node) => (node.thunk = () => (node.children[0].thunk() - node.children[1].thunk())),
        // SubExpr is not used
        // lezer-parser-nix/src/nix.grammar
        // NegativeExpr has higher precedence than SubExpr, so 1-2 -> (1) (-2) -> ApplyExpr
        // nix parser/interpreter: Nix(ApplyExpr(__sub,Int,Int))
        //'SubExpr': (node) => (node.thunk = () => (node.children[0].thunk() - node.children[2].thunk())),
        //'Sub': null, // '-' // not used? - is parsed as Negative. bug in parser grammar?
        'NegativeExpr': (node) => (node.thunk = () => (- node.children[1].thunk())),
        'Negative': null, // '-'
        // naive apply
        //'ApplyExpr': (node) => (node.thunk = () => node.children[0].thunk()( node.children[1].thunk() )),
        'ApplyExpr': (node) => (node.thunk = () => {
          if (node.children[1].type == 'NegativeExpr') {
            // exception to implement SubExpr(Int,Int) as ApplyExpr(__sub,Int,Int)
            // or rather: ApplyExpr(__add,Int,NegativeExpr(Int))
            return (node.children[0].thunk() + node.children[1].thunk());
          }
          else {
            // apply function
            return node.children[0].thunk()( node.children[1].thunk() );
          }
        }),
        'AttrSet': (node) => (node.thunk = () => {
          if (!node.data) node.data = {};
          console.log(`AttrSet.thunk: TODO ... node:`)
          console.dir(node);
          for (const attr of node.children) {
            console.log(`AttrSet.thunk: TODO ... attr:`)
            console.dir(attr);
            const key = attr.children[0].thunk();
            console.log(`AttrSet.thunk: key = ${key}`)
            Object.defineProperty(node.data, key, {
              get: attr.children[1].thunk,
              enumerable: true,
            });
          }
          return node.data;
        }),
        // note: only the attr value is lazy
        'Attr': (node) => (node.thunk = () => {
          console.log(`Attr.thunk: TODO ... node:`)
          console.dir(node);
          // TODO handle select, use only first key
          const key = node.children[0].thunk();
          Object.defineProperty(node.parent.data, key, {
            get: node.children[1].thunk
          });
        }),
        'Identifier': (node) => (node.thunk = () => {
          //console.log(`Identifier.thunk: TODO ... node:`)
          //console.dir(node);
          return node.text;
        }),
        'Select': (node) => (node.thunk = () => {
          console.log(`Select.thunk: TODO ... node:`)
          console.dir(node, { depth: 10 });
          // FIXME attrpath node is missing -> bug in tree walker
          return "todo";
        }),
      }

      function nodeSetThunk(node) {
        const setThunk = setThunkOfNodeType[node.type]; // all node types must be mapped
        if (setThunk) {
          //console.log(`setThunk for token ${node.type}`);
          setThunk(node);
        }
        else {
          console.error(`nix-eval.js error: setThunk is empty for token ${node.type}`);
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

      const evalResult = rootNode.children[0].thunk();
      //console.log('NixEval.evalTree: evalResult', evalResult);
      return evalResult;

      // TODO? continue walking nodes in tree

      if (cursor.parent() && cursor.nextSibling()) { // TODO verify
        parentNode = parentNode.parent;
        continue;
      }

      break; // done all nodes
    }
    //console.log(`NixEval.evalTree: done tree walk. depth=${depth}`);
  }
}
