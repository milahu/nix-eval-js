import { NixPrimOps } from "./nix-primops.js"
import { NixEvalError, NixSyntaxError, NixEvalNotImplemented } from './nix-errors.js';
import { dropCursor } from "../demo/cm-view.js";



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

function skipComments(cursor) {
  checkInfiniteLoop();
  // return non-comment cursor or first non-comment nextSibling
  //console.log('skipComments: cursor', cursor);
  //console.log(`skipComments: cursor from=${cursor.from} type:`, cursor.type);
  while (
    cursor.type.name == 'Comment' ||
    cursor.type.name == 'CommentBlock'
  ) {
    cursor.nextSibling();
    //console.log(`skipComments: next cursor from=${cursor.from} type:`, cursor.type);
  }
  if (!cursor) throw new NixEvalError('not found next sibling');
  //return cursor; // no. cursor is mutable
}

function nodeText(cursor, source) {
  // source = full source code of the Nix file
  // text = source code of this cursor
  return source.slice(cursor.from, cursor.to);
}

function callThunk(cursor, source) {
  if (!cursor.type.thunk) {
    throw new NixEvalNotImplemented(`thunk is undefined for type ${cursor.type.name}`);
  }
  return cursor.type.thunk(cursor, source);
}

export const thunkOfNodeType = {

  '⚠': (cursor, _source) => {
    checkInfiniteLoop();
    console.log('thunkOfNodeType.Error: cursor', cursor);
    // add context from _source? mostly not needed -> on demand or debounced
    throw new NixSyntaxError(`error at position ${cursor.from}`);
  },

  Nix: (cursor, source) => {
    resetInfiniteLoop();
    //console.log('thunkOfNodeType.Nix: cursor', cursor);
    if (!cursor.firstChild()) {
      // no children
      return;
    }
    skipComments(cursor);
    //const child = cursor;
    if (!cursor) { // TODO?
      console.error(`thunkOfNodeType.Nix: not found child`);
      return;
    }
    return callThunk(cursor, source);
  },

  Add: (cursor, source) => {

    // arithmetic addition or string concat
    // TODO check types

    // nix-repl> 1+""
    // error: cannot add a string to an integer

    // nix-repl> ""+1
    // error: cannot coerce an integer to a string

    checkInfiniteLoop();
    /* FIXME firstChild is wrong. */
    //console.log('thunkOfNodeType.ConcatStrings ------------------------');
    //console.log('thunkOfNodeType.ConcatStrings: cursor', {...cursor});
    if (!cursor.firstChild()) {
      throw new NixEvalError('ConcatStrings: no firstChild')
    }
    skipComments(cursor);
    //console.log(`thunkOfNodeType.ConcatStrings: child1 from=${cursor.from} type:`, cursor.type);
    if (!cursor) { // TODO verify
      console.error(`thunkOfNodeType.ConcatStrings: not found child1`);
      return;
    }

    // eval child1 now
    // otherwise we must bind: const thunk1 = cursor.type.thunk;
    //console.log('thunkOfNodeType.ConcatStrings: arg1 ...');
    const arg1 = callThunk(cursor, source);
    //console.log('thunkOfNodeType.ConcatStrings: arg1', arg1);

    // FIXME
    if (!cursor.nextSibling()) {
      //console.log(`thunkOfNodeType.ConcatStrings: no nextSibling -> go up + right`);
      let counter = 0;
      while (cursor) {
        //console.log(`thunkOfNodeType.ConcatStrings: counter ${counter}`);
        if (counter > 10) {
          throw new Error('counter reached');
        }
        counter++;
        if (cursor.parent()) {
          //console.log(`thunkOfNodeType.ConcatStrings: parent`, cursor);
          if (cursor.nextSibling()) {
            //console.log(`thunkOfNodeType.ConcatStrings: parent + next`, cursor);
            break;
          }
          else {
            throw new Error('fixme no next')
          }
        }
        else {
          throw new Error('fixme no parent')
        }
        /*
        if (cursor.parent() && cursor.nextSibling()) {
          break;
        }
        */
      }
    }
    else {
      //console.log('thunkOfNodeType.ConcatStrings: cursor.nextSibling ok');
    }
    skipComments(cursor);
    //console.log('thunkOfNodeType.ConcatStrings: child2', {...cursor});
    //console.log(`thunkOfNodeType.ConcatStrings: child2 from=${cursor.from} type:`, cursor.type);
    /*
    console.log('thunkOfNodeType.ConcatStrings: child2.type', cursor.type);
    console.log('thunkOfNodeType.ConcatStrings: child2.type.name', cursor.type.name);
    console.log('thunkOfNodeType.ConcatStrings: child2.type.thunk', cursor.type.thunk);
    */
    if (!cursor) {
      console.error(`thunkOfNodeType.ConcatStrings: not found child2`);
      return;
    }

    /*
    console.log('thunkOfNodeType.ConcatStrings: arg1 ...');
    const arg1 = child1.type.thunk(child1, source);
    console.log('thunkOfNodeType.ConcatStrings: arg1', arg1);
    */

    //console.log('thunkOfNodeType.ConcatStrings: arg2 ...');
    const arg2 = callThunk(cursor, source);
    //console.log('thunkOfNodeType.ConcatStrings: arg2', arg2);

    return arg1 + arg2;
  },

  Int: (cursor, source) => {
    //console.log('thunkOfNodeType.Int: cursor', cursor);
    return parseInt(nodeText(cursor, source));
  },

  /* node == this
  Nix: function() {
    console.log('thunkOfNodeType.Nix: this', this);
    // this is NodeType when called as node.type.thunk(node)
    // fix: node.type.thunk.apply(node)
    const child = skipComments(this.firstChild);
    return child.type.thunk.apply(child, []);
  },
  ConcatStrings: function() {
    const child1 = skipComments(this.firstChild);
    const arg1 = child1.type.thunk.apply(child1, []);
    const child2 = skipComments(child1.nextSibling);
    const arg2 = child2.type.thunk.apply(child2, []);
    return arg1 + arg2;
  },
  Int: function() {
    return parseInt(this.text);
  },
  */

  /* TODO
  TRUE: () => true,
  FALSE: () => false,
  NULL: () => null,
  If: function() {
    return this.firstChild.thunk(); // identity
  },
  'If': (node) => (node.thunk = () => (node.firstChild.thunk() ? node.children[1].thunk() : node.children[2].thunk())),
  'Float': (node) => (node.thunk = () => parseFloat(node.text)),
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
  *xx/

  /*
    node ./src/lezer-parser-nix/test/manual-test.js "__add 1 2"

    Nix
      Call "__add 1 2"
        Call "__add 1"
          Primop "__add"
          Int "1"
        Int "2"
  *xx/

  // TODO setThunk.__add: node

  'Call': (node) => {
      //printNode(node, "setThunk.Call");
      /*
      if (node.children.length == 0) {
        console.log(`Call.thunk: no children -> TODO`); console.dir(node);
        return 'TODO';
      }
      *xxxx/
      //return node.firstChild.thunk()( node.children[1].thunk() ); // node.children[1] is undef
      node.thunk = () => {
        //printNode(node, "Call.thunk");
        // FIXME TypeError: node.firstChild.thunk(...) is not a function
        return node.firstChild.thunk()( node.children[1].thunk() );
      };
  },
  // CallAdd is ConcatStrings
  'CallSub': (node) => (node.thunk = () => (node.firstChild.thunk() - node.children[1].thunk())),
  'CallMul': (node) => (node.thunk = () => (node.firstChild.thunk() * node.children[1].thunk())),
  'CallDiv': (node) => (node.thunk = () => (node.firstChild.thunk() / node.children[1].thunk())),
  'OpNot': (node) => (node.thunk = () => (! node.firstChild.thunk())),
  // SubExpr is not used
  // lezer-parser-nix/src/nix.grammar
  // NegativeExpr has higher precedence than SubExpr, so 1-2 -> (1) (-2) -> ApplyExpr
  // nix parser/interpreter: Nix(ApplyExpr(__sub,Int,Int))
  //'SubExpr': (node) => (node.thunk = () => (node.firstChild.thunk() - node.children[2].thunk())),
  //'Sub': null, // '-' // not used? - is parsed as Negative. bug in parser grammar?
  'NegativeExpr': (node) => (node.thunk = () => (- node.children[1].thunk())),
  'CallNeg': (node) => (node.thunk = () => (- node.firstChild.thunk())),
  'Negative': null, // '-'
  // naive apply
  //'ApplyExpr': (node) => (node.thunk = () => node.firstChild.thunk()( node.children[1].thunk() )),
  'ApplyExpr': (node) => (node.thunk = () => {
    if (node.children[1].type == 'NegativeExpr') {
      // exception to implement SubExpr(Int,Int) as ApplyExpr(__sub,Int,Int)
      // or rather: ApplyExpr(__add,Int,NegativeExpr(Int))
      return (node.firstChild.thunk() + node.children[1].thunk());
    }
    else {
      // apply function
      return node.firstChild.thunk()( node.children[1].thunk() );
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
    *xxxxxx/

    //console.log(`AttrSet.thunk: node:`); console.dir(node);
    // TODO cache
    for (const attr of node.children) {
      //console.log(`AttrSet.thunk: attr:`); console.dir(attr);
      const key = attr.firstChild.thunk();
      //console.log(`AttrSet.thunk: key = ${key}`)
      Object.defineProperty(node.data, key, {
        get: attr.children[1].thunk,
        enumerable: true,
      });
    }
    // FIXME handle missing key
    // currently returns undefined
    // should throw:
    // nix-repl> {a=1;}.b
    // error: attribute 'b' missing
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
    return node.firstChild.thunk()[ node.children[1].thunk() ];
  }),

  // TODO
  'Var': (node) => (node.thunk = () => {
    //printNode(node, "Var.thunk");
    return 'TODO';
  }),

  'Parens': (node) => (node.thunk = () => {
    //printNode(node, "Parens.thunk");
    return node.firstChild.thunk();
  }),

  */

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