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

import { formatErrorContext } from '../../src/lezer-parser-nix/src/format-error-context.js'

// https://codemirror.net/examples/autocompletion/#completing-from-syntax
import {syntaxTree} from "@codemirror/language"



import { configure as getStringifyEvalResult } from '../../src/nix-eval-stringify/index.js'



const stringifyEvalResult = getStringifyEvalResult({
  maximumDepth: 10,
  maximumBreadth: 100,
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

  `# autocomplete
let pkgs = {
  hello = "echo hello";
  a.b.c = "hello nested";
}; in pkgs
#         ^ write a dot
# and maybe press Ctrl+Space
# press Enter to accept a suggestion`,

  '1 # int',
  '1+1+1 # add',
  '1+1.0 # int + float',
  '0.1+0.2 # float precision',
  '0.123456789 # float precision',

  '2+3*4 # mul',
  '(2+3)*4 # parens',
  '1.0/ 2 # div',
  '1.0/2 # path',
  '1.0 /2 # call: type error',

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
  '{a=1;b=2;}.z # select: key error',
  '{a={b=2;};}.a.b # nested select',
  'rec {a=1;b=a;}.b # rec set',

  'let a=1; in a # let',
  'let a={b=2;}; in a.b # nested let',

  'x: x # lambda',
  '(x: x) 1 # call lambda',
  '(x: y: x + y) 1 2 # call lambda nested',

  '({x}: x) {x=1;} # lambda formals',
  '({...}@args: args.x) {x=1;} # lambda formals binding',

  'let f=x: 2*x; in f 3 # let lambda call',
  'let f = a: b: (a+b); in f 1 2 # let lambda call nested',

  `let f = x: y: z: x; in f 1 2 3 # lambda multi arg`,

  `# recursive call
let f = x: if x > 0 then f (x - 1) else x;
in f 1`,
  `# call 2 functions nested
let f = x: y: (g 1 x) + y;
  g = x: y: x + y;
in f 1 1`,
  `# call 2 functions
let f1 = x: x + 1;
  f2 = x: x + 2;
in f2 (f1 1)
`,

  // fibonacci based on https://medium.com/@MrJamesFisher/nix-by-example-a0063a1a4c55
  `# Fibonacci 9
let f = i: n: m: if i == 0 then n
    else f (i - 1) m (n + m);
  fib = n: f n 1 1;
in fib 9`,

  `# Fibonacci 99: bigint vs integer overflow
let f = i: n: m: if i == 0 then n
    else f (i - 1) m (n + m);
  fib = n: f n 1 1;
in fib 99
# original Nix interpreter shows different result:
# 3736710778780434371`,

  `# Fibonacci 999: bigint vs integer overflow
let f = i: n: m: if i == 0 then n
    else f (i - 1) m (n + m);
  fib = n: f n 1 1;
in fib 999
# original Nix interpreter shows different result:
# 817770325994397771`,

  `# Fibonacci 9999: Maximum call stack size exceeded
let f = i: n: m: if i == 0 then n
    else f (i - 1) m (n + m);
  fib = n: f n 1 1;
in fib 9999`,

];



export default function App() {

  const [store, setStore] = createStore({

    editorText: exampleInputs[0],
    editorState: undefined,

    // note: cannot use null for evalResult,
    // because null is a valid value
    evalResult: undefined,
    lastEvalResult: undefined,

    evalError: undefined,

    evalEnv: undefined,
    lastEvalEnv: undefined,

    evalState: undefined,
    lastEvalState: undefined,
  });

  let lastEvalTime = 0;

  function onEditorState(editorState) {
    setStore('lastEditorState', store.editorState); // set store.lastEditorState
    setStore('editorState', editorState); // set store.editorState

    if (!editorState.tree || editorState.tree.length == 0) {
      console.log(`App.onEditorState: tree is empty`);
      setStore('evalResult', undefined); // set store.evalResult
      setStore('evalResultString', ''); // set store.evalResultString
      return;
    }

    // eval
    const debugEval = true

    //console.log(`App: eval. stack:`, new Error().stack)
    const source = editorState.doc.sliceString(0, editorState.doc.length);
    let evalState;
    let evalEnv;
    let evalResult;
    let evalError = '';
    try {
      // call the Nix thunk
      //evalResult = editorState.tree.topNode.type.thunk(editorState.tree.topNode, source);

      evalState = new NixEval.State({
        source,
      })

      evalEnv = new NixEval.Env();
      evalEnv.data = {
        test: 'hello world',
      };

      debugEval && console.log(`eval source`, evalState.source)

      const topNode = editorState.tree.topNode;

      evalResult = topNode.type.eval(topNode, evalState, evalEnv);
    }
    catch (error) {
      if (error instanceof NixEval.NixSyntaxError || error instanceof NixEval.NixEvalError) {
        console.warn(error);

        if (error instanceof NixEval.NixSyntaxError) {
          // pretty syntax error
          const pos = parseInt(error.message.match(/error at position ([0-9]+)/)[1]);
          const contextLines = 5;
          console.log(formatErrorContext(evalState.source, pos, contextLines))
        }

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
    debugEval && console.log(`App: eval. result:`, evalResult)
    //setStore('evalResult', evalResult); // set store.evalResult
    // hide evalResult in thunk, so solid does not call Nix Lambda
    setStore('lastEvalResult', store.evalResult); // set store.lastEvalResult
    setStore('evalResult', () => evalResult); // set store.evalResult

    setStore('lastEvalEnv', store.evalEnv); // set store.lastEvalEnv
    setStore('evalEnv', evalEnv); // set store.evalEnv

    setStore('lastEvalState', store.evalState); // set store.lastEvalState
    setStore('evalState', evalState); // set store.evalEnv

    // set store.evalResultString
    try {
      setStore('evalResultString', stringifyEvalResult(evalResult))
    }
    catch (error) {
      setStore('evalResultString', `FIXME error in stringifyEvalResult: ${error.name} ${error.message}`)
    }
    setStore('evalError', evalError); // set store.evalError
  }

  const completePropertyAfter = ["PropertyName", ".", "?."]
  const dontCompleteIn = ["TemplateString", "LineComment", "BlockComment",
                          "VariableDefinition", "PropertyDefinition"]

  function completeProperties(from, object) {
    let options = []
    for (let name in object) {
      options.push({
        label: name,
        type: typeof object[name] == "function" ? "function" : "variable"
      })
    }
    return {
      from,
      options,
      validFor: /^[\w$]*$/
    }
  }

  /** @typedef {import("@codemirror/autocomplete").CompletionContext} CompletionContext */

  /** @type {function(CompletionContext)} */
  // https://codemirror.net/examples/autocompletion/#completing-from-syntax
  function onAutoComplete(context) {

    const debugAutoComplete = false

    if (debugAutoComplete) {
      console.log(`onAutoComplete: context.pos`, context.pos)
      console.log(`onAutoComplete: store.lastEditorState.tree`, store.lastEditorState.tree)
      console.log(`onAutoComplete: syntaxTree(store.lastEditorState)`, syntaxTree(store.lastEditorState))

      // node is not found. returns the root node, from == 0
      // because pos is too large? -> try to decrease pos
      console.log(`onAutoComplete: store.lastEditorState.tree.resolveInner(context.pos, -1)`, store.lastEditorState.tree.resolveInner(context.pos, -1))
    }

    // node is in different tree -> no pointer equality to lastNode
    let nodeBefore = syntaxTree(context.state).resolveInner(context.pos, -1)

    let lastPos;
    let lastNodeBefore;
    for (lastPos = context.pos; lastPos > 0; lastPos--) {
      //console.log(`onAutoComplete: lastPos`, lastPos)
      lastNodeBefore = store.lastEditorState.tree.resolveInner(lastPos, -1);
      debugAutoComplete && console.log(`onAutoComplete: lastPos ${lastPos}: lastNodeBefore ${lastNodeBefore?.type.name}:${lastNodeBefore?.from}`);
      if (lastNodeBefore.from > 0) {
        debugAutoComplete && console.log(`onAutoComplete: lastPos ${lastPos}: found lastNodeBefore ${lastNodeBefore?.type.name}:${lastNodeBefore?.from}`);
        break;
      }
      // WONTFIX? storing envs in syntaxNode does not work
      //if (lastNodeBefore.envs) {
      //  console.log(`onAutoComplete: lastNodeBefore.envs`, lastNodeBefore.envs);
      //  break;
      //}
    }
    if (lastNodeBefore.from == 0) {
      console.warn(`onAutoComplete: not found lastNodeBefore`);
      return null;
    }
    //console.log(`onAutoComplete: store.lastEvalEnv`, store.lastEvalEnv)

    /*
    console.log(`onAutoComplete: context.pos`, context.pos)

    console.log(`onAutoComplete: store.lastEditorState`, store.lastEditorState)
    console.log(`onAutoComplete: store.lastEditorState.tree`, store.lastEditorState.tree)
    //let lastNodeBefore = syntaxTree(store.lastEditorState).resolveInner(context.pos, -1)
    let lastNodeBefore = store.lastEditorState.tree.resolveInner(context.pos, -1)

    console.log(`onAutoComplete: nodeBefore.name`, nodeBefore.name)
    console.log(`onAutoComplete: nodeBefore.parent?.name`, nodeBefore.parent?.name)

    console.log(`onAutoComplete: lastNodeBefore.name`, lastNodeBefore.name)
    console.log(`onAutoComplete: lastNodeBefore.parent?.name`, lastNodeBefore.parent?.name)
    */

    /*
    console.log(`onAutoComplete: store.evalResult`, store.evalResult)
    console.log(`onAutoComplete: store.lastEvalResult`, store.lastEvalResult)

    console.log(`onAutoComplete: store.evalEnv`, store.evalEnv)
    console.log(`onAutoComplete: store.lastEvalEnv`, store.lastEvalEnv)

    console.log(`onAutoComplete: store.evalState`, store.evalState)
    console.log(`onAutoComplete: store.lastEvalState`, store.lastEvalState)
    */

    let evalResult = store.evalResult;
    let evalEnv = store.evalEnv;
    let evalState = store.evalState;

    if (store.evalResult === undefined) {
      // syntax error
      // use last eval
      debugAutoComplete && console.log(`onAutoComplete: syntax error -> use last eval`)
      if (store.lastEvalResult === undefined) {
        // no last eval
        console.warn(`onAutoComplete error: no last eval`)
        return null;
      }
      evalResult = store.lastEvalResult;
      evalEnv = store.lastEvalEnv;
      evalState = store.lastEvalState;
    }

    if (debugAutoComplete) {
      console.log(`onAutoComplete: lastNodeBefore ${lastNodeBefore.name}:${lastNodeBefore.from}`)
      console.log(`onAutoComplete: lastNodeBefore.parent ${lastNodeBefore.parent.name}:${lastNodeBefore.parent.from}`)
      console.log(`onAutoComplete: lastNodeBefore.parent.parent ${lastNodeBefore.parent.parent.name}:${lastNodeBefore.parent.parent.from}`)

      console.log(`onAutoComplete: nodeBefore ${nodeBefore.name}:${nodeBefore.from}`)
      console.log(`onAutoComplete: nodeBefore.parent ${nodeBefore.parent.name}:${nodeBefore.parent.from}`)
      console.log(`onAutoComplete: nodeBefore.parent.parent ${nodeBefore.parent.parent.name}:${nodeBefore.parent.parent.from}`)
    }

    // TODO same node position: nodeBefore vs lastNodeBefore
    // onAutoComplete: lastNodeBefore Identifier:95
    // onAutoComplete: lastNodeBefore.parent Var:95
    // onAutoComplete: nodeBefore Select:95

    // TODO try to eval Select
    // if keys (attrpath) are missing, then we complete the first key
    // example: pkgs.
    // -> lookup "pkgs" in the nearest envs

    if (nodeBefore.name == "Select") {
      const selectNode = nodeBefore;
      // find nearest env
      // find parent node with env: Let, RecSet, Call
      const envNodeList = [];
      // TODO nodeBefore or lastNodeBefore?
      for (let parentNode = nodeBefore; parentNode != null; parentNode = parentNode.parent) {
      //for (let parentNode = lastNodeBefore; parentNode != null; parentNode = parentNode.parent) {
        if (["Let", "RecSet", "Call"].includes(parentNode.type.name)) {
          envNodeList.push(parentNode);
        }
      }
      if (envNodeList.length == 0) {
        console.warn(`onAutoComplete: envNodeList is empty`)
        return null;
      }
      debugAutoComplete && console.log(`onAutoComplete: envNodeList`, envNodeList)

      /*
      // get envs for each node in envNodeList
      // TODO lookup by position
      const envsOfNode = new Map();
      for (const node of envNodeList) {
        const envList = [];
        envsOfNode.set(node, envList);
      }

      function setEnvOfNode(env) {
        // FAIL no pointer equality. different trees?
        // TODO lookup by position
        if (envsOfNode.has(env.node)) {
          envsOfNode.get(env.node).push(env);
        }
        for (const childEnv of env.children) {
          setEnvOfNode(childEnv);
        }
      }
      setEnvOfNode(evalEnv);
      */

      // get envs for each node in envNodeList
      // TODO lookup by position
      const envsOfPosition = [];
      for (const node of envNodeList) {
        const envList = [];
        const pos = node.from;
        envsOfPosition[pos] = envList;
      }

      function setEnvOfNode(env) {
        // FAIL no pointer equality. different trees?
        // TODO lookup by position
        const pos = (env.node?.from || 0); // node is null in env==evalEnv
        if (pos in envsOfPosition) {
          envsOfPosition[pos].push(env);
        }
        for (const childEnv of env.children) {
          setEnvOfNode(childEnv);
        }
      }
      setEnvOfNode(evalEnv);

      const complete = {
        from: context.pos,
        options: [
          //{ label: "a", type: "variable" },
          //{ label: "b", type: "variable" },
        ],
        //validFor: /^[\w$]*$/,
        validFor: /.*/,
      }

      for (const node of envNodeList) {
        //const envList = envsOfNode.get(node);
        const envList = envsOfPosition[node.from];
        for (const env of envList) {
          /*
          if (node === null) {
            console.log(`RootNode:0: ${stringifyEvalResult(env.data)}`);
            console.log(`RootNode:0: env.get pkgs: ${stringifyEvalResult(env.get('pkgs'))}`);
          }
          else {
            console.log(`${node.type.name}:${node.from}: ${stringifyEvalResult(env.data)}`);
            console.log(`${node.type.name}:${node.from}: env.get pkgs: ${stringifyEvalResult(env.get('pkgs'))}`);
          }
          */
          // TODO also get keys from parent envs
          // env.get is recursive
          // FIXME this should return ["hello", "test"], not ["pkgs"]
          /*
          for (const key of Object.keys(env.data)) {
            complete.options.push({
              label: key,
              type: "variable",
            });
          }
          */
          // eval Select
          // no. calling the normal thunk throws syntax error
          //const selectValue = NixEval.callThunk(selectNode, evalState, env);
          //console.log(`onAutoComplete: selectValue`, selectValue)
          const setNode = NixEval.firstChild(selectNode);
          NixEval.printNode(setNode, evalState, env, {label: 'onAutoComplete: select setNode'});
          let resultValue = NixEval.callThunk(setNode, evalState, env);
          if (!setNode || setNode.type.name == '⚠') return null; // TODO return env?
          let keyNode = NixEval.nextSibling(setNode);
          while (keyNode && keyNode.type.name != '⚠') {
            NixEval.printNode(keyNode, evalState, env, {label: 'onAutoComplete: select keyNode'});
            const key = NixEval.callThunk(keyNode, evalState, env);
            debugAutoComplete && console.log(`onAutoComplete: select key`, key)
            resultValue = resultValue.data[key];
            keyNode = NixEval.nextSibling(keyNode);
          }
          debugAutoComplete && console.log(`onAutoComplete: select resultValue`, resultValue)
          for (const key of Object.keys(resultValue.data)) {
            complete.options.push({
              label: key,
              type: "variable",
            });
          }
        }
      }
      /*
      for (const node of envOfNode.keys()) {
        const env = envOfNode.get(node);
        if (node === null) {
          console.log(`RootNode:0: ${stringifyEvalResult(env.data)}`);
          console.log(`RootNode:0: env.get pkgs: ${stringifyEvalResult(env.get('pkgs'))}`);
        }
        else {
          console.log(`${node.type.name}:${node.from}: ${stringifyEvalResult(env.data)}`);
          console.log(`${node.type.name}:${node.from}: env.get pkgs: ${stringifyEvalResult(env.get('pkgs'))}`);
        }
      }
      */

      return complete
    }
    return null
  }

  function completeFromGlobalScope(context) {
    let nodeBefore = syntaxTree(context.state).resolveInner(context.pos, -1)
    if (completePropertyAfter.includes(nodeBefore.name) &&
        nodeBefore.parent?.name == "MemberExpression") {
      let object = nodeBefore.parent.getChild("Expression")
      if (object?.name == "VariableName") {
        let from = /\./.test(nodeBefore.name) ? nodeBefore.to : nodeBefore.from
        let variableName = context.state.sliceDoc(object.from, object.to)
        if (typeof window[variableName] == "object")
          return completeProperties(from, window[variableName])
      }
    } else if (nodeBefore.name == "VariableName") {
      return completeProperties(nodeBefore.from, window)
    } else if (context.explicit && !dontCompleteIn.includes(nodeBefore.name)) {
      return completeProperties(context.pos, window)
    }
    return null
  }



  function debounce(func, timeout = 300){
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
  }



  const getCodeMirror = () => (
    <CodeMirror
      value={store.editorText}
      mode="nix"
      // workaround: every input is evaluated FOUR times, not just once
      // createCodeMirror.dispatch is called four times
      //onEditorStateChange={onEditorState}
      onEditorStateChange={debounce(onEditorState, 100)}
      onEditorMount={(view) => {
        // initial state

        // FIXME sometimes this is wrong:
        // multiple parse errors at end of tree
        // bug in lezer or codemirror?
        // seems like parser returns too early

        // workaround for solidjs
        //onEditorState(view.state);
        setTimeout(() => {
          onEditorState(view.state);
        }, 0);
      }}
      onAutoComplete={onAutoComplete}
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
              <div class={styles['eval-result']}>{
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
