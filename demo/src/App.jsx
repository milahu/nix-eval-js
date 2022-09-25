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

import { NixEvalError, NixSyntaxError } from "../../src/nix-eval.js";
import { configure as getStringifyEvalResult } from '../../src/nix-eval-stringify/index.js'



const stringifyEvalResult = getStringifyEvalResult({
  maximumDepth: 2,
  maximumBreadth: 10,
  indent: "  ",
})



const exampleInputs = [
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
  'let f=x: 2*x; in f 3 # let lambda call',
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
    const source = editorState.doc.sliceString(0, editorState.doc.length);
    let evalResult;
    let evalError = '';
    try {
      evalResult = editorState.tree.topNode.type.thunk(editorState.tree.topNode, source);
    }
    catch (error) {
      if (error instanceof NixSyntaxError || error instanceof NixEvalError) {
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
    //console.log('evalResult', evalResult);
    setStore('evalResult', evalResult); // set store.evalResult
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
