import { createSignal, onMount, For } from "solid-js";
import { createStore } from "solid-js/store";

//import logo from './logo.svg';
import styles from './App.module.css';



// layout

//import { Tab, TabContainer, Tabs } from "solid-blocks";
import { Tab, TabContainer, Tabs } from "./solid-blocks";
//import { GridResizer } from './solid-blocks/src/splitter.jsx';
//import { SplitY, SplitX } from './solid-blocks/src/splitter.jsx';

import {SplitRoot, SplitY, SplitX, SplitItem} from './solidjs-resizable-splitter-component'



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
import { configure as getStringify } from '../../src/safe-stable-stringify/index.esm.js'
// https://github.com/BridgeAR/safe-stable-stringify/issues/32
// https://github.com/BridgeAR/safe-stable-stringify/issues/19

import * as nixReplHelp from './nix-repl-help.js'

const stringify = getStringify({
  maximumDepth: 2,
  maximumBreadth: 10,
  indent: "  ",
})



// TODO why was sleep needed in frontend
const sleep = ms => new Promise(res => setTimeout(res, ms));



export default function App() {

  let nixEval;
  let terminal;

  const [store, setStore] = createStore({
    // TODO
    options: [],
    config: null, // syntax tree, parsed by tree-sitter-nix
    fileSelected: '',
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
    /* */
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    console.log('fitAddon', fitAddon);
    fitAddon.fit();
    /* TODO test
    terminalParent.addEventListener('resize', (_event) => {
      fitAddon.fit();
    })
    /* */
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
        return stringify(result).replace(/\n/g, '\r\n');
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



  return (
    <div class={styles.App} style={{
      'display': 'flex',
      'flex-grow': '1',
    }}>

      <SplitRoot>
        <SplitX>
          <SplitY>
            <SplitItem size="80%">
              <Tabs>
                <Tab>Parse Tree</Tab>
                <TabContainer>
                  <div style="height: 100%; overflow: auto">
                    <Show when={store.tree} fallback={"no tree"}>
                      <div>(FIXME remove the first 2 nodes)</div>
                      <Show when={store.tree.rootNode /* tree-sitter */}>
                        <TreeViewTreeSitter node={store.tree.rootNode} depth={0} />
                      </Show>
                      <Show when={store.tree.topNode /* lezer-parser */}>
                        <TreeViewLezerParser
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
                </TabContainer>
                <Tab>todo</Tab>
                <TabContainer>todo</TabContainer>
              </Tabs>
            </SplitItem>
            <SplitItem>
              <Tabs>
                <Tab>Eval Result</Tab>
                <TabContainer>
                  <div style="height: 100%; overflow: auto">
                    <Show when={store.tree} fallback={"no eval"}>
                      <pre>{JSON.stringify(nixEval.evalTree(store.tree, store.source), null, 2)}</pre>
                    </Show>
                  </div>
                </TabContainer>
                <Tab>todo</Tab>
                <TabContainer>todo</TabContainer>
              </Tabs>
            </SplitItem>
          </SplitY>
          <SplitItem>
            <div>(warning: the evaluator breaks on syntax errors)</div>
            <CodeMirror
              value="if true\nthen 1\nelse 2"
              //value="if true then true else\n{ pkgs ? import <nixpkgs> {} }:\npkgs.mkShell {\n  buildInputs = [ pkgs.nodejs ];\n}\n"
              onEditorMount={() => null}
              onValueChange={() => null}
              showLineNumbers={true}
              wrapLine={false}
              //theme={null}
              //extensions={[]}
            />
          </SplitItem>
        </SplitX>
      </SplitRoot>



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
        <Xterm
          onTerminal={onTerminal}
          style={{
            'display': 'flex',
          }}
        />
        <div style={{ 'text-align': 'right' }}>
          <a
            href="https://github.com/milahu/nix-eval-js"
            style={{ 'text-decoration': 'none' }}
          >src</a>
        </div>
      </main>
      </Show>

    </div>
  );
}

