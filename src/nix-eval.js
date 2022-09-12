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
    const rootNode = {
      type: null,
      text: null,
      parent: null,
      children: [],
      depth: null,
      thunk: null,
      //value: undefined,
    };
    let parentNode = rootNode;
    let lastNode = null;
    while (true) {
      const cursorText = source.slice(cursor.from, cursor.to);
      const cursorType = cursor.name;
      const cursorTypeId = cursor.type.id;

      const thisNode = {
        type: cursorType,
        text: cursorText,
        parent: parentNode,
        children: [],
        depth,
        thunk: null,
        //value: undefined,
      };

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
        'NixExpr': (node) => (node.thunk = () => node.children[0].thunk()), // identity // TODO remove
        'True': (node) => (node.thunk = () => true),
        'False': (node) => (node.thunk = () => false),
        'Null': (node) => (node.thunk = () => null),
        'IfExpr': (node) => (node.thunk = () => (node.children[1].thunk() ? node.children[3].thunk() : node.children[5].thunk())),
        'If': null,
        'Then': null,
        'Else': null,
        'Int': (node) => (node.thunk = () => parseInt(node.text)),
        'Float': (node) => (node.thunk = () => parseFloat(node.text)),
        'AddExpr': (node) => (node.thunk = () => (node.children[0].thunk() + node.children[2].thunk())),
        'Add': null,
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
      }

      function nodeSetThunk(node) {
        const setThunk = setThunkOfNodeType[node.type]; // all node types must be mapped
        if (setThunk) {
          setThunk(node);
        }
      }

      let currentNode = thisNode;
      while (currentNode = currentNode.parent) {
        for (const node of currentNode.children) {
          nodeSetThunk(node);
        }
        //nodeSetThunk(node); // no
      }

      //console.log('NixEval.evalTree: done convert. rootNode', rootNode); // FIXME this should be Nix

      console.log('NixEval.evalTree: final eval: rootNode.children[0]', rootNode.children[0]); // NixExpr

      const evalResult = rootNode.children[0].thunk();
      console.log('NixEval.evalTree: evalResult', evalResult);
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