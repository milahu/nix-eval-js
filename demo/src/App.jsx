import {
  //createSignal,
  //onMount,
  For,
} from "solid-js";

import { createStore } from "solid-js/store";

import styles from './App.module.css';

//import { Tab, TabContainer, Tabs } from "./solid-blocks";
import { SplitRoot, SplitY, SplitX, SplitItem } from './solidjs-resizable-splitter-component'

//import { CodeMirror } from "@solid-codemirror/codemirror";
import { CodeMirror } from "./codemirror.jsx";
import { TreeViewCodeMirror } from './treeview.jsx';

import * as NixEval from "../../src/nix-eval.js";



import { configure as getStringifyEvalResult } from '../../src/nix-eval-stringify/index.js'



const stringifyEvalResult = getStringifyEvalResult({
  maximumDepth: 2,
  maximumBreadth: 10,
  indent: "  ",
})

/*
Nix
  Let
    Attr: f = x: if x > 0 then f (x - 1) else x;
      Identifier: f
      Lambda: x: if x > 0 then f (x - 1) else x ########### x is probably stored here
        Identifier: x
        If: if x > 0 then f (x - 1) else x
          GT: x > 0
            Var: x
              Identifier: x
            Int: 0
          Call: f (x - 1) ########### x should be stored here
            Var: f
              Identifier: f
            Parens: (x - 1)
              Sub: x - 1
                Var: x ################### FIXME EvalError undefined variable 'x'
                  Identifier: x
                Int: 1
          Var: x
            Identifier: x
    Call: f 1
      Var: f
        Identifier: f
      Int: 1
*/
const exampleInputs = [

  '(x: x) 1 # call lambda',
  '(x: y: x + y) 1 2 # call lambda nested',
  'let f=x: 2*x; in f 3 # let lambda call',
  'let f = a: b: (a+b); in f 1 2 # let lambda call nested',

  // fibonacci based on https://medium.com/@MrJamesFisher/nix-by-example-a0063a1a4c55
  `# Fibonacci
let
  f = i: n: m:
    if i == 0 then n
    else f (i - 1) m (n + m);
  fib = n: f n 1 1;
in
fib 1 # == 1`,

  `# Fibonacci function, with parens
let
  # fibInner : int -> int -> int -> int
  fibInner = i: (n: (m:
    if i == 0 then n
    else fibInner (i - 1) m (n + m)));
  # fib : int -> int 
  fib = n: (fibInner n 1 1);
in
fib 1 # == 1
# FIXME EvalError undefined variable 'i'`,

/*

Nix:0: # Fibonacci function, with parens
  Comment:0: # Fibonacci function, with parens
  Let:34: let
    Comment:40: # fibInner : int -> int -> int -> int
    Attr:80: fibInner = i: (n: (m:
      Identifier:80: fibInner
      Lambda:91: i: (n: (m:
        Identifier:91: i
        Parens:94: (n: (m:
          Lambda:95: n: (m:
            Identifier:95: n
            Parens:98: (m:
              Lambda:99: m:
                Identifier:99: m
                If:106: if i == 0 then n
                  Eq:109: i == 0
                    Var:109: i
                      Identifier:109: i
                    Int:114: 0
                  Var:121: n
                    Identifier:121: n
                  Call:132: fibInner (i - 1) m (n + m)
                    Call:132: fibInner (i - 1) m
                      Call:132: fibInner (i - 1)
                        Var:132: fibInner
                          Identifier:132: fibInner
                        Parens:141: (i - 1)
                          Sub:142: i - 1
                            Var:142: i
                              Identifier:142: i
                            Int:146: 1
                      Var:149: m
                        Identifier:149: m
                    Parens:151: (n + m)
                      Add:152: n + m
                        Var:152: n
                          Identifier:152: n
                        Var:156: m
                          Identifier:156: m
    Comment:164: # fib : int -> int 
    Attr:186: fib = n: (fibInner n 1 1);
      Identifier:186: fib
      Lambda:192: n: (fibInner n 1 1)
        Identifier:192: n
        Parens:195: (fibInner n 1 1)
          Call:196: fibInner n 1 1
            Call:196: fibInner n 1
              Call:196: fibInner n
                Var:196: fibInner
                  Identifier:196: fibInner
                Var:205: n
                  Identifier:205: n
              Int:207: 1
            Int:209: 1
    Call:216: fib 5
      Var:216: fib
        Identifier:216: fib
      Int:220: 5



thunkOfNodeType.Var getting variable fib: find scope: node Var:216
thunkOfNodeType.Var getting variable fib: find scope: parent Call:216
thunkOfNodeType.Var getting variable fib: find scope: parent Let:34
thunkOfNodeType.Var getting variable fib: find scope: done

thunkOfNodeType.Lambda: setting variable n on dataNode Lambda:192 for bodyNode Parens:195

thunkOfNodeType.Var getting variable fibInner: find scope: node Var:196
thunkOfNodeType.Var getting variable fibInner: find scope: parent Call:196
thunkOfNodeType.Var getting variable fibInner: find scope: parent Parens:195
thunkOfNodeType.Var getting variable fibInner: find scope: parent Lambda:192
thunkOfNodeType.Var getting variable fibInner: find scope: parent Attr:186
thunkOfNodeType.Var getting variable fibInner: find scope: parent Let:34
thunkOfNodeType.Var getting variable fibInner: find scope: done

thunkOfNodeType.Var getting variable n: find scope: node Var:205
thunkOfNodeType.Var getting variable n: find scope: parent Call:196
thunkOfNodeType.Var getting variable n: find scope: parent Parens:195
thunkOfNodeType.Var getting variable n: find scope: parent Lambda:192
thunkOfNodeType.Var getting variable n: find scope: done

thunkOfNodeType.Lambda: setting variable i on dataNode Lambda:91 for bodyNode Parens:94
thunkOfNodeType.Lambda: setting variable n on dataNode Lambda:95 for bodyNode Parens:98
thunkOfNodeType.Lambda: setting variable m on dataNode Lambda:99 for bodyNode If:106

thunkOfNodeType.Var getting variable i: find scope: node Var:109
thunkOfNodeType.Var getting variable i: find scope: parent Eq:109
thunkOfNodeType.Var getting variable i: find scope: parent If:106
thunkOfNodeType.Var getting variable i: find scope: parent Lambda:99
thunkOfNodeType.Var getting variable i: find scope: parent Parens:98
thunkOfNodeType.Var getting variable i: find scope: parent Lambda:95
thunkOfNodeType.Var getting variable i: find scope: parent Parens:94
thunkOfNodeType.Var getting variable i: find scope: parent Lambda:91
thunkOfNodeType.Var getting variable i: find scope: done

thunkOfNodeType.Var getting variable fibInner: find scope: node Var:132
thunkOfNodeType.Var getting variable fibInner: find scope: parent Call:132
thunkOfNodeType.Var getting variable fibInner: find scope: parent If:106
thunkOfNodeType.Var getting variable fibInner: find scope: parent Lambda:99
thunkOfNodeType.Var getting variable fibInner: find scope: parent Parens:98
thunkOfNodeType.Var getting variable fibInner: find scope: parent Lambda:95
thunkOfNodeType.Var getting variable fibInner: find scope: parent Parens:94
thunkOfNodeType.Var getting variable fibInner: find scope: parent Lambda:91
thunkOfNodeType.Var getting variable fibInner: find scope: parent Attr:80
thunkOfNodeType.Var getting variable fibInner: find scope: parent Let:34
thunkOfNodeType.Var getting variable fibInner: find scope: done

FIXME missing: "setting variable i"
    at thunkOfNodeType.Call [as thunk] (nix-thunks-lezer-parser.js?t=1664121718086:421:25)

thunkOfNodeType.Var getting variable i: find scope: node Var:142
thunkOfNodeType.Var getting variable i: find scope: parent Sub:142
thunkOfNodeType.Var getting variable i: find scope: parent Parens:141
thunkOfNodeType.Var getting variable i: find scope: parent Call:132
thunkOfNodeType.Var getting variable i: find scope: parent If:106
thunkOfNodeType.Var getting variable i: find scope: parent Lambda:99
thunkOfNodeType.Var getting variable i: find scope: parent Parens:98
thunkOfNodeType.Var getting variable i: find scope: parent Lambda:95
thunkOfNodeType.Var getting variable i: find scope: parent Parens:94
thunkOfNodeType.Var getting variable i: find scope: parent Lambda:91
thunkOfNodeType.Var getting variable i: find scope: parent Attr:80
thunkOfNodeType.Var getting variable i: find scope: parent Let:34
thunkOfNodeType.Var getting variable i: find scope: parent Nix:0

thunkOfNodeTypethunkOfNodeType.Var i: find scope: not found

App.jsx:180 EvalError: undefined variable 'i'
    at thunkOfNodeType.Var [as thunk] (nix-thunks-lezer-parser.js?t=1664121718086:882:9)

    at callThunk (nix-thunks-lezer-parser.js?t=1664121718086:90:20)
      return node.type.thunk(node, source);

    at get2Values (nix-thunks-lezer-parser.js?t=1664121718086:315:14)
    at get2Numbers (nix-thunks-lezer-parser.js?t=1664121718086:281:26)
    at thunkOfNodeType.Sub [as thunk] (nix-thunks-lezer-parser.js?t=1664121718086:346:28)

    at callThunk (nix-thunks-lezer-parser.js?t=1664121718086:90:20)
      return node.type.thunk(node, source);

    at thunkOfNodeType.Parens [as thunk] (nix-thunks-lezer-parser.js?t=1664121718086:151:10)
      return callThunk(childNode, source);

    at callThunk (nix-thunks-lezer-parser.js?t=1664121718086:90:20)
      return node.type.thunk(node, source);

    at thunkOfNodeType.Call [as thunk] (nix-thunks-lezer-parser.js?t=1664121718086:421:25)
      const argumentValue = callThunk(argumentNode, source);

    at callThunk (nix-thunks-lezer-parser.js?t=1664121718086:90:20)
      const argumentValue = callThunk(argumentNode, source);

thunkOfNodeType.Var getting variable fib: find scope: node Var:216
thunkOfNodeType.Var getting variable fib: find scope: parent Call:216
thunkOfNodeType.Var getting variable fib: find scope: parent Let:34
thunkOfNodeType.Var getting variable fib: find scope: done

thunkOfNodeType.Lambda: setting variable n on dataNode Lambda:192 for bodyNode Parens:195

thunkOfNodeType.Var getting variable fibInner: find scope: node Var:196
thunkOfNodeType.Var getting variable fibInner: find scope: parent Call:196
thunkOfNodeType.Var getting variable fibInner: find scope: parent Parens:195
thunkOfNodeType.Var getting variable fibInner: find scope: parent Lambda:192
thunkOfNodeType.Var getting variable fibInner: find scope: parent Attr:186
thunkOfNodeType.Var getting variable fibInner: find scope: parent Let:34
thunkOfNodeType.Var getting variable fibInner: find scope: done

thunkOfNodeType.Var getting variable n: find scope: node Var:205
thunkOfNodeType.Var getting variable n: find scope: parent Call:196
thunkOfNodeType.Var getting variable n: find scope: parent Parens:195
thunkOfNodeType.Var getting variable n: find scope: parent Lambda:192
thunkOfNodeType.Var getting variable n: find scope: done

thunkOfNodeType.Lambda: setting variable i on dataNode Lambda:91 for bodyNode Parens:94
thunkOfNodeType.Lambda: setting variable n on dataNode Lambda:95 for bodyNode Parens:98
thunkOfNodeType.Lambda: setting variable m on dataNode Lambda:99 for bodyNode If:106

thunkOfNodeType.Var getting variable i: find scope: node Var:109
thunkOfNodeType.Var getting variable i: find scope: parent Eq:109
thunkOfNodeType.Var getting variable i: find scope: parent If:106
thunkOfNodeType.Var getting variable i: find scope: parent Lambda:99
thunkOfNodeType.Var getting variable i: find scope: parent Parens:98
thunkOfNodeType.Var getting variable i: find scope: parent Lambda:95
thunkOfNodeType.Var getting variable i: find scope: parent Parens:94
thunkOfNodeType.Var getting variable i: find scope: parent Lambda:91
thunkOfNodeType.Var getting variable i: find scope: done

thunkOfNodeType.Var getting variable fibInner: find scope: node Var:132
thunkOfNodeType.Var getting variable fibInner: find scope: parent Call:132
thunkOfNodeType.Var getting variable fibInner: find scope: parent If:106
thunkOfNodeType.Var getting variable fibInner: find scope: parent Lambda:99
thunkOfNodeType.Var getting variable fibInner: find scope: parent Parens:98
thunkOfNodeType.Var getting variable fibInner: find scope: parent Lambda:95
thunkOfNodeType.Var getting variable fibInner: find scope: parent Parens:94
thunkOfNodeType.Var getting variable fibInner: find scope: parent Lambda:91
thunkOfNodeType.Var getting variable fibInner: find scope: parent Attr:80
thunkOfNodeType.Var getting variable fibInner: find scope: parent Let:34
thunkOfNodeType.Var getting variable fibInner: find scope: done

thunkOfNodeType.Var getting variable i: find scope: node Var:142
thunkOfNodeType.Var getting variable i: find scope: parent Sub:142
thunkOfNodeType.Var getting variable i: find scope: parent Parens:141
thunkOfNodeType.Var getting variable i: find scope: parent Call:132
thunkOfNodeType.Var getting variable i: find scope: parent If:106
thunkOfNodeType.Var getting variable i: find scope: parent Lambda:99
thunkOfNodeType.Var getting variable i: find scope: parent Parens:98
thunkOfNodeType.Var getting variable i: find scope: parent Lambda:95
thunkOfNodeType.Var getting variable i: find scope: parent Parens:94
thunkOfNodeType.Var getting variable i: find scope: parent Lambda:91
thunkOfNodeType.Var getting variable i: find scope: parent Attr:80
thunkOfNodeType.Var getting variable i: find scope: parent Let:34
thunkOfNodeType.Var getting variable i: find scope: parent Nix:0

thunkOfNodeTypethunkOfNodeType.Var i: find scope: not found

App.jsx:180 EvalError: undefined variable 'i'
    at thunkOfNodeType.Var [as thunk] (nix-thunks-lezer-parser.js?t=1664121718086:882:9)
    at callThunk (nix-thunks-lezer-parser.js?t=1664121718086:90:20)
    at get2Values (nix-thunks-lezer-parser.js?t=1664121718086:315:14)
    at get2Numbers (nix-thunks-lezer-parser.js?t=1664121718086:281:26)
    at thunkOfNodeType.Sub [as thunk] (nix-thunks-lezer-parser.js?t=1664121718086:346:28)
    at callThunk (nix-thunks-lezer-parser.js?t=1664121718086:90:20)
    at thunkOfNodeType.Parens [as thunk] (nix-thunks-lezer-parser.js?t=1664121718086:151:10)
    at callThunk (nix-thunks-lezer-parser.js?t=1664121718086:90:20)
    at thunkOfNodeType.Call [as thunk] (nix-thunks-lezer-parser.js?t=1664121718086:421:25)
    at callThunk (nix-thunks-lezer-parser.js?t=1664121718086:90:20)

*/

  `let f = x: y: z: x; in f 1 2 3 # multi arg
# FIXME undefined variable 'x'`,

  `let f = x: y: x; in f 1 2 # multi arg
# FIXME undefined variable 'x'`,

  `# recursive call
let
f = x: if x > 0 then f (x - 1) else x;
in
f 1
`,
  `# call 2 functions nested
let
  f = x: y: (g 1 x) + y;
  g = x: y: x + y;
in
f 1 1
`,
  `# call 2 functions
let
  f1 = x: x + 1;
  f2 = x: x + 2;
in
f2 (f1 1)
`,
  '1 # int',
  '1+1+1 # add',
  '1+1.0 # int + float',
  '0.1+0.2 # float precision',
  '0.123456789 # float precision',
  '2+3*4 # mul',
  '(2+3)*4 # parens',
  '1.0/ 2 # div',
  '1.0/2 # path',
  '1.0 /2 # call',
  '[1 2 3] # list',
  '__typeOf null # call',
  '__typeOf 1 # call',
  '__typeOf 1.0 # call',
  '__head [1 2 3] # call',
  '__tail [1 2 3] # call',
  '__elemAt [1 2 3] 1 # nested call',
  '{a=1;b=2;} # set',
  '{a=1;b=2;}.a # select',
  '{a=1;b=2;}.z # select missing attribute',
  '{a={b=2;};}.a.b # nested select',
  'rec {a=1;b=a;}.b # rec set',
  'let a=1; in a # let',
  'let a={b=2;}; in a.b # nested let',
  'x: x # lambda',
  '(x: x) 1 # call lambda',
  '(x: y: x + y) 1 2 # call lambda nested',
  'if (!true) then 1 else 2 # if',
  '1 == 1 # equal',
  '1 != 2 # not equal',
  'let f=x: 2*x; in f 3 # let lambda call',
  'let f = a: b: (a+b); in f 1 2 # let lambda call nested',
];



export default function App() {

  const [store, setStore] = createStore({
    editorText: exampleInputs[0],
    editorState: undefined,
    evalResult: undefined,
    evalError: undefined,
  });

  function onEditorState(editorState) {
    setStore('editorState', editorState); // set store.editorState

    if (!editorState.tree || editorState.tree.length == 0) {
      console.log(`onEditorState: tree is empty`);
      setStore('evalResult', undefined); // set store.evalResult
      return;
    }

    // eval
    //console.log(`App: eval. stack:`, new Error().stack)
    const source = editorState.doc.sliceString(0, editorState.doc.length);
    let evalResult;
    let evalError = '';
    try {
      // call the Nix thunk
      //evalResult = editorState.tree.topNode.type.thunk(editorState.tree.topNode, source);

      const evalState = new NixEval.State({
        source,
      })

      const evalEnv = new NixEval.Env(null, {
        test: 'hello world',
      })

      const topNode = editorState.tree.topNode;

      evalResult = topNode.type.thunk(topNode, evalState, evalEnv);
    }
    catch (error) {
      if (error instanceof NixEval.NixSyntaxError || error instanceof NixEval.NixEvalError) {
        console.warn(error);
        evalError = (
          <div class="eval-error">
            <span color="red">{error.name}</span> {error.message}
          </div>
        );
      }
      else {
        console.error(error);
        evalError = (
          <div class="eval-error">
            <span color="red">FIXME</span> unhandled error: {error.name} {error.message}
          </div>
        );
      }
    }
    console.log(`App: eval. result:`, evalResult)
    //setStore('evalResult', evalResult); // set store.evalResult
    // hide evalResult in thunk, so solid does not call Nix Lambda
    setStore('evalResult', () => evalResult); // set store.evalResult
    setStore('evalError', evalError); // set store.evalError
  }

  const getCodeMirror = () => (
    <CodeMirror
      value={store.editorText}
      mode="nix"
      onEditorStateChange={onEditorState}
      onEditorMount={(view) => {
        // workaround for solidjs
        //onEditorState(view.state);
        setTimeout(() => {
          onEditorState(view.state);
        }, 0);
      }}
    />
  )

  return (
    <div class={styles.App}>
      <SplitRoot>
        <SplitX>
          <SplitItem size="50%">
            <Switch>
              <Match when={store.editorState}>
                <TreeViewCodeMirror editorState={store.editorState} />
              </Match>
              <Match when={true}>
                <div>editorState is empty</div>
              </Match>
            </Switch>
          </SplitItem>
          <SplitY>
            <SplitItem>
              {getCodeMirror()}
              <div>Result:</div>
              <div class="eval-result">{
                //JSON.stringify(store.evalResult, null, 1)
                stringifyEvalResult(store.evalResult)
              }</div>
              {store.evalError}
            </SplitItem>
            <SplitItem>
              <div>Example inputs:</div>
              <ul>
                <For each={exampleInputs}>{input => (
                  <li class={styles.clickable} onclick={() => {
                    //console.log(`click example input: ${input}`);
                    setStore('editorText', input);
                  }}>{input}</li>
                )}</For>
              </ul>
            </SplitItem>
          </SplitY>
        </SplitX>
      </SplitRoot>
    </div>
  );
}
