import { createSignal, onMount, For } from "solid-js";

//import logo from './logo.svg';
import styles from './App.module.css';

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



function App() {

  let nixEval;
  let terminal;

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
    /* * /
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    console.log('fitAddon', fitAddon);
    fitAddon.fit();
    terminalParent.addEventListener('resize', (_event) => {
      fitAddon.fit();
    })
    /* */

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
    <div class={styles.App}>
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
            'flex-grow': 1, // full height
            //'display': 'flex',
          }}
        />
      </main>
    </div>
  );
}

export default App;
