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
  'rec {a=1;b=a;}.b # rec set',

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

  '1 == 1 # equal',
  '1 != 2 # not equal',
  'if (!true) then 1 else 2 # if',

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

  'let f=x: 2*x; in f 3 # let lambda call',
  'let f = a: b: (a+b); in f 1 2 # let lambda call nested',

  `let f = x: y: z: x; in f 1 2 3 # lambda multi arg`,

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

  // fibonacci based on https://medium.com/@MrJamesFisher/nix-by-example-a0063a1a4c55
  `# Fibonacci
let f = i: n: m: if i == 0 then n
    else f (i - 1) m (n + m);
  fib = n: f n 1 1;
in fib 7 # == 21`,

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
      setStore('evalResultString', ''); // set store.evalResultString
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
    // set store.evalResultString
    try {
      setStore('evalResultString', stringifyEvalResult(evalResult))
    }
    catch (error) {
      setStore('evalResultString', `FIXME error in stringifyEvalResult: ${error.name} ${error.message}`)
    }
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
                //stringifyEvalResult(store.evalResult)
                store.evalResultString
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
