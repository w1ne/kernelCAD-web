// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useEffect, useRef } from 'react';
import type { JSX } from 'react';
import MonacoEditor from '@monaco-editor/react';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { EditorEdit, EditorLike } from '../../shared/types/editor';
import { useRecomputeResult } from '../hooks/useRecomputeResult';
import { useFeatureSelection } from '../hooks/useFeatureSelection';
import { useWorkbench } from '../context/WorkbenchContext';
import { currentStudioScript, devMeshAvailable } from '../scriptSource';
import { scriptCodeEditorIsReadOnly } from '../linkedScriptAutosave';
import { getFeatureSourceIndex } from '../selectionCode/featureSourceIndex';
import { attachCodeGeometrySync, type CodeGeometrySync, type SyncEditorLike } from '../selectionCode/codeGeometrySync';
import { selectionCodeStore } from '../selectionCode/selectionCodeStore';
import { markerSeverity, useKcadTypeCheck, type MonacoTypescriptHostLike } from './codeTabTypescript';

/**
 * Monaco-backed Code tab for the Studio shell.
 *
 * Three responsibilities:
 *   1. Render the current `.kcad.ts` source from `useWorkbench()`.
 *   2. Project `result.diagnostics` (CompilerDiagnostic[]) onto the active
 *      model as Monaco markers — one marker per diagnostic with a
 *      `scriptLocation`.
 *   3. When `selectedFeatureId` changes from the outside (Scene row,
 *      Drawer row, etc.), `revealLineInCenter(feature.scriptLocation.line)`
 *      so the editor scrolls to follow tri-pane sync. A "user-driven" ref
 *      gates the reveal so a click inside the Code tab doesn't fight a
 *      reveal back to itself.
 *   4. Selection ↔ code link (`selectionCode/codeGeometrySync`): a face or
 *      edge clicked in the viewer decorates the call that made it; a user
 *      cursor move or hover here tints the geometry that call made.
 *   5. TypeScript checking (`codeTabTypescript`): the script is checked as
 *      the function body the evaluator runs, with the kernel DSL as typed
 *      globals, so valid scripts show no false squiggles.
 *
 * Reveal is a soft binding: if the selection doesn't map to a feature with
 * a `scriptLocation`, no-op.
 */

interface MonacoMarkerLike {
    readonly startLineNumber: number;
    readonly startColumn: number;
    readonly endLineNumber: number;
    readonly endColumn: number;
    readonly message: string;
    readonly severity: number;
    readonly code: string;
}

interface MonacoNamespaceLike {
    editor: {
        setModelMarkers: (model: unknown, owner: string, markers: readonly MonacoMarkerLike[]) => void;
    };
}

const MARKER_OWNER = 'kernelcad-studio';

/** The Monaco surface the source sync below needs. */
interface SourceEditorLike {
    getValue(): string;
    getModel(): { getFullModelRange(): EditorEdit['range'] } | null;
    executeEdits(source: string, edits: EditorEdit[]): void;
    pushUndoStop(): void;
}

/**
 * Put `code` into the editor unless it is the echo of the editor's own
 * typing. `pending` holds the values the editor emitted that the workbench
 * has not echoed back yet. The echo can arrive after further keystrokes,
 * so it may be older than the editor text; writing it back would drop
 * those keystrokes.
 */
function applyWorkbenchCode(editor: SourceEditorLike, code: string, pending: string[]): void {
    const echoAt = pending.indexOf(code);
    if (echoAt !== -1) {
        pending.splice(0, echoAt + 1);
        return;
    }
    pending.length = 0;
    const model = editor.getModel();
    if (!model || editor.getValue() === code) return;
    editor.executeEdits('', [{ range: model.getFullModelRange(), text: code, forceMoveMarkers: true }]);
    editor.pushUndoStop();
}

function diagnosticToMarker(
    d: CompilerDiagnostic,
    monaco: MonacoNamespaceLike,
): MonacoMarkerLike | null {
    const loc = d.scriptLocation;
    if (!loc) return null;
    const line = Math.max(1, loc.line);
    const column = Math.max(1, loc.column);
    // Monaco exposes the severities as `monaco.MarkerSeverity`.
    const severity = markerSeverity(monaco as MonacoTypescriptHostLike);
    const sev =
        d.severity === 'error'
            ? severity.Error
            : d.severity === 'warn'
                ? severity.Warning
                : severity.Info;
    return {
        startLineNumber: line,
        startColumn: column,
        endLineNumber: line,
        endColumn: column + 1,
        message: d.message,
        severity: sev,
        code: d.code,
    };
}

function findFeatureById(
    features: readonly FeatureRecord[],
    id: string,
): FeatureRecord | undefined {
    for (const f of features) {
        if (f.id === id) return f;
        const meta = (f.metadata ?? {}) as {
            partName?: string;
            jointName?: string;
            mateName?: string;
        };
        if (meta.partName === id || meta.jointName === id || meta.mateName === id) {
            return f;
        }
    }
    return undefined;
}

export function CodeTab(): JSX.Element {
    const workbench = useWorkbench();
    const readOnlyScript = scriptCodeEditorIsReadOnly(currentStudioScript(), devMeshAvailable());
    const { features, diagnostics } = useRecomputeResult();
    const { selectedFeatureId } = useFeatureSelection();

    const editorRef = useRef<EditorLike | null>(null);
    const monacoRef = useRef<MonacoNamespaceLike | null>(null);
    const userDrivenRef = useRef<boolean>(false);
    const syncRef = useRef<CodeGeometrySync | null>(null);
    // Values typed in the editor that the workbench has not echoed back yet
    // (see `applyWorkbenchCode`).
    const pendingEchoesRef = useRef<string[]>([]);
    // Latest evaluation + source for the link index getter (read lazily, so
    // typing never rebuilds the index).
    const indexInputRef = useRef({ code: workbench.code ?? '', features });
    useEffect(() => {
        indexInputRef.current = { code: workbench.code ?? '', features };
    }, [workbench.code, features]);

    const { beforeMount: handleBeforeMount, attach: attachTypeCheck } = useKcadTypeCheck();

    const handleMount = useCallback((editor: unknown, monaco: unknown) => {
        editorRef.current = editor as EditorLike;
        monacoRef.current = monaco as MonacoNamespaceLike;
        // The workbench code can change between the first render and mount.
        applyWorkbenchCode(editor as SourceEditorLike, indexInputRef.current.code, pendingEchoesRef.current);
        syncRef.current?.dispose();
        syncRef.current = attachCodeGeometrySync(editor as SyncEditorLike, {
            store: selectionCodeStore,
            getIndex: () => getFeatureSourceIndex(indexInputRef.current.code, indexInputRef.current.features),
        });
        attachTypeCheck(editor, monaco);

        // Treat any click / keypress inside the editor as user-driven so a
        // selection update originating here does not loop back into a
        // self-reveal during the same React commit.
        const e = editor as {
            onDidChangeCursorSelection?: (cb: () => void) => { dispose: () => void };
            onMouseDown?: (cb: () => void) => { dispose: () => void };
        };
        e.onMouseDown?.(() => {
            userDrivenRef.current = true;
        });
    }, [attachTypeCheck]);

    useEffect(() => () => {
        syncRef.current?.dispose();
        syncRef.current = null;
    }, []);

    // Workbench code -> editor. The editor is uncontrolled (`defaultValue`):
    // a controlled `value` is written back after every render, and a render
    // that lags behind fast typing wrote an older text over newer keystrokes.
    useEffect(() => {
        const editor = editorRef.current as unknown as SourceEditorLike | null;
        if (!editor) return;
        applyWorkbenchCode(editor, workbench.code ?? '', pendingEchoesRef.current);
    }, [workbench.code]);

    // A re-evaluation can move feature call sites; re-apply the link.
    useEffect(() => {
        syncRef.current?.refresh();
    }, [features]);

    useEffect(() => {
        const editor = editorRef.current;
        const monaco = monacoRef.current;
        if (!editor || !monaco) return;
        const model = editor.getModel();
        if (!model) return;
        const markers: MonacoMarkerLike[] = [];
        for (const d of diagnostics) {
            const m = diagnosticToMarker(d, monaco);
            if (m) markers.push(m);
        }
        monaco.editor.setModelMarkers(model, MARKER_OWNER, markers);
    }, [diagnostics]);

    useEffect(() => {
        if (userDrivenRef.current) {
            userDrivenRef.current = false;
            return;
        }
        const editor = editorRef.current;
        if (!editor) return;
        if (selectedFeatureId === null) return;
        const feature = findFeatureById(features, selectedFeatureId);
        const loc = feature?.scriptLocation;
        if (!loc) return;
        editor.revealLineInCenter(loc.line);
    }, [selectedFeatureId, features]);

    const handleChange = useCallback(
        (next: string | undefined) => {
            if (typeof next !== 'string') return;
            pendingEchoesRef.current.push(next);
            workbench.setCode?.(next);
        },
        [workbench],
    );

    return (
        <div className="flex h-full w-full flex-col bg-[#111] text-gray-300" data-testid="code-tab">
            {readOnlyScript && (
                <p className="px-4 pt-3 text-xs text-fg-2" data-testid="code-tab-readonly">
                    This page follows the script file. Edits are not saved here.
                </p>
            )}
            <div className="min-h-0 flex-1">
                <MonacoEditor
                    height="100%"
                    defaultLanguage="typescript"
                    theme="vs-dark"
                    defaultValue={workbench.code ?? ''}
                    onChange={handleChange}
                    beforeMount={handleBeforeMount}
                    onMount={handleMount}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        padding: { top: 16 },
                        readOnly: readOnlyScript,
                    }}
                />
            </div>
        </div>
    );
}

export default CodeTab;
