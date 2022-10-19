# architecture

aka: how does this work?

im trying to build a browser-based editor for the [Nix](https://github.com/NixOS/nix) language

i have not seen something like this (incremental interpreter based on lezer-parser), so im sharing my concept here

my goal is to build something like [figwheel](https://figwheel.org/docs/reloadable_code.html) (live coding in ClojureScript, based on [Google Closure Compiler](https://developers.google.com/closure/compiler/)), but with a more narrow focus on intellisense (autocompletion, introspection of variables in scope)

the main component is [nix-eval-js](https://github.com/milahu/nix-eval-js), which is a Nix interpreter based on lezer-parser

the demo integrates this with codemirror

on every update of EditorState, i call this function:

```js
// nix-eval-js/demo/src/App.jsx

function onEditorState(editorState) {
  // handle new tree
  // eval
  const source = editorState.doc.sliceString(0, editorState.doc.length);
  let evalResult;
  try {
    // eval magic
    evalResult = editorState.tree.topNode.type.thunk(editorState.tree.cursor(), source);
  }
  catch (error) {
    console.error(error);
    evalResult = `# error: ${error.name}: ${error.message}`;
  }
  setStore('evalResult', evalResult); // set store.evalResult
}
```

onEditorState is called from dispatch

```js
// nix-eval-js/demo/src/createCodeMirror.js
// https://github.com/nimeshnayaju/solid-codemirror/pull/8

// Construct a new EditorView instance
view = new EditorView({
  state,
  parent: ref(),
  dispatch: (tr) => {
    if (!view)
      return;
    view.update([tr]);
    if (!tr.docChanged) {
      return;
    }
    if (props.onEditorStateChange) {
      const newEditorState = tr.state; // call: get state
      props.onEditorStateChange(newEditorState);
    }
  },
});
```

the eval magic happens in `editorState.tree.topNode.type.thunk`

what is `topNode.type.thunk`?

the `thunk` functions are added in `codemirror.jsx`

```jsx
// nix-eval-js/demo/src/codemirror.jsx
import { createCodeMirror } from "./createCodeMirror.js";
import { nix as codemirrorLangNix } from "./codemirror-lang-nix/dist/index.js";
import { thunkOfNodeType } from '../../src/nix-thunks-lezer-parser.js';

export function CodeMirror(props) {

  let ref;
  const codeMirrorExtensions = {};

  const { createExtension } = createCodeMirror({
    onEditorStateChange: props.onEditorStateChange,
    value: props.value,
  }, () => ref);

  // load the nix language extension
  codeMirrorExtensions.codemirrorLangNix = codemirrorLangNix();

  // add thunks to types
  const parser = codeMirrorExtensions.codemirrorLangNix.extension.language.parser;
  for (const nodeType of parser.nodeSet.types) {
    nodeType.thunk = thunkOfNodeType[nodeType.name];
  }

  return (
    <div ref={ref} />
  );
}
```

what are the `thunk` functions?

```js
// nix-eval-js/src/nix-thunks-lezer-parser.js.txt

function callThunk(cursor, source) {
  if (!cursor.type.thunk) {
    throw new NixEvalNotImplemented(`thunk is undefined for type ${cursor.type.name}`);
  }
  return cursor.type.thunk(cursor, source);
}

const thunkOfNodeType = {};

thunkOfNodeType['⚠'] = (cursor, _source) => {
  throw new NixSyntaxError(`error at position ${cursor.from}`);
};

thunkOfNodeType.Nix = (cursor, source) => {
  if (!cursor.firstChild() || !skipComments(cursor) || cursor == null) {
    // input is empty
    return;
  }
  return callThunk(cursor, source);
};

thunkOfNodeType.Add = (cursor, source) => {
  // arithmetic addition or string concat
  if (!cursor.firstChild() || !skipComments(cursor) || cursor == null) {
    throw new NixEvalError('ConcatStrings: no firstChild')
  }
  const arg1 = callThunk(cursor, source);
  if (!cursor.nextSibling() || !skipComments(cursor) || cursor == null) {
    throw new NixEvalError('ConcatStrings: no nextSibling')
  }
  const arg2 = callThunk(cursor, source);
  return arg1 + arg2;
};

thunkOfNodeType.Int = (cursor, source) => {
  return parseInt(nodeText(cursor, source));
};

export { thunkOfNodeType }
```
