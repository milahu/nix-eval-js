// https://github.com/dtao/lazy.js
//import * as Lazy from "lazy.js";

// TODO sharing = caching of node values, based on semantic equality of nodes

import { parser as LezerParserNix } from "./lezer-parser-nix/dist/index.js"



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



function printNode(node, label = '') {
  if (label) {
    console.log(`\n${label}: node:`);
  }
  // set extraDepth = 1 to indent the node
  process.stdout.write(node.toString(0, 5, "  ", 1));
}



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
        'Primop': (node) => {
          const setThunk = NixPrimOps[node.text];
          setThunk(node);
        },
        /*
        'Primop': (node) => {
          console.log(`Primop: node.text = ${node.text}`);
          const op = NixPrimOps[node.text];
          node.thunk = () => op;
        },
        */

        /*
          node ./src/lezer-parser-nix/test/manual-test.js "__add 1 2"

          Nix
            Call "__add 1 2"
              Call "__add 1"
                Primop "__add"
                Int "1"
              Int "2"
        */

        // TODO setThunk.__add: node

        'Call': (node) => {
            //printNode(node, "setThunk.Call");
            /*
            if (node.children.length == 0) {
              console.log(`Call.thunk: no children -> TODO`); console.dir(node);
              return 'TODO';
            }
            */
            //return node.children[0].thunk()( node.children[1].thunk() ); // node.children[1] is undef
            node.thunk = () => {
              //printNode(node, "Call.thunk");
              // FIXME TypeError: node.children[0].thunk(...) is not a function
              return node.children[0].thunk()( node.children[1].thunk() );
            };
        },
        'CallSub': (node) => (node.thunk = () => (node.children[0].thunk() - node.children[1].thunk())),
        // SubExpr is not used
        // lezer-parser-nix/src/nix.grammar
        // NegativeExpr has higher precedence than SubExpr, so 1-2 -> (1) (-2) -> ApplyExpr
        // nix parser/interpreter: Nix(ApplyExpr(__sub,Int,Int))
        //'SubExpr': (node) => (node.thunk = () => (node.children[0].thunk() - node.children[2].thunk())),
        //'Sub': null, // '-' // not used? - is parsed as Negative. bug in parser grammar?
        'NegativeExpr': (node) => (node.thunk = () => (- node.children[1].thunk())),
        'CallNeg': (node) => (node.thunk = () => (- node.children[0].thunk())),
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

          /*
          // TODO
          // https://stackoverflow.com/questions/28072671/how-can-i-get-console-log-to-output-the-getter-result-instead-of-the-string-ge
          // print getter values in util.inspect(result)
          const customInspectSymbol = Symbol.for('nodejs.util.inspect.custom');
          node.data[customInspectSymbol] = function(depth, inspectOptions, inspect) {
            return `{ a=1; b=2; }`;
          };
          */

          //console.log(`AttrSet.thunk: node:`); console.dir(node);
          // TODO cache
          for (const attr of node.children) {
            //console.log(`AttrSet.thunk: attr:`); console.dir(attr);
            const key = attr.children[0].thunk();
            //console.log(`AttrSet.thunk: key = ${key}`)
            Object.defineProperty(node.data, key, {
              get: attr.children[1].thunk,
              enumerable: true,
            });
          }
          return node.data;
        }),
        // generator function returns iterator
        'List': (node) => (node.thunk = function* (){
          for (const child of node.children) {
            yield child.thunk();
          }
        }),
        // TODO
        'RecAttrSet': (node) => (node.thunk = () => {
          //printNode(node, "RecAttrSet.thunk");
          return {};
        }),
        'Attr': false,
        'Identifier': (node) => (node.thunk = () => node.text),
        'Select': (node) => (node.thunk = () => {
          ////printNode(node, "Select.thunk");
          return node.children[0].thunk()[ node.children[1].thunk() ];
        }),

        // TODO
        'Var': (node) => (node.thunk = () => {
          //printNode(node, "Var.thunk");
          return 'TODO';
        }),
      }

      setThunkOfNodeType.Let = (node) => (node.thunk = () => {
        // syntax sugar:   let a=1; in a   ->   (rec{a=1;}).a
        // TODO refactor setThunkOfNodeType to class
        //printNode(node, "Let.thunk");
        return 'TODO';
      });

      function nodeSetThunk(node) {
        const setThunk = setThunkOfNodeType[node.type]; // all node types must be mapped
        if (setThunk) {
          //console.log(`setThunk for token ${node.type}`);
          setThunk(node);
        }
        else if (setThunk === undefined) {
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



// primary operations

// cat primops.cc | grep '.name = "__' | cut -d'"' -f2 | sed -E 's/^(.*)$/  "\1": node => TodoPrimOp(node, "\1"),/'

function TodoPrimOp(node, opName) {
  console.log(`TODO PrimOp ${opName}`);
  return 'TODO';
}

export const NixPrimOps = {

  "__typeOf": node => TodoPrimOp(node, "__typeOf"),
  "__isFunction": node => TodoPrimOp(node, "__isFunction"),
  "__isInt": node => TodoPrimOp(node, "__isInt"),
  "__isFloat": node => TodoPrimOp(node, "__isFloat"),
  "__isString": node => TodoPrimOp(node, "__isString"),
  "__isBool": node => TodoPrimOp(node, "__isBool"),
  "__isPath": node => TodoPrimOp(node, "__isPath"),
  "__genericClosure": node => TodoPrimOp(node, "__genericClosure"),
  "__addErrorContext": node => TodoPrimOp(node, "__addErrorContext"),
  "__ceil": node => TodoPrimOp(node, "__ceil"),
  "__floor": node => TodoPrimOp(node, "__floor"),
  "__tryEval": node => TodoPrimOp(node, "__tryEval"),
  "__getEnv": node => TodoPrimOp(node, "__getEnv"),
  "__seq": node => TodoPrimOp(node, "__seq"),
  "__deepSeq": node => TodoPrimOp(node, "__deepSeq"),
  "__trace": node => TodoPrimOp(node, "__trace"),
  "__toPath": node => TodoPrimOp(node, "__toPath"),
  "__storePath": node => TodoPrimOp(node, "__storePath"),
  "__pathExists": node => TodoPrimOp(node, "__pathExists"),
  "__readFile": node => TodoPrimOp(node, "__readFile"),
  "__findFile": node => TodoPrimOp(node, "__findFile"),
  "__hashFile": node => TodoPrimOp(node, "__hashFile"),
  "__readDir": node => TodoPrimOp(node, "__readDir"),
  "__toXML": node => TodoPrimOp(node, "__toXML"),
  "__toJSON": node => TodoPrimOp(node, "__toJSON"),
  "__fromJSON": node => TodoPrimOp(node, "__fromJSON"),
  "__toFile": node => TodoPrimOp(node, "__toFile"),
  "__filterSource": node => TodoPrimOp(node, "__filterSource"),
  "__path": node => TodoPrimOp(node, "__path"),
  "__attrNames": node => TodoPrimOp(node, "__attrNames"),
  "__attrValues": node => TodoPrimOp(node, "__attrValues"),
  "__getAttr": node => TodoPrimOp(node, "__getAttr"),
  "__unsafeGetAttrPos": node => TodoPrimOp(node, "__unsafeGetAttrPos"),
  "__hasAttr": node => TodoPrimOp(node, "__hasAttr"),
  "__isAttrs": node => TodoPrimOp(node, "__isAttrs"),
  "__listToAttrs": node => TodoPrimOp(node, "__listToAttrs"),
  "__intersectAttrs": node => TodoPrimOp(node, "__intersectAttrs"),
  "__catAttrs": node => TodoPrimOp(node, "__catAttrs"),
  "__functionArgs": node => TodoPrimOp(node, "__functionArgs"),
  "__mapAttrs": node => TodoPrimOp(node, "__mapAttrs"),
  "__zipAttrsWith": node => TodoPrimOp(node, "__zipAttrsWith"),
  "__isList": node => TodoPrimOp(node, "__isList"),
  "__elemAt": node => TodoPrimOp(node, "__elemAt"),
  "__head": node => TodoPrimOp(node, "__head"),
  "__tail": node => TodoPrimOp(node, "__tail"),
  "__filter": node => TodoPrimOp(node, "__filter"),
  "__elem": node => TodoPrimOp(node, "__elem"),
  "__concatLists": node => TodoPrimOp(node, "__concatLists"),
  "__length": node => TodoPrimOp(node, "__length"),
  "__foldl'": node => TodoPrimOp(node, "__foldl'"),
  "__any": node => TodoPrimOp(node, "__any"),
  "__all": node => TodoPrimOp(node, "__all"),
  "__genList": node => TodoPrimOp(node, "__genList"),
  "__sort": node => TodoPrimOp(node, "__sort"),
  "__partition": node => TodoPrimOp(node, "__partition"),
  "__groupBy": node => TodoPrimOp(node, "__groupBy"),
  "__concatMap": node => TodoPrimOp(node, "__concatMap"),
  "__add": node => {
    //printNode(node, "setThunk.__add");
    node.thunk = () => {
      //printNode(node, "__add.thunk");
      // partial add function
      return (arg1) => {
        // add function
        return (arg2) => (arg1 + arg2);
      };
    }
  },
  "__sub": node => {
    node.thunk = () => {
      // partial sub function
      return (arg1) => {
        // sub function
        return (arg2) => (arg1 - arg2);
      };
    }
  },
  "__mul": node => {
    node.thunk = () => {
      // partial mul function
      return (arg1) => {
        // mul function
        return (arg2) => (arg1 * arg2);
      };
    }
  },
  "__div": node => {
    node.thunk = () => {
      // partial div function
      return (arg1) => {
        // div function
        return (arg2) => (arg1 / arg2);
      };
    }
  },
  "__bitAnd": node => TodoPrimOp(node, "__bitAnd"),
  "__bitOr": node => TodoPrimOp(node, "__bitOr"),
  "__bitXor": node => TodoPrimOp(node, "__bitXor"),
  "__lessThan": node => TodoPrimOp(node, "__lessThan"),
  "__substring": node => TodoPrimOp(node, "__substring"),
  "__stringLength": node => TodoPrimOp(node, "__stringLength"),
  "__hashString": node => TodoPrimOp(node, "__hashString"),
  "__match": node => TodoPrimOp(node, "__match"),
  "__split": node => TodoPrimOp(node, "__split"),
  "__concatStringsSep": node => TodoPrimOp(node, "__concatStringsSep"),
  "__replaceStrings": node => TodoPrimOp(node, "__replaceStrings"),
  "__parseDrvName": node => TodoPrimOp(node, "__parseDrvName"),
  "__compareVersions": node => TodoPrimOp(node, "__compareVersions"),
  "__splitVersion": node => TodoPrimOp(node, "__splitVersion"),
  "__traceVerbose": node => TodoPrimOp(node, "__traceVerbose"),

};

