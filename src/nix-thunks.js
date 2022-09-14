import { NixPrimOps } from "./nix-primops.js"



export function printNode(node, label = '') {
  let extraDepth = 0;
  if (label) {
    console.log(label);
    extraDepth = 1; // indent the node
  }
  // note: this will print a trailing newline
  console.log(node.toString(0, 5, "  ", extraDepth));
}



export const setThunkOfNodeType = {
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
  // CallAdd is ConcatStrings
  'CallSub': (node) => (node.thunk = () => (node.children[0].thunk() - node.children[1].thunk())),
  'CallMul': (node) => (node.thunk = () => (node.children[0].thunk() * node.children[1].thunk())),
  'CallDiv': (node) => (node.thunk = () => (node.children[0].thunk() / node.children[1].thunk())),
  'OpNot': (node) => (node.thunk = () => (! node.children[0].thunk())),
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
    return node.children[0].thunk()[ node.children[1].thunk() ];
  }),

  // TODO
  'Var': (node) => (node.thunk = () => {
    //printNode(node, "Var.thunk");
    return 'TODO';
  }),

  'Parens': (node) => (node.thunk = () => {
    //printNode(node, "Parens.thunk");
    return node.children[0].thunk();
  }),

};



// derived from other types

setThunkOfNodeType.Let = (node) => (node.thunk = () => {
  // syntax sugar:   let a=1; in a   ->   (rec{a=1;}).a
  // TODO refactor setThunkOfNodeType to class
  //printNode(node, "Let.thunk");
  return 'TODO';
});
