import { createSignal, onMount, For, createEffect, on } from "solid-js";
import { createStore } from "solid-js/store";

//import 'codemirror/lib/codemirror.css';
//import 'codemirror/theme/monokai.css';

// TODO https://github.com/FarhadG/code-mirror-themes

// node_modules/@solid-codemirror/core/dist/index/createCodeMirror.js
//import { createCodeMirror } from "@solid-codemirror/core";
import { createCodeMirror } from "./createCodeMirror.js";

// https://github.com/codemirror/basic-setup

/**/
import {
  EditorView,
  keymap, highlightSpecialChars, drawSelection, highlightActiveLine, dropCursor,
  rectangularSelection, crosshairCursor, lineNumbers, highlightActiveLineGutter
} from "@codemirror/view"
//} from "./@codemirror/view"
/**/

// FIXME Uncaught Error: Unrecognized extension value in extension set ([object Object]).
// This sometimes happens because multiple instances of @codemirror/state are loaded, breaking instanceof checks.
// TODO restore. this did not help
import { EditorState } from "@codemirror/state"

import {
  defaultHighlightStyle, syntaxHighlighting, indentOnInput, bracketMatching,
  foldGutter, foldKeymap
} from "@codemirror/language"

import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"

import { searchKeymap, highlightSelectionMatches } from "@codemirror/search"

import {
  autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap
} from "@codemirror/autocomplete"

import { lintKeymap } from "@codemirror/lint"



// TODO get language from props

// parse
import { nix as codemirrorLangNix } from "./codemirror-lang-nix/dist/index.js";
//import { javascript } from "@codemirror/lang-javascript";

// eval
// nix-eval-js/src/nix-thunks.js
//import { setThunkOfNodeType } from '../../src/nix-thunks.js';
import * as thunkOfNodeType from '../../src/nix-thunks-lezer-parser.js';



export function CodeMirror(props) {

  let ref;
  const codeMirrorExtensions = {};

  //onMount(() => {

    //setTimeout(() => {

    // setTimeout ->
    // warning: computations created outside a `createRoot` or `render` will never be disposed

    //codeMirror = createCodeMirror((() => props.options)(), () => ref);
    //codeMirror = createCodeMirror((() => props)(), () => ref);
    // solid-codemirror/packages/core/src/createCodeMirror.ts

    let view;

    const { createExtension } = createCodeMirror({
      //onValueChange: (newValue) => null,
      onEditorMount: props.onCodeMirror,
      onValueChange: props.onValueChange,
      onEditorState: props.onEditorState,
      onEditorStateChange: props.onEditorStateChange,
      onEditorMount: (newView) => {
        view = newView;
        if (props.onEditorMount) props.onEditorMount(view);
      },
      /*
      (editorState) => {
        // handle new tree
        const newState = tr.state; // call "get state"
        const newCode = newState.doc.sliceString(0, newState.doc.length);
        const newTree = newState.tree;
        //newTree.topNode // Nix: 1+1
        //newTree.topNode.firstChild // ConcatStrings: 1+1
      },
      */
      // TODO called too often?
      value: props.value,
    }, () => ref);

    // listen for changes in props.value
    // FIXME deduplicate with createCodeMirror
    createEffect(on(() => props.value, (value) => {
        //console.log(`CodeMirror: createEffect on props.value: value = ${value}`)
        if (!view || value === view.state.doc.toString()) {
            return;
        }
        view.dispatch({
            changes: {
                from: 0,
                to: view.state.doc.length,
                insert: value,
            },
        });
    }, { defer: true }));

    const basicSetupSolid = {

      /**/
      syntaxHighlighting: syntaxHighlighting(defaultHighlightStyle, {fallback: true}),

      /**/
      lineNumbers: lineNumbers(),
      /** /
      highlightActiveLineGutter: highlightActiveLineGutter(),
      highlightSpecialChars: highlightSpecialChars(),
      /**/
      history: history(),
      /** /
      foldGutter: foldGutter(), // FIXME Uncaught Error: Unrecognized extension value in extension set ([object Object]). This sometimes happens because multiple instances of @codemirror/state are loaded, breaking instanceof checks.
      drawSelection: drawSelection(),

      /** /
      dropCursor: dropCursor(),
      allowMultipleSelections: EditorState.allowMultipleSelections.of(true),
      indentOnInput: indentOnInput(),
      /**/
      bracketMatching: bracketMatching(), // FIXME Uncaught Error: Unrecognized extension value in extension set ([object Object]). This sometimes happens because multiple instances of @codemirror/state are loaded, breaking instanceof checks.
      closeBrackets: closeBrackets(),
      /** /

      // FIXME TypeError: Cannot read properties of null (reading 'addEventListener')
      // https://github.com/codemirror/dev/issues/945
      /**/
      autocompletion: autocompletion(), // -> tooltipPlugin

      /** /
      rectangularSelection: rectangularSelection(),
      crosshairCursor: crosshairCursor(),
      highlightActiveLine: highlightActiveLine(),
      highlightSelectionMatches: highlightSelectionMatches(),
      /**/

      keymap: keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
        ...lintKeymap
      ]),
      /**/

      codemirrorLangNix: codemirrorLangNix({
        data: {
          //autocomplete: completeFromGlobalScope,
          autocomplete: props.onAutoComplete,
        }
      }),
      // https://github.com/sachinraja/rodemirror/blob/1e8a52f9d5c78859441d11a80211fc6f7538deb7/src/index.tsx#L36
      // FIXME not called
      /*
      updateListener: EditorView.updateListener.of(function onUpdate(update) {
        console.log(`onUpdate update`, update)
      }),
      */
      // -> codeMirror.on('change', (update) => { ... })
      // -> use dispatch in createCodeMirror
      // https://discuss.codemirror.net/t/codemirror-6-proper-way-to-listen-for-changes/2395/10

      // same as dispatch
      /*
      onEditorViewUpdate: EditorView.updateListener.of((viewUpdate) => {
        //console.log(`onEditorViewUpdate`, Date.now())
        if (viewUpdate.docChanged) {
          // Document changed
          console.log(`onEditorViewUpdate docChanged`, Date.now())
        }
      }),
      */

      //javascript: javascript(),
      /**/
    };

    for (const [extensionName, extension] of Object.entries(basicSetupSolid)) {
      //console.log('basicSetupSolid: extension', extensionName, extension)
      const reconfigureExtension = createExtension(extension);
      codeMirrorExtensions[extensionName] = {
        extension,
        reconfigure: reconfigureExtension,
      };
    }

    // add thunks to types
    const parser = codeMirrorExtensions.codemirrorLangNix.extension.language.parser;
    for (const nodeType of parser.nodeSet.types) {
      nodeType.thunk = thunkOfNodeType[nodeType.name];
      if (!nodeType.thunk) {
        // not found in thunkOfNodeType
        if (nodeType.name == '⚠') {
          nodeType.thunk = thunkOfNodeType['SyntaxError'];
        }
      }
    }

    // https://github.com/JedWatson/react-codemirror/blob/c3ae528465bcdc4f20780892f8a9111e785fa577/src/Codemirror.js#L49
		/*
    const codeMirrorInstance = this.getCodeMirrorInstance();
		this.codeMirror = codeMirrorInstance.fromTextArea(this.textareaNode, this.props.options);
		this.codeMirror.on('change', this.codemirrorValueChanged);
		this.codeMirror.on('cursorActivity', this.cursorActivity);
		this.codeMirror.on('focus', this.focusChanged.bind(this, true));
		this.codeMirror.on('blur', this.focusChanged.bind(this, false));
		this.codeMirror.on('scroll', this.scrollChanged);
		this.codeMirror.setValue(this.props.defaultValue || this.props.value || '');
    */

    /* this could work in onEditorMount of createCodeMirror
    // but lets just patch createCodeMirror
    codeMirror.on('change', (...update) => {
      console.log(`codeMirror on change: update:`, update);
    });
    */

    //}); // setTimeout(() => {

  //});

  //return <div ref={ref} />;

  return (
    <div>
      <div ref={ref} />
      <Switch>
        <Match when={false}>
          <div>
            {
              // Buttons to show/hide line numbers
              // FIXME this is broken since...? https://github.com/codemirror/dev/issues/945
              // -> wrong fix?
              // working now. ok
            }
            <button onClick={() => codeMirrorExtensions.lineNumbers.reconfigure([])}>
              Hide line numbers
            </button>
            <button onClick={(
              () => codeMirrorExtensions.lineNumbers.reconfigure(
                codeMirrorExtensions.lineNumbers.extension
              )
            )}>
              Show line numbers
            </button>
          </div>
        </Match>
      </Switch>
      {/**/}
    </div>
  );
}





  // CodeMirror plugin crashed: TypeError: Cannot read properties of null (reading 'addEventListener')
  //createExtension(basicSetup);
  // CodeMirror plugin crashed: TypeError: Cannot read properties of null (reading 'addEventListener')
  //for (const extension of basicSetup) {
  //  createExtension(extension);
  //}
  // https://github.com/nimeshnayaju/solid-codemirror/pull/4
  // basicSetup should be used like <CodeMirror extensions={[ basicSetup ]} />
  // -> reimplement basicSetup for "advanced usage" with createExtension
  // https://github.com/nimeshnayaju/solid-codemirror#advanced-usage
  // https://github.com/codemirror/basic-setup

  // the hard way
  /*
  const reconfigureLineNumbers = createExtension(lineNumbers());

  createExtension(highlightActiveLineGutter());

  createExtension(bracketMatching());
  */



// FIXME Uncaught Error: Unrecognized extension value in extension set ([object Object]).
// This sometimes happens because multiple instances of @codemirror/state are loaded, breaking instanceof checks.
// https://github.com/codemirror/dev/issues/608

/*

This usually happens when your build pipeline decides
to mix two copies or different versions of @codemirror/state
through the dependency tree.

If you're using npm, try running npm list @codemirror/state
and see if you have non deduped copies of that package.



$ pnpm list -r | grep -B20 @codemirror/state

nix-eval-js-demo

devDependencies:
...
@codemirror/state 6.1.1
...

codemirror-lang-nix@6.0.0 nix-eval-js/demo/src/codemirror-lang-nix

devDependencies:
...
@codemirror/state 6.1.1

*/


