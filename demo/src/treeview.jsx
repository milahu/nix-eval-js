
/*

usage
import {
  TreeViewTreeSitter,
  TreeViewLezerParser,
  TreeViewCodeMirror,
} from './treeview.jsx';

based on
nixos-config-webui/frontend/src/App.jsx

*/

import { stringifyTree } from '../../src/lezer-parser-nix/src/nix-format.js';

// {props.node.text} <span class="comment"># {props.node.type}</span>
export function TreeViewTreeSitter(props) {
  return (
    <Show when={props.node.type != 'comment'}>
      <Show
        when={props.node.children.length > 0}
        fallback={
          <div class="leaf-node" style="font-family: monospace">
            <Show
              when={props.node.type != props.node.text}
              fallback={<><Indent depth={props.depth}/> {props.node.type}</>}
            ><Indent depth={props.depth} step={props.indent}/> {props.node.type}: {props.node.text}</Show>
          </div>
        }
      >
        <div class="branch-node" style="font-family: monospace">
          <Indent depth={props.depth} step={props.indent}/> {props.node.type}
          <div>
            <For each={props.node.children}>{childNode => TreeViewTreeSitter({ node: childNode, depth: props.depth + 1 })}</For>
          </div>
        </div>
      </Show>
    </Show>
  );
}


// FIXME this is called too often
// after page reload, 31 times instead of 1 time
// for the nix source: if true then true else false
// {props.cursor.text} <span class="comment"># {props.cursor.type}</span>
// note: first call must pass depth={0}
export function TreeViewLezerParser(props) {
  // tree walker, based on
  // monaco-lezer-parser/src/highlighter.js
  // function buildHighlightInfo
  // https://lezer.codemirror.net/docs/ref/#common.SyntaxNode
  // TODO When iterating over large amounts of nodes, you may want to use a mutable cursor instead, which is more efficient.
  //console.log('App: TreeViewLezerParser: cursor', props.cursor);
  // props.cursor.children // tree-sitter
  //
  if (!props.cursor) {
    console.log('App: TreeViewLezerParser: cursor is empty -> return');
    return;
  }
  if (!props.cursor.node) {
    console.log('App: TreeViewLezerParser: cursor.node is empty -> return');
    return;
  }
  if (!props.source) {
    console.log('App: TreeViewLezerParser: source is empty -> return');
    return;
  }
  //const cursorType = props.cursor.type;
  // save the current node data
  // before calling firstChild/nextSibling/parent on the cursor
  const cursorText = () => props.source.slice(props.cursor.from, props.cursor.to);
  const cursorType = () => props.cursor.name;
  //console.log('App: TreeViewLezerParser: cursorText', cursorText);
  // solidjs has ugly conditionals, so here is the control flow:
  //
  // if (cursor.goDown()) { // cursor.firstChild()
  //   show current node
  //   depth++
  //   recurse(cursor)
  // }
  // else {
  //   ...
  // }
  //
  // see also: nix-eval-js/src/nix-eval.js
  function recurse(depthChange = 0) {
    return TreeViewLezerParser({
      cursor: props.cursor,
      source: props.source,
      depth: props.depth + depthChange,
      indent: props.indent,
    });
  }
  return (
    <div class="branch-node" style="font-family: monospace">
      <Switch>
        <Match when={props.cursor.firstChild()}>
          <Indent depth={props.depth} step={props.indent}/>{cursorType()}: {cursorText()}
          {recurse(+1)}
        </Match>
        <Match when={true}>
          <Indent depth={props.depth} step={props.indent}/>{cursorType()}: {cursorText()}
          <Switch>
            <Match when={props.cursor.nextSibling()}>
              {recurse()}
            </Match>
            <Match when={props.cursor.parent() && props.cursor.nextSibling()}>
              {recurse(-1)}
            </Match>
          </Switch>
        </Match>
      </Switch>
    </div>
  );
  return (
    <div class="branch-node" style="font-family: monospace">
      <Switch>
        <Match when={props.cursor.firstChild()}>
          <Indent depth={props.depth} step={props.indent}/>{cursorType}: {cursorText}
          {recurse(+1)}
        </Match>
        <Match when={true}>
          <Indent depth={props.depth} step={props.indent}/>{cursorType}: {cursorText}
          <Switch>
            <Match when={props.cursor.nextSibling()}>
              {recurse()}
            </Match>
            <Match when={props.cursor.parent() && props.cursor.nextSibling()}>
              {recurse(-1)}
            </Match>
          </Switch>
        </Match>
      </Switch>
    </div>
  );
}



// FIXME this is called too often
// debounce? throttle?
export function TreeViewCodeMirror(props) {
  if (!props.editorState) {
    console.log('App: TreeViewCodeMirror: editorState is empty -> return');
    return <div>TreeViewCodeMirror: editorState is empty</div>;
  }
  /* this gets stuck, does not update with props.editorState
  console.log('App: TreeViewCodeMirror: props.editorState.tree.length', props.editorState.tree.length);
  if (props.editorState.tree.length == 0) {
    console.log('App: TreeViewCodeMirror: editorState.tree is empty -> return');
    return <div>TreeViewCodeMirror: editorState.tree is empty</div>;
  }
  */

  const getCursor = () => {
    const cursor = props.editorState.tree.cursor();
    return cursor;

    if (cursor.firstChild()) { // skip topNode
      return cursor;
    } 
    return cursor;
    return null; // fixme dont show empty tree
  }



  // avoid recursion

  const getTree = () => {
    const source = props.editorState.doc.sliceString(0, props.editorState.doc.length);
    return stringifyTree(props.editorState.tree, {
      source,
      human: true,
    });
  }

  return <pre>{getTree()}</pre>

    /*
    <div class="branch-node" style="font-family: monospace">
      <Switch>
        <Match when={props.cursor.firstChild()}>
          <Indent depth={props.depth} step={props.indent}/>{cursorType()}: {cursorText()}
          {recurse(+1)}
        </Match>
        <Match when={true}>
          <Indent depth={props.depth} step={props.indent}/>{cursorType()}: {cursorText()}
          <Switch>
            <Match when={props.cursor.nextSibling()}>
              {recurse()}
            </Match>
            <Match when={props.cursor.parent() && props.cursor.nextSibling()}>
              {recurse(-1)}
            </Match>
          </Switch>
        </Match>
    */

  /*
  let depth = 0;
  const iterChildren = function* () {
    yield "a";
    yield "b";
    yield "c";
  }
  */
  /*
  return (
    <For each={iterChildren()}>
      {child => {
        return <div>{child()}</div>;
      }}
    </For>
  );
  return (
    <Index each={iterChildren()}>
      {child => {
        return <div>{child()}</div>;
      }}
    </Index>
  );
  */
  return (
    <TreeViewLezerParser
      cursor={getCursor()}
      source={props.editorState.doc.sliceString(0, props.editorState.doc.length)}
      depth={0}
      indent={1}
    />
  );
}

function Indent(props) {
  return <span class="indent"><For each={Array.from({ length: props.step * props.depth })}>{() => <span>&nbsp;</span>}</For></span>
}

