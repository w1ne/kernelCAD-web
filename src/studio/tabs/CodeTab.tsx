import { useCallback, useEffect, useRef } from 'react';
import type { JSX } from 'react';
import MonacoEditor from '@monaco-editor/react';
import type { CompilerDiagnostic } from '../../diagnostics/diagnostic';
import type { FeatureRecord } from '../../intent/featureRecord';
import type { EditorLike } from '../../types/editor';
import { useRecomputeResult } from '../hooks/useRecomputeResult';
import { useFeatureSelection } from '../hooks/useFeatureSelection';
import { useWorkbench } from '../../context/WorkbenchContext';

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
        readonly MarkerSeverity: {
            readonly Hint: number;
            readonly Info: number;
            readonly Warning: number;
            readonly Error: number;
        };
    };
}

const MARKER_OWNER = 'kernelcad-studio';

function diagnosticToMarker(
    d: CompilerDiagnostic,
    monaco: MonacoNamespaceLike,
): MonacoMarkerLike | null {
    const loc = d.scriptLocation;
    if (!loc) return null;
    const line = Math.max(1, loc.line);
    const column = Math.max(1, loc.column);
    const sev =
        d.severity === 'error'
            ? monaco.editor.MarkerSeverity.Error
            : d.severity === 'warn'
                ? monaco.editor.MarkerSeverity.Warning
                : monaco.editor.MarkerSeverity.Info;
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
    const { features, diagnostics } = useRecomputeResult();
    const { selectedFeatureId } = useFeatureSelection();

    const editorRef = useRef<EditorLike | null>(null);
    const monacoRef = useRef<MonacoNamespaceLike | null>(null);
    const userDrivenRef = useRef<boolean>(false);

    const handleMount = useCallback((editor: unknown, monaco: unknown) => {
        editorRef.current = editor as EditorLike;
        monacoRef.current = monaco as MonacoNamespaceLike;

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
    }, []);

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
            if (typeof next === 'string') workbench.setCode?.(next);
        },
        [workbench],
    );

    return (
        <div className="w-full h-full bg-[#111] text-gray-300" data-testid="code-tab">
            <MonacoEditor
                height="100%"
                defaultLanguage="typescript"
                theme="vs-dark"
                value={workbench.code ?? ''}
                onChange={handleChange}
                onMount={handleMount}
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    padding: { top: 16 },
                }}
            />
        </div>
    );
}

export default CodeTab;
