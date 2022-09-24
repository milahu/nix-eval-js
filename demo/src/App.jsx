import { createSignal, onMount, For } from "solid-js";
import { createStore } from "solid-js/store";

//import logo from './logo.svg';
import styles from './App.module.css';



// layout

//import { Tab, TabContainer, Tabs } from "solid-blocks";
//import { Tab, TabContainer, Tabs } from "./solid-blocks";
// style is missing
// https://github.com/atk/solid-blocks/issues/11
import { Tab, TabContainer, Tabs } from "./atk/solid-blocks";

//import { GridResizer } from './solid-blocks/src/splitter.jsx';
//import { SplitY, SplitX } from './solid-blocks/src/splitter.jsx';

import { SplitRoot, SplitY, SplitX, SplitItem } from './solidjs-resizable-splitter-component'

import {
  //TreeViewTreeSitter,
  //TreeViewLezerParser,
  TreeViewCodeMirror,
} from './treeview.jsx';



// editor

//import { CodeMirror } from "@solid-codemirror/codemirror";
import { CodeMirror } from "./codemirror.jsx";



// eval

// TODO parse incremental
import { NixEval, NixEvalError, NixSyntaxError } from "../../src/nix-eval.js";

//import { Xterm } from './xterm.jsx'
import { Xterm } from './solidjs-xterm-component/xterm.jsx'
import LocalEchoController from 'local-echo';
import { WebLinksAddon } from 'xterm-addon-web-links';

// FIXME not working?
// -> must call fitAddon.fit();
import { FitAddon } from 'xterm-addon-fit';

// wrapper is not working with vite bundler
// import { configure as getStringify } from '../../src/safe-stable-stringify/esm/wrapper.js'
// Uncaught SyntaxError: The requested module safe-stable-stringify/index.js does not provide an export named 'default'
//import { configure as getStringify } from '../../src/safe-stable-stringify/index.esm.js'
// https://github.com/BridgeAR/safe-stable-stringify/issues/32
// https://github.com/BridgeAR/safe-stable-stringify/issues/19

// SyntaxError: The requested module 'safe-stable-stringify/index.js' does not provide an export named 'default'
// https://github.com/BridgeAR/safe-stable-stringify/issues/36
// -> use patched "esm only" version
//import { configure as getStringifyEvalResult } from '../../src/safe-stable-stringify/esm/wrapper.js'
import { configure as getStringifyEvalResult } from '../../src/safe-stable-stringify/index.js'

import * as nixReplHelp from './nix-repl-help.js'

/*
const stringify = getStringify({
  maximumDepth: 2,
  maximumBreadth: 10,
  indent: "  ",
})
*/

const stringifyEvalResult = getStringifyEvalResult({
  maximumDepth: 2,
  maximumBreadth: 10,
  indent: "  ",
})



// TODO why was sleep needed in frontend
const sleep = ms => new Promise(res => setTimeout(res, ms));



const exampleInputs = [
  '1 # int',
  '1+1+1 # add',
  '1+1.0 # int + float',
  '0.1+0.2 # float precision',
  '0.123456789 # float precision',
  '2+3*4 # mul',
  '1.0/ 2 # div',
  '1.0/2 # path',
  '1.0 /2 # call',
  '(2+3)*4 # parens',
  '[1 2 3] # list',
  '__typeOf null # call',
  '__typeOf 1 # call',
  '__typeOf 1.0 # call',
  '__head [1 2 3] # call',
  '__tail [1 2 3] # call',
  '__elemAt [1 2 3] 1 # nested call',
  '{a=1;b=2;} # set',
  '{a=1;b=2;}.a # select',
  '{a={b=2;};}.a.b # nested select',
];



export default function App() {

  let nixEval;
  let terminal;

  const [store, setStore] = createStore({
    // TODO
    options: [],
    config: null, // syntax tree, parsed by tree-sitter-nix
    fileSelected: '',
    editorText: exampleInputs[0],
  });

  onMount(async () => {
    nixEval = new NixEval();
  })

  //function onTerminal({ terminal: _terminal, ref: terminalParent }) {
  function onTerminal(_terminal) {
    terminal = _terminal;

    // colors
    // TODO ubuntu theme https://en.wikipedia.org/wiki/ANSI_escape_code#Colors
    /*
    terminal.options.theme = {
      background: "black",
      foreground: "white",
    };
    */

    // FIXME not working?
    // fit terminal to parent size
    /** /
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    console.log('fitAddon', fitAddon);
    fitAddon.fit();
    /* TODO test
    terminalParent.addEventListener('resize', (_event) => {
      fitAddon.fit();
    })
    /* * /
    // simple:
    window.addEventListener('resize', (_event) => {
      fitAddon.fit();
    })

    // clickable links
    /*
    function onLinkClick(_event, url) {
      console.log(`clicked link: ${url}`);
    }
    */
    //terminal.loadAddon(new WebLinksAddon(onLinkClick));
    // default handler: open the link
    terminal.loadAddon(new WebLinksAddon());

    // start writing to terminal

    // greeting
    const nixEvalVersion = '0.0.1';
    terminal.writeln(`Welcome to nix-eval.js ${nixEvalVersion}. Type :? for help. ArrowUp for history.`);
    terminal.writeln('');

    // simple link
    //terminal.writeln('click here: https://xtermjs.org/');

    // OSC 8 hyperlink escape codes
    // FIXME not working
    //terminal.writeln('click here: \x1b]8;;https://xtermjs.org\x07OSC 8 hyperlink text\x1b]8;;\x07');

    function evalLine(line) {
      // https://ansi.gabebanks.net/ # ANSI escape code generator
      const start = '\x1B[';
      const bold = '1';
      const red = '31';
      const redbold = `${start}${red};${bold}m`;
      const reset = '\x1B[0m';
      //const end = 'm';
      //const sep = ';';
      //const magenta = '35';
      //const magentabold = `${start}${magenta};${bold}m`;

      // eval javascript
      //return JSON.stringify(eval(line), null, 2);

      // eval nix repl
      if (line == ':?') {
        return nixReplHelp.main.join('\r\n');
      }
      if (/^:\?\s*[eE]\s*/.test(line)) { // :?e
        return nixReplHelp.expressions.join('\r\n');
      }
      if (/^:\?\s*[oO]\s*/.test(line)) { // :?o
        return nixReplHelp.operations.join('\r\n');
      }

      // eval nix
      try {
        console.log(`user input :`, line);
        const result = nixEval.eval(line);
        console.log(`eval result:`, result);
        if (result === undefined) return '';
        //return String(result).replace(/\n/g, '\r\n'); // TODO implement custom toString
        return stringifyEvalResult(result).replace(/\n/g, '\r\n');
      }
      catch (error) {
        if (error instanceof NixEvalError) {
          return `${redbold}error:${reset} ${error.message}`;
        }
        else if (error instanceof NixSyntaxError) {
          // TODO error format?
          return `${redbold}error:${reset} syntax error, ${error.message}`;
        }
        else {
          console.log(error);
          return `${redbold}FIXME${reset} ${error.name}: ${error.message}`;
        }
      }
    }



    // read lines

    const localEcho = new LocalEchoController(null, {
      historySize: 9999, // workaround for https://github.com/wavesoft/local-echo/issues/34
    });

    // prefill command history with demo commands

    localEcho.history.entries = nixReplHelp.demos.slice().reverse();
    localEcho.history.cursor = localEcho.history.entries.length;

    // autocomplete commands

    // https://github.com/wavesoft/local-echo#addautocompletehandlercallback-args
    // TODO https://github.com/wavesoft/local-echo/pull/57

    function autocompleteCommands(index, tokens) {
        if (index == 0) {
          return [
            "assert", "with",
            "let", "in", // too short?
            "null", "true", "false",
            "__add", "__sub", "__mul", "__div",
            "__tail", "__head", "__elemAt",
            "__typeOf",
          ];
        }
        return [];
    }
    localEcho.addAutocompleteHandler(autocompleteCommands);

    /*
    function autocompleteFiles(index, tokens) {
        if (index == 0) return [];
        return [ ".git", ".gitignore", "package.json" ];
    }
    localEcho.addAutocompleteHandler(autocompleteFiles);
    */

    terminal.loadAddon(localEcho);

    // note: the main local-echo repo is not maintained
    // TODO pre-fill command history with demo commands
    // TODO autocompletion
    // TODO fix history bug https://github.com/wavesoft/local-echo/issues/34
    // https://github.com/wavesoft/local-echo/pull/32

    const promptString = 'nix-repl> ';

    function readLine() {

      // Read a single line from the user
      localEcho.read(promptString)
        .then(line => {
          const result = evalLine(line);
          if (result !== undefined) {
            //console.log(`Result: ${result}`);
            terminal.write(result.toString() + '\r\n\r\n');
          }
          readLine(); // read next line
        })
        .catch(error => {
          console.log(`Error reading line: ${error}`);
          console.log(error);
          console.log("stopping the readLine loop");
        })
        // TODO also print error to gui terminal
        // TODO call readLine in catch branch? risk: infinite loop
        // -> dont use errors for control flow
      ;
    }
    readLine(); // start loop
  }



  function onEditorState(editorState) {
    // handle new tree
    /*
    const newCode = editorState.doc.sliceString(0, newState.doc.length);
    const newTree = editorState.tree;
    */
    /*
    setStore('tree', newTree); // set store.tree
    setStore('source', newCode); // set store.source
    */
    // atomic update: both values (tree, source) are used in TreeViewLezerParser
    //console.log(`App.onEditorState: editorState`, editorState)
    setStore('editorState', editorState); // set store.editorState
    //newTree.topNode // Nix: 1+1
    //newTree.topNode.firstChild // ConcatStrings: 1+1

    // eval
    //console.log('eval ...');
    //console.log('eval', editorState.tree.topNode.type.thunk(editorState.tree.topNode));

    // also in treeview.jsx. dedupe? avoid? (use editorState.doc directly?)
    const source = editorState.doc.sliceString(0, editorState.doc.length);

    //console.log(`onEditorState: editorState.tree.length`, editorState.tree.length);
    if (!editorState.tree || editorState.tree.length == 0) {
      console.log(`onEditorState: tree is empty`);
      setStore('evalResult', undefined); // set store.evalResult
      return;
    }

    let evalResult;
    try {
      // node interface vs cursor interface. see: nix-eval-js/doc/readme.md
      // node interface
      evalResult = editorState.tree.topNode.type.thunk(editorState.tree.topNode, source);
      // cursor interface. wrong
      //evalResult = editorState.tree.topNode.type.thunk(editorState.tree.cursor(), source);
      NixEvalError, NixSyntaxError
    }
    catch (error) {
      if (error instanceof NixSyntaxError || error instanceof NixEvalError) {
        evalResult = `# ${error.name}: ${error.message}`;
      }
      else {
        console.error(error);
        evalResult = `# FIXME unhandled error: ${error.name}: ${error.message}`;
      }
    }
    //console.log('evalResult', evalResult);
    setStore('evalResult', evalResult); // set store.evalResult
  }



  const getCodeMirror = () => (
    <CodeMirror
      value={store.editorText}
      mode="nix"
      //mode="javascript"
      //value="if true then true else\n{ pkgs ? import <nixpkgs> {} }:\npkgs.mkShell {\n  buildInputs = [ pkgs.nodejs ];\n}\n"
      //onCodeMirror={(codeMirror) => console.log('codeMirror', codeMirror)}
      //onValueChange={(newValue) => null}
      //onValueChange={() => null}
      //showLineNumbers={true}
      //wrapLine={false}
      //theme={null}
      //extensions={[]}

      //onEditorState={onEditorState}
      onEditorStateChange={onEditorState}
      onEditorMount={(view) => {
        // FIXME not called?
        console.log(`onEditorMount: call onEditorState`)
        onEditorState(view.state);
      }}
    />
  )

  /* test solid-blocks
  return (
    <div>
      <Tabs>
        <Tab>label 1</Tab>
        <TabContainer>content 1</TabContainer>
        <Tab>label 2</Tab>
        <TabContainer>content 2</TabContainer>
      </Tabs>
    </div>
  );
  */

  /*
  function stringifyEvalResult(evalResult) {
    const handleType = {
      // int
      bigint: value => parseInt(value),
      // float
      // FIXME this returns string "1.0" not float 1.0
      // -> use patched version of safe-stable-stringify
      number: value => ((value | 0) == value) ? `${value}.0` : value,
    }
    return JSON.stringify(
      evalResult,
      // custom type handlers
      (_key, value) => handleType[typeof value] ? handleType[typeof value](value) : value,
      // indent
      1
    )
  }
  */

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
              <div>{
                //JSON.stringify(store.evalResult, null, 1)
                stringifyEvalResult(store.evalResult)
              }</div>
            </SplitItem>
            <SplitItem>
              <div>Example inputs:</div>
              <ul>
                <For each={exampleInputs}>{input => (
                  <li class={styles.clickable} onclick={() => {
                    console.log(`click example input: ${input}`);
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



  // dead code
  return (
    <div class={styles.App}>
    

    <Tabs classList={{ [styles.flexcolumn]: true }}>

      <Tab>edit</Tab>
      <TabContainer classList={{ [styles.flexcolumn]: true }}>

        {/* switch shows the first match with (when == true) */}
        {/* to show the second branch, set the first when to false */}
        <Switch>

          <Match when={false}>{getCodeMirror()}</Match>

          <Match when={true /* resizable layout - no wrapper */}>
            <SplitRoot>
              <SplitX>
                <SplitItem>
                  <Switch>
                    <Match when={store.editorState /* codemirror */}>
                      <TreeViewCodeMirror editorState={store.editorState} />
                    </Match>
                    <Match when={true}>
                      <div>editorState is empty</div>
                    </Match>
                  </Switch>
                </SplitItem>
                <SplitItem>
                  <div>Supported: Add, Int</div>
                  {getCodeMirror()}
                  <div>Result: {String(store.evalResult)}</div>
                </SplitItem>
              </SplitX>
            </SplitRoot>
          </Match>

          <Match when={false /* resizable layout - yes wrapper  */}>
            <div style={{ 'display': 'flex', }}>
              <SplitX>
                <SplitItem>
                  <Switch>
                    <Match when={store.editorState /* codemirror */}>
                      <TreeViewCodeMirror editorState={store.editorState} />
                    </Match>
                    <Match when={true}>
                      <div>editorState is empty</div>
                    </Match>
                  </Switch>
                </SplitItem>
                <SplitItem>
                  {getCodeMirror()}
                </SplitItem>
              </SplitX>
            </div>
          </Match>

          <Match when={true /* fixed layout */}>
            <div style={{ 'display': 'flex', }}>
              <div style={{ 'flex-basis': '40%', }}>
                <Switch>
                  <Match when={store.editorState /* codemirror */}>
                    <TreeViewCodeMirror editorState={store.editorState} />
                  </Match>
                  <Match when={true}>
                    <div>editorState is empty</div>
                  </Match>
                </Switch>
              </div>
              <div style={{ 'flex-grow': '1', }}>
                {getCodeMirror()}
              </div>
              <div style={{ 'flex-basis': '2%', }}></div>
            </div>
          </Match>

          {/* FIXME height */}
          <Match when={false}>
            <SplitRoot>
              <SplitX>
                  <SplitY>
                    <SplitItem size="80%">
                      <div>Parse Tree</div>
                      <div style="height: 100%; overflow: auto">
                        <Show when={() => (store.tree || store.editorState)} fallback={"no tree"}>
                          <div>(FIXME remove the first 2 nodes)</div>
                          <Show when={store.tree.rootNode /* tree-sitter */}>
                            <TreeViewTreeSitter node={store.tree.rootNode} depth={0} />
                          </Show>
                          <Show when={store.editorState /* codemirror */}>
                            <div>TreeViewCodeMirror:</div>
                            <TreeViewCodeMirror editorState={store.editorState} />
                          </Show>
                          <Show when={store.tree.topNode /* lezer-parser */}>
                            <TreeViewLezerParser
                              // FIXME what is TreeViewLezerParser
                              editorState={store.editorState}
                              cursor={(() => {
                                const cursor = store.tree.cursor(
                                  //IterMode.IncludeAnonymous // this breaks the parse tree rendering
                                );
                                // skip topNode, dont show the root "Nix" node in parse tree
                                // FIXME this breaks for simple sources like "1" or "x"
                                //cursor.firstChild();
                                // FIXME this breaks on empty source ""
                                // -> parse tree shows "x"
                                // fixed after hot reload ...
                                return cursor;
                              })()}
                              depth={0}
                              source={store.source} //// TODO setState ??
                            />
                          </Show>
                        </Show>
                      </div>
                    </SplitItem>
                    <SplitItem>
                      <div>Eval Result</div>
                      <div style="height: 100%; overflow: auto">
                        <Show when={store.tree} fallback={"no eval"}>
                          <pre>{JSON.stringify(nixEval.evalTree(store.tree, store.source), null, 2)}</pre>
                        </Show>
                      </div>
                    </SplitItem>
                  </SplitY>
                <SplitItem>
                  {getCodeMirror()}
                </SplitItem>
              </SplitX>
            </SplitRoot>
          </Match>
        </Switch>
      </TabContainer>



      <Tab>repl</Tab>
      <TabContainer classList={{ [styles.flexcolumn]: true }}>
        <Xterm
          onTerminal={onTerminal}
          style={{
            'display': 'flex',
          }}
        />
      </TabContainer>



      <Tab>src</Tab>
      <TabContainer classList={{ [styles.flexcolumn]: true }}>
        <a
          href="https://github.com/milahu/nix-eval-js"
          style={{ 'text-decoration': 'none' }}
        >github.com/milahu/nix-eval-js</a>
      </TabContainer>
    </Tabs>



      {/* nix repl */}

      <Show when={false}>

      {/*
      <header class={styles.header}>
        <img src={logo} class={styles.logo} alt="logo" />
        <p>
          Edit <code>src/App.jsx</code> and save to reload.
        </p>
        <a
          class={styles.link}
          href="https://github.com/solidjs/solid"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn Solid
        </a>
      </header>
      */}
      {/*
      <main class={styles.main} contenteditable>
        nix-repl&gt;&nbsp;
      </main>
      */}
      <main class={styles.main}>
      </main>
      </Show>

    </div>
  );
}

