import { onCleanup, onMount, on, createEffect } from "solid-js";
import { EditorView } from "@codemirror/view";
import { Compartment, EditorState, StateEffect, } from "@codemirror/state";
/**
 * Creates a CodeMirror editor view instance (the editor's user interface).
 * @param props See {@link CodeMirrorProps} for details.
 * @param ref the element to attach the editor to on creation.
 */
export function createCodeMirror(props, ref) {
    let view;
    onMount(() => {
        const state = EditorState.create({
            doc: props.value,
        });

        // FIXME parser is not ready
        props.onEditorState?.(state);

        // workaround for "dispatch is called FOUR times on every change"
        // no
        //state.__lastTransactionTime = 0;

        const debugDispatch = false

        // Construct a new EditorView instance
        view = new EditorView({
            state,
            parent: ref(),
            dispatch: (tr) => {
                if (!view)
                    return;
                view.update([tr]);
                //console.log(`EditorView.dispatch: tr:`, tr) // noisy
                // optimization: avoid calling tr.newDoc.sliceString
                // https://github.com/nimeshnayaju/solid-codemirror/pull/7
                /*
                if (tr.docChanged) {
                    const newCode = tr.newDoc.sliceString(0, tr.newDoc.length);
                    props.onValueChange?.(newCode);
                }
                */
                if (tr.docChanged && props.onValueChange) {
                    const newCode = tr.newDoc.sliceString(0, tr.newDoc.length);
                    props.onValueChange(newCode);
                }
                // add prop onEditorStateChange
                // https://github.com/nimeshnayaju/solid-codemirror/pull/8
                if (!tr.docChanged) {
                    return;
                }

                // FIXME dispatch is called FOUR times on every change
                console.log(`createCodeMirror.dispatch`, Date.now())

                /* no
                if (tr.__seen) {
                    return;
                }
                tr.__seen = true;
                */

                /* no
                const sinceLastTransaction = Date.now() - state.__lastTransactionTime;
                console.log(`createCodeMirror.dispatch: lastTransactionTime`, state.__lastTransactionTime);
                console.log(`createCodeMirror.dispatch: sinceLastTransaction`, sinceLastTransaction);

                if (sinceLastTransaction < 1000) return;

                state.__lastTransactionTime = Date.now();
                */

                // blame codemirror plugins?

                debugDispatch && console.log(`createCodeMirror.dispatch: tr`, tr);
                //console.log(`createCodeMirror.dispatch: tr.changes`, tr.changes);
                if (props.onEditorStateChange) {
                    const newEditorState = tr.state; // call: get state
                    props.onEditorStateChange(newEditorState);
                    if (props.onValueChange) {
                        const newCode = newEditorState.doc.sliceString(0, newEditorState.doc.length);
                        props.onValueChange(newCode);
                    }
                }
                else {
                    if (props.onValueChange) {
                        const newDoc = tr.newDoc; // call: get doc
                        const newCode = newDoc.sliceString(0, newDoc.length);
                        props.onValueChange(newCode);
                    }
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
    createEffect(on(() => props.value, (value) => {
        console.log(`createCodeMirror: createEffect on props.value: value = ${value}`)
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
    /**
     * Creates a compartment instance with the given extension and appends it to the top-level configuration of the editor.
     * See {@link https://codemirror.net/examples/config/| CodeMirror Configuration} and {@link https://codemirror.net/docs/ref/#state.Compartment| Compartment} for details on editor configuration.
     * @param extension the extension to append
     */
    function createExtension(extension) {
        const compartment = new Compartment();
        onMount(() => {
            if (!view)
                return;
            view.dispatch({
                effects: StateEffect.appendConfig.of(compartment.of(extension)),
            });
        });
        /**
         * Reconfigures the extension compartment with the given extension.
         * @param extension the extension to reconfigure the extension compartment with.
         */
        function reconfigure(extension) {
            if (!view)
                return;
            view.dispatch({
                effects: compartment.reconfigure(extension),
            });
        }
        return reconfigure;
    }
    return { createExtension };
}
