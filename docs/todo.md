# nix-eval-js/doc/todo

## implement global functions and objects

as reporeted by `nix repl` when hitting `Tab` key

### done

* builtins.true
* builtins.false
* builtins.null

### started

* builtins.import

### todo

builtins = primop builtins + extra builtins

primop builtins:

```
builtins.add
builtins.addErrorContext
builtins.all
builtins.any
...
```

[nix-builtins-primops.txt](nix-builtins-primops.txt)

extra builtins:

```
...
builtins.abort
builtins.baseNameOf
builtins.builtins
builtins.derivation
```

[nix-builtins-extra.txt](nix-builtins-extra.txt)

primops

```
__add
__addErrorContext
__all
__any
...
```

[nix-primops.txt](nix-primops.txt)

## avoid recursion

implement tail call?

## parser throws on long input

limitation of lezer-parser?

&rarr; use incremental parser interface?

https://lezer.codemirror.net/docs/ref/#common.Incremental_Parsing

https://lezer.codemirror.net/docs/ref/#common.Parser.startParse

> `fragments` can be passed in to make the parse incremental.

> By default, the entire input is parsed.

> You can pass ranges, which should be a sorted array of non-empty, non-overlapping ranges, to parse only those ranges. The tree returned in that case will start at `ranges[0].from`.

https://lezer.codemirror.net/docs/ref/#common.PartialParse.advance



```
$ # 3389 ! + true
$ ./bin/nix-eval "$(dd if=/dev/zero bs=1 count=3389 status=none | tr '\0' '!')true"
false

# 3389 ! + space + true
$ ./bin/nix-eval "$(dd if=/dev/zero bs=1 count=3389 status=none | tr '\0' '!') true"
false

# 3389 ! + space + space + true
$ ./bin/nix-eval "$(dd if=/dev/zero bs=1 count=3389 status=none | tr '\0' '!')  true"
Error: tree is empty

# 3390 !
$ ./bin/nix-eval "$(dd if=/dev/zero bs=1 count=3390 status=none | tr '\0' '!')true"
Error: tree is empty
```

## github pages takes forever to upload

todo: upload only when demo/dist/ was changed

## patching the lezer-parser runtime @lezer/lr

### traces

from where is this called?

```js
    work(until, upto) {
        // from where is this called
        console.log(`@codemirror/language ParseContext.work: call stack:`, new Error())
```js

```
@codemirror/language ParseContext.work: call stack: Error

// node_modules/@codemirror/language/dist/index.js
at ParseContext.work (index.js:312:70)
at init (index.js:523:25)

// node_modules/@codemirror/state/dist/index.js
at StateField.create (index.js:1781:83)
at Object.reconfigure (index.js:1806:42)
at EditorState.computeSlot (index.js:2621:142)
at ensureAddr (index.js:2031:25)
at new EditorState (index.js:2564:13)
at EditorState.applyTransaction (index.js:2621:37)
at get state [as state] (index.js:2278:29)

// node_modules/.pnpm/@codemirror+view@6.2.3/node_modules/@codemirror/view/dist/index.js
at EditorView.update (index.js:6192:24)
```

#### advance

nix-eval-js/demo/src/codemirror-lang-nix/node_modules/@lezer/lr/dist/index.js

```js
    /// Move the stream forward N (defaults to 1) code units. Returns
    /// the new value of [`next`](#lr.InputStream.next).
    advance(n = 1) {
        this.chunkOff += n;
        while (this.pos + n >= this.range.to) {
            if (this.rangeIndex == this.ranges.length - 1)
                return this.setDone();
            n -= this.range.to - this.pos;
            this.range = this.ranges[++this.rangeIndex];
            this.pos = this.range.from;
        }
        this.pos += n;
        if (this.pos >= this.token.lookAhead)
            this.token.lookAhead = this.pos + 1;
        return this.readNext();
    }
```

#### work

advance is called from work

```
// node_modules/@codemirror/language/dist/index.js
TODO advance
at ParseContext.work (index.js:312:70)
```

nix-eval-js/demo/node_modules/@codemirror/language/dist/index.js

```js
    /**
    @internal
    */
    work(until, upto) {
        if (upto != null && upto >= this.state.doc.length)
            upto = undefined;
        if (this.tree != Tree.empty && this.isDone(upto !== null && upto !== void 0 ? upto : this.state.doc.length)) {
            this.takeTree();
            return true;
        }
        return this.withContext(() => {
            var _a;
            if (typeof until == "number") {
                let endTime = Date.now() + until;
                until = () => Date.now() > endTime;
            }
            if (!this.parse)
                this.parse = this.startParse();
            if (upto != null && (this.parse.stoppedAt == null || this.parse.stoppedAt > upto) &&
                upto < this.state.doc.length)
                this.parse.stopAt(upto);
            for (;;) {

                /// TODO? translate from parse tree to eval tree
                /// TODO patch the advance method, to get single tokens
                /// not a lists of tokens as in (done)
                // no ... advance loops characters, not token
                // TODO where are tokens yielded?
                // TODO where is the actual parse tree?
                // where can we add our eval tree?

                let done = this.parse.advance();
                if (done) {

                    this.fragments = this.withoutTempSkipped(TreeFragment.addTree(done, this.fragments, this.parse.stoppedAt != null));
                    this.treeLen = (_a = this.parse.stoppedAt) !== null && _a !== void 0 ? _a : this.state.doc.length;

                    // TODO? callback onTree
                    this.tree = done;

                    this.parse = null;
                    if (this.treeLen < (upto !== null && upto !== void 0 ? upto : this.state.doc.length))
                        this.parse = this.startParse();
                    else
                        return true;
                }
                if (until())
                    return false; // -> LanguageState.init: parseState.takeTree();
            }
        });
    }
```

#### LanguageState.init

work is called from LanguageState.init

```
// node_modules/@codemirror/language/dist/index.js
at ParseContext.work (index.js:312:70)
at init (index.js:523:25)
```

node_modules/@codemirror/language/dist/index.js

```js
class LanguageState {
    static init(state) {
        let vpTo = Math.min(3000 /* InitViewport */, state.doc.length);
        let parseState = ParseContext.create(state.facet(language).parser, state, { from: 0, to: vpTo });
        if (!parseState.work(20 /* Apply */, vpTo))
            parseState.takeTree();
        return new LanguageState(parseState);
    }
}
```

#### StateField.create

LanguageState.init is called from StateField.create

```
// node_modules/@codemirror/language/dist/index.js
at init (index.js:523:25)

// node_modules/@codemirror/state/dist/index.js
at StateField.create (index.js:1781:83)
```

```js
class StateField {
    create(state) {
        let init = state.facet(initField).find(i => i.field == this);
        // return LanguageState.init(state)
        return ((init === null || init === void 0 ? void 0 : init.create) || this.createF)(state);
    }
}
```

#### Object.reconfigure

StateField.create is called from Object.reconfigure:

```js
state.values[idx] = this.create(state);
```

// node_modules/@codemirror/state/dist/index.js
at StateField.create (index.js:1781:83)
at Object.reconfigure (index.js:1806:42)

```js
class StateField {
    constructor(
    /**
    @internal
    */
    id, createF, updateF, compareF, 
    /**
    @internal
    */
    spec) {
        this.id = id;
        this.createF = createF;
        this.updateF = updateF;
        this.compareF = compareF;
        this.spec = spec;
        /**
        @internal
        */
        this.provides = undefined;
    }
    /**
    Define a state field.
    */
    static define(config) {
        let field = new StateField(nextID++, config.create, config.update, config.compare || ((a, b) => a === b), config);
        if (config.provide)
            field.provides = config.provide(field);
        return field;
    }
    create(state) {
        let init = state.facet(initField).find(i => i.field == this);
        return ((init === null || init === void 0 ? void 0 : init.create) || this.createF)(state);
    }
    /**
    @internal
    */
    slot(addresses) {
        let idx = addresses[this.id] >> 1;
        return {
            create: (state) => {
                state.values[idx] = this.create(state);
                return 1 /* Changed */;
            },
            update: (state, tr) => {
                let oldVal = state.values[idx];
                let value = this.updateF(oldVal, tr);
                if (this.compareF(oldVal, value))
                    return 0;
                state.values[idx] = value;
                return 1 /* Changed */;
            },
            reconfigure: (state, oldState) => {
                if (oldState.config.address[this.id] != null) {
                    state.values[idx] = oldState.field(this);
                    return 0;
                }
                state.values[idx] = this.create(state);
                return 1 /* Changed */;
            }
        };
    }
```

#### EditorState.computeSlot

// node_modules/@codemirror/state/dist/index.js
at Object.reconfigure (index.js:1806:42)
at EditorState.computeSlot (index.js:2621:142)

TODO

#### ensureAddr

```
// node_modules/@codemirror/state/dist/index.js
at EditorState.computeSlot (index.js:2621:142)
at ensureAddr (index.js:2031:25)
```

TODO

#### EditorState.constructor

ensureAddr is called from EditorState.constructor (new EditorState)

```
// node_modules/@codemirror/state/dist/index.js
at ensureAddr (index.js:2031:25)
at new EditorState (index.js:2564:13)
```

```js
class EditorState {
    constructor(
    /**
    @internal
    */
    config, 
    /**
    The current document.
    */
    doc, 
    /**
    The current selection.
    */
    selection, 
    /**
    @internal
    */
    values, computeSlot, tr) {
        this.config = config;
        this.doc = doc;
        this.selection = selection;
        this.values = values;
        this.status = config.statusTemplate.slice();
        this.computeSlot = computeSlot;
        // Fill in the computed state immediately, so that further queries
        // for it made during the update return this state
        if (tr)
            tr._state = this;
        for (let i = 0; i < this.config.dynamicSlots.length; i++)
            ensureAddr(this, i << 1);
        this.computeSlot = null;
    }
}
```

#### EditorState.applyTransaction

EditorState.constructor (new EditorState) is called from EditorState.applyTransaction

```
// node_modules/@codemirror/state/dist/index.js
at new EditorState (index.js:2564:13)
at EditorState.applyTransaction (index.js:2621:37)
```

```js
class EditorState {
    applyTransaction(tr) {
        let conf = this.config, { base, compartments } = conf;
        for (let effect of tr.effects) {
            if (effect.is(Compartment.reconfigure)) {
                if (conf) {
                    compartments = new Map;
                    conf.compartments.forEach((val, key) => compartments.set(key, val));
                    conf = null;
                }
                compartments.set(effect.value.compartment, effect.value.extension);
            }
            else if (effect.is(StateEffect.reconfigure)) {
                conf = null;
                base = effect.value;
            }
            else if (effect.is(StateEffect.appendConfig)) {
                conf = null;
                base = asArray(base).concat(effect.value);
            }
        }
        let startValues;
        if (!conf) {
            conf = Configuration.resolve(base, compartments, this);
            let intermediateState = new EditorState(conf, this.doc, this.selection, conf.dynamicSlots.map(() => null), (state, slot) => slot.reconfigure(state, this), null);
            startValues = intermediateState.values;
        }
        else {
            startValues = tr.startState.values.slice();
        }
        new EditorState(conf, tr.newDoc, tr.newSelection, startValues, (state, slot) => slot.update(state, tr), tr);
    }
}
```

#### Transaction.state

EditorState.applyTransaction is called from `get state`

```
// node_modules/@codemirror/state/dist/index.js
at EditorState.applyTransaction (index.js:2621:37)
at get state [as state] (index.js:2278:29)
```

```js
class Transaction {
    get state() {
        if (!this._state)
            this.startState.applyTransaction(this);
        return this._state;
    }
}
```

#### EditorView.update

`get state` (tr.state) is called from EditorView.update

```
// node_modules/@codemirror/state/dist/index.js
at get state [as state] (index.js:2278:29)

// node_modules/.pnpm/@codemirror+view@6.2.3/node_modules/@codemirror/view/dist/index.js
at EditorView.update (index.js:6192:24)
```

```js
class EditorView {
    update(transactions) {
        if (this.updateState != 0 /* UpdateState.Idle */)
            throw new Error("Calls to EditorView.update are not allowed while an update is in progress");
        let redrawn = false, attrsChanged = false, update;
        let state = this.state;
        for (let tr of transactions) {
            if (tr.startState != state)
                throw new RangeError("Trying to update state with a transaction that doesn't start from the previous state.");
            state = tr.state;
        }
        if (this.destroyed) {
            this.viewState.state = state;
            return;
        }
        this.observer.clear();
        // When the phrases change, redraw the editor
        if (state.facet(EditorState.phrases) != this.state.facet(EditorState.phrases))
            return this.setState(state);
        update = ViewUpdate.create(this, state, transactions);
        let scrollTarget = this.viewState.scrollTarget;
        try {
            this.updateState = 2 /* UpdateState.Updating */;
            for (let tr of transactions) {
                if (scrollTarget)
                    scrollTarget = scrollTarget.map(tr.changes);
                if (tr.scrollIntoView) {
                    let { main } = tr.state.selection;
                    scrollTarget = new ScrollTarget(main.empty ? main : EditorSelection.cursor(main.head, main.head > main.anchor ? -1 : 1));
                }
                for (let e of tr.effects)
                    if (e.is(scrollIntoView))
                        scrollTarget = e.value;
            }
            this.viewState.update(update, scrollTarget);
            this.bidiCache = CachedOrder.update(this.bidiCache, update.changes);
            if (!update.empty) {
                this.updatePlugins(update);
                this.inputState.update(update);
            }
            redrawn = this.docView.update(update);
            if (this.state.facet(styleModule) != this.styleModules)
                this.mountStyles();
            attrsChanged = this.updateAttrs();
            this.showAnnouncements(transactions);
            this.docView.updateSelection(redrawn, transactions.some(tr => tr.isUserEvent("select.pointer")));
        }
        finally {
            this.updateState = 0 /* UpdateState.Idle */;
        }
        if (update.startState.facet(theme) != update.state.facet(theme))
            this.viewState.mustMeasureContent = true;
        if (redrawn || attrsChanged || scrollTarget || this.viewState.mustEnforceCursorAssoc || this.viewState.mustMeasureContent)
            this.requestMeasure();
        if (!update.empty)
            for (let listener of this.state.facet(updateListener))
                listener(update);
    }
}
```

### BufferNode

nodes in the parse tree are BufferNode

/home/user/src/milahu/nix-eval-js/demo/node_modules/.pnpm/@lezer+common@1.0.1/node_modules/@lezer/common/dist/index.js

```js
class BufferNode {
    constructor(context, _parent, index) {
        this.context = context;
        this._parent = _parent;
        this.index = index;
        this.type = context.buffer.set.types[context.buffer.buffer[index]];)
    }
    get name() { return this.type.name; }
    get from() { return this.context.start + this.context.buffer.buffer[this.index + 1]; }
    get to() { return this.context.start + this.context.buffer.buffer[this.index + 2]; }
    child(dir, pos, side) {
        let { buffer } = this.context;
        let index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], dir, pos - this.context.start, side);
        return index < 0 ? null : new BufferNode(this.context, this, index);
    }
    get firstChild() { return this.child(1, 0, 4 /* DontCare */); }
    get lastChild() { return this.child(-1, 0, 4 /* DontCare */); }
    childAfter(pos) { return this.child(1, pos, 2 /* After */); }
    childBefore(pos) { return this.child(-1, pos, -2 /* Before */); }
    enter(pos, side, mode = 0) {
        if (mode & IterMode.ExcludeBuffers)
            return null;
        let { buffer } = this.context;
        let index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], side > 0 ? 1 : -1, pos - this.context.start, side);
        return index < 0 ? null : new BufferNode(this.context, this, index);
    }
    get parent() {
        return this._parent || this.context.parent.nextSignificantParent();
    }
    externalSibling(dir) {
        return this._parent ? null : this.context.parent.nextChild(this.context.index + dir, dir, 0, 4 /* DontCare */);
    }
    get nextSibling() {
        let { buffer } = this.context;
        let after = buffer.buffer[this.index + 3];
        if (after < (this._parent ? buffer.buffer[this._parent.index + 3] : buffer.buffer.length))
            return new BufferNode(this.context, this._parent, after);
        return this.externalSibling(1);
    }
    get prevSibling() {
        let { buffer } = this.context;
        let parentStart = this._parent ? this._parent.index + 4 : 0;
        if (this.index == parentStart)
            return this.externalSibling(-1);
        return new BufferNode(this.context, this._parent, buffer.findChild(parentStart, this.index, -1, 0, 4 /* DontCare */));
    }
    cursor(mode = 0) { return new TreeCursor(this, mode); }
    get tree() { return null; }
    toTree() {
        let children = [], positions = [];
        let { buffer } = this.context;
        let startI = this.index + 4, endI = buffer.buffer[this.index + 3];
        if (endI > startI) {
            let from = buffer.buffer[this.index + 1], to = buffer.buffer[this.index + 2];
            children.push(buffer.slice(startI, endI, from, to));
            positions.push(0);
        }
        return new Tree(this.type, children, positions, this.to - this.from);
    }
    resolve(pos, side = 0) {
        return resolveNode(this, pos, side, false);
    }
    resolveInner(pos, side = 0) {
        return resolveNode(this, pos, side, true);
    }
    enterUnfinishedNodesBefore(pos) { return enterUnfinishedNodesBefore(this, pos); }
    /// @internal
    toString() { return this.context.buffer.childString(this.index); }
    getChild(type, before = null, after = null) {
        let r = getChildren(this, type, before, after);
        return r.length ? r[0] : null;
    }
    getChildren(type, before = null, after = null) {
        return getChildren(this, type, before, after);
    }
    get node() { return this; }
    matchContext(context) { return matchNodeContext(this, context); }
}
```

#### patching BufferNode

node_modules/@lezer/common/dist/index.js

```js
class BufferNode {
    constructor(context, _parent, index) {
        this.context = context;
        this._parent = _parent;
        this.index = index;
        this.type = context.buffer.set.types[context.buffer.buffer[index]];
    }

    // TODO move to type object in context.buffer.set.types[typeId]

    // milahu
    get thunk() {
        return (this._thunk || (this.setThunk(), this._thunk));
    }
    get text() {
        // FIXME get source code of this node
        return '1';
    }
    set thunk(_thunk) {
        this._thunk = _thunk;
    }
    setThunk() {
        // all node types must be mapped
        const node = this;
        const _setThunk = setThunkOfNodeType[node.type.name];
        if (_setThunk) {
            //console.log(`setThunk for token ${node.type}`);
            _setThunk(node);
        }
        else if (_setThunk === undefined) {
            throw new NixEvalNotImplemented(`setThunk is empty for token ${node.type.name}`);
        }
        // else???
    }

    get name() { return this.type.name; }
}
```

```js
this.type = context.buffer.set.types[context.buffer.buffer[index]];
```

where does types come from

src/codemirror-lang-nix/src/lezer-parser-nix/dist/index.js

```js
const parser = LRParser.deserialize({
  version: 14,
  states: "KhQ]QSOOO/UQWO'#DZO/...",
  stateData: "#K`~O!rOSROSSOS~OVPO!Y...",
  goto: "Lz%sPPPPPP%tP%t&t'W'W%t%t%t%t%t'd'o(U'o'd'd(Y)Y)Y)Y)...",
  maxTerm: 222,
  skippedNodes: [0,3,4],
  repeatNodeCount: 7,
  tokenData: "!EQ~RyX^#rpq#rqr$grs$tst$ytu%Uvw%awx%lxy%wyz%|z...",
  tokenizers: [string, indentedString, 0, 1, 2, 3, 4],
  topRules: {"Nix":[0,5]},
  specialized: [{term: 7, get: value => spec_Identifier[value] || -1}],
  tokenPrec: 6178
});
```

node_modules/.pnpm/@lezer+lr@1.2.3/node_modules/@lezer/lr/dist/index.js

```js
class LRParser extends Parser {
    static deserialize(spec) {
        return new LRParser(spec);
    }
}
```

```js
class LRParser extends Parser {
    /// @internal
    constructor(spec) {
        super();
        /// @internal
        this.wrappers = [];
        if (spec.version != 14 /* Version */)
            throw new RangeError(`Parser version (${spec.version}) doesn't match runtime version (${14 /* Version */})`);
        let nodeNames = spec.nodeNames.split(" ");
        this.minRepeatTerm = nodeNames.length;
        for (let i = 0; i < spec.repeatNodeCount; i++)
            nodeNames.push("");
        let topTerms = Object.keys(spec.topRules).map(r => spec.topRules[r][1]);
        let nodeProps = [];
        for (let i = 0; i < nodeNames.length; i++)
            nodeProps.push([]);
        function setProp(nodeID, prop, value) {
            nodeProps[nodeID].push([prop, prop.deserialize(String(value))]);
        }
        if (spec.nodeProps)
            for (let propSpec of spec.nodeProps) {
                let prop = propSpec[0];
                if (typeof prop == "string")
                    prop = NodeProp[prop];
                for (let i = 1; i < propSpec.length;) {
                    let next = propSpec[i++];
                    if (next >= 0) {
                        setProp(next, prop, propSpec[i++]);
                    }
                    else {
                        let value = propSpec[i + -next];
                        for (let j = -next; j > 0; j--)
                            setProp(propSpec[i++], prop, value);
                        i++;
                    }
                }
            }
        this.nodeSet = new NodeSet(nodeNames.map((name, i) => NodeType.define({
            name: i >= this.minRepeatTerm ? undefined : name,
            id: i,
            props: nodeProps[i],
            top: topTerms.indexOf(i) > -1,
            error: i == 0,
            skipped: spec.skippedNodes && spec.skippedNodes.indexOf(i) > -1
        })));
        if (spec.propSources)
            this.nodeSet = this.nodeSet.extend(...spec.propSources);
        this.strict = false;
        this.bufferLength = DefaultBufferLength;
        let tokenArray = decodeArray(spec.tokenData);
        this.context = spec.context;
        this.specializerSpecs = spec.specialized || [];
        this.specialized = new Uint16Array(this.specializerSpecs.length);
        for (let i = 0; i < this.specializerSpecs.length; i++)
            this.specialized[i] = this.specializerSpecs[i].term;
        this.specializers = this.specializerSpecs.map(getSpecializer);
        this.states = decodeArray(spec.states, Uint32Array);
        this.data = decodeArray(spec.stateData);
        this.goto = decodeArray(spec.goto);
        this.maxTerm = spec.maxTerm;
        this.tokenizers = spec.tokenizers.map(value => typeof value == "number" ? new TokenGroup(tokenArray, value) : value);
        this.topRules = spec.topRules;
        this.dialects = spec.dialects || {};
        this.dynamicPrecedences = spec.dynamicPrecedences || null;
        this.tokenPrecTable = spec.tokenPrec;
        this.termNames = spec.termNames || null;
        this.maxNode = this.nodeSet.types.length - 1;
        this.dialect = this.parseDialect();
        this.top = this.topRules[Object.keys(this.topRules)[0]];
    }
}
```

types?

```js
class LRParser extends Parser {
    /// @internal
    constructor(spec) {

        this.maxNode = this.nodeSet.types.length - 1;

    }
}
```

nodeSet?

```js
class LRParser extends Parser {
    /// @internal
    constructor(spec) {

        this.nodeSet = new NodeSet(nodeNames.map((name, i) => NodeType.define({
            name: i >= this.minRepeatTerm ? undefined : name,
            id: i,
            props: nodeProps[i],
            top: topTerms.indexOf(i) > -1,
            error: i == 0,
            skipped: spec.skippedNodes && spec.skippedNodes.indexOf(i) > -1
        })));

    }
}
```

node_modules/@lezer/common/dist/index.js

```js
class NodeSet {
    /// Create a set with the given types. The `id` property of each
    /// type should correspond to its position within the array.
    constructor(
    /// The node types in this set, by id.
    types) {
        this.types = types;
        for (let i = 0; i < types.length; i++)
            if (types[i].id != i)
                throw new RangeError("Node type ids should correspond to array positions when creating a node set");
    }
}
```

use `spec.nodeProps` instead of `types`?

\- no. the parser should only parse.

separate parser and interpreter (semantic stage + evaluation).

https://lezer.codemirror.net/docs/guide/#node-props

<blockquote>

You can also import custom props using syntax like this:

```lezer
@external prop myProp from "./props"

SomeRule[myProp=somevalue] { "ok" }
```

</blockquote>

todo: from codemirror view or state,
load lezer-parser-nix or codemirror-lang-nix,
then patch LRParser.nodeSet.types to add getThunk functions

TODO where can we store data/context/cache?

nix-eval-js/demo/src/codemirror.jsx

```js
// nix-eval-js/src/nix-thunks.js
import { setThunkOfNodeType } from '../../src/nix-thunks.js';

    const { createExtension } = createCodeMirror({
      //onValueChange: (newValue) => null,
      onEditorMount: props.onCodeMirror,
      onValueChange: props.onValueChange,
      //value: props.value,
      value: props.value,
      //value: (() => props.value)(),
    }, () => ref);

    const basicSetupSolid = {
      codemirrorLangNix: codemirrorLangNix(),
    };

    for (const [extensionName, extension] of Object.entries(basicSetupSolid)) {
      const reconfigureExtension = createExtension(extension);
      codeMirrorExtensions[extensionName] = {
        extension,
        reconfigure: reconfigureExtension,
      };
    }

    const parser = codeMirrorExtensions.codemirrorLangNix.extension.language.parser;
    for (const nodeType of parser.nodeSet.types) {
      nodeType.setThunk = setThunkOfNodeType[nodeType.name];
    }

```

todo: hook/callback after state update

-> call eval on the new tree

https://codemirror.net/docs/ref/#state.EditorState

https://codemirror.net/docs/ref/#h_changes_and_transactions

```js
let state = EditorState.create({doc: "hello world"})
let transaction = state.update({changes: {from: 6, to: 11, insert: "editor"}})
console.log(transaction.state.doc.toString()) // "hello editor"
```

where is the update event?

new code is passed to onValueChange

nix-eval-js/demo/src/codemirror.jsx

```js
import { createCodeMirror } from "@solid-codemirror/core";
```

node_modules/@solid-codemirror/core/dist/index/createCodeMirror.js

```js
export function createCodeMirror(props, ref) {
    let view;
    onMount(() => {
        const state = EditorState.create({
            doc: props.value,
        });
        // Construct a new EditorView instance
        view = new EditorView({
            state,
            parent: ref(),
            dispatch: (tr) => { // transaction
                if (!view)
                    return;
                view.update([tr]);
                if (tr.docChanged) {
                    const newCode = tr.newDoc.sliceString(0, tr.newDoc.length);
                    props.onValueChange?.(newCode);
                }
            },
        });
        props.onEditorMount?.(view);
        onCleanup(() => {
            if (!view)
                return;
            view.destroy();
        });
    });
```
