import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CommandManager } from '../../authoring/commands/CommandManager';
import { defaultCode } from '../../shared/worker/geometryEngine';
import type { EditorLike } from '../../shared/types/editor';
import { CodeAnalyzer, type CodeGenerationContext } from '../../shared/codeGeneration/index';
import { deleteVariableDeclarationAST, deleteVariableDeclarationByLineFallback, deleteVariableDeclarationByNameAndLineAST, parseCode } from '../../shared/codeGeneration/ast';
import type { HistoryItem } from '../../shared/codeGeneration/codeAnalysis';
import { CodeMutationService, type CodeMutationDiagnostics, type CodeTransform } from '../../shared/codeGeneration/CodeMutationService';

export interface CodeContextType {
    code: string;
    setCode: (code: string) => void;
    mutateCode: (transform: CodeTransform, mutationName: string) => void;
    insertCode: (snippet: string | ((name: string) => string), baseName?: string) => void;
    editorInstance: EditorLike | null;
    setEditorInstance: (instance: EditorLike | null) => void;
    commandManager: CommandManager;
    codeContext: CodeGenerationContext;
    renameItem: (oldName: string, newName: string) => void;
    deleteItem: (name: string, lineHint?: number) => void;
    deleteHistoryItem: (item: HistoryItem) => void;
    applyCodeSafe: (code: string) => Promise<boolean>;
    getMutationDiagnostics: () => Readonly<CodeMutationDiagnostics>;
    resetMutationDiagnostics: () => void;
    /** True when Studio was mounted with a `controlledCode` prop (embed
     *  mode). Consumers like `App.tsx` use this to suppress the
     *  `?script=`/`?gallery=` URL-driven source load when the host has
     *  already provided the source. */
    hasControlledCode: boolean;
}

const CodeContext = createContext<CodeContextType | undefined>(undefined);

/** Controlled-mode props: when `controlledCode` is supplied, the provider
 *  treats the parent as the source of truth — local state still exists so
 *  the editor stays responsive during user input, but every mutation also
 *  fires `onCodeChange` (debounced) so the host can ingest the new source.
 *  Incoming `controlledCode` changes that differ from the last value Studio
 *  emitted overwrite local state, which is how an external author (e.g. the
 *  proto.cat agent producing a fresh `.kcad.ts`) drives Studio. */
const ON_CODE_CHANGE_DEBOUNCE_MS = 150;

export function CodeProvider({
    children,
    initialCode = defaultCode,
    controlledCode,
    onCodeChange,
}: {
    children: ReactNode;
    initialCode?: string;
    controlledCode?: string;
    onCodeChange?: (next: string) => void;
}) {
    const seedCode = controlledCode ?? initialCode;
    const [code, setRawCode] = useState<string>(seedCode);

    // Stable ref to the latest onCodeChange so the emit effect doesn't have
    // to re-subscribe when the host swaps callbacks.
    const onCodeChangeRef = useRef(onCodeChange);
    onCodeChangeRef.current = onCodeChange;
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // The last `code` value we either received from the host (via
    // controlledCode) or emitted to the host (via onCodeChange). Used to
    // suppress the echo loop: when controlledCode comes back equal to what
    // we just sent, the sync effect skips its setRawCode; and when a fresh
    // controlledCode arrives, we mark it as already-known so the emit
    // effect doesn't bounce it back to the host as if the user typed it.
    const lastEmittedRef = useRef<string>(seedCode);

    // Sync external `controlledCode` updates into local state. Skip when
    // the incoming value equals the last sync'd / emitted value — that
    // means the host is echoing our own change and we're already in sync.
    useEffect(() => {
        if (controlledCode === undefined) return;
        if (controlledCode === lastEmittedRef.current) return;
        lastEmittedRef.current = controlledCode;
        setRawCode(controlledCode);
    }, [controlledCode]);

    // Emit user-driven code changes (debounced) when in controlled mode.
    // Skips the initial render (code === seed === lastEmitted) and skips
    // host-driven changes (the sync effect bumps lastEmitted first).
    useEffect(() => {
        const cb = onCodeChangeRef.current;
        if (!cb) return;
        if (code === lastEmittedRef.current) return;
        if (debounceTimerRef.current !== null) clearTimeout(debounceTimerRef.current);
        const snapshot = code;
        debounceTimerRef.current = setTimeout(() => {
            lastEmittedRef.current = snapshot;
            cb(snapshot);
        }, ON_CODE_CHANGE_DEBOUNCE_MS);
        return () => {
            if (debounceTimerRef.current !== null) {
                clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = null;
            }
        };
    }, [code]);

    const [editorInstance, setEditorInstance] = useState<EditorLike | null>(null);
    const mutationService = useMemo(() => new CodeMutationService(setRawCode), []);

    // Initialize CommandManager once, then update its context provider as state changes.
    const [commandManager] = useState(() => new CommandManager(() => ({
        code: initialCode,
        setCode: (next) => mutationService.replace(next, 'commandManager.setCode')
    })));
    useEffect(() => {
        commandManager.setContextProvider(() => ({
            code,
            setCode: (next) => mutationService.replace(next, 'commandManager.setCode')
        }));
    }, [commandManager, code, mutationService]);

    const commitMutation = useCallback((mutate: CodeTransform, mutationName: string): void => {
        mutationService.apply(mutate, mutationName);
    }, [mutationService]);

    const mutateCode = useCallback((transform: CodeTransform, mutationName: string): void => {
        mutationService.apply(transform, mutationName);
    }, [mutationService]);

    const setCode = useCallback((nextCode: string): void => {
        setRawCode(nextCode);
    }, []);

    const insertCode = useCallback((snippet: string | ((name: string) => string), baseName?: string) => {
        commitMutation((prev) => {
            const resolvedSnippet = typeof snippet === 'function' ? snippet(baseName || 'shape') : snippet;
            const trimmed = prev.trimEnd();
            return trimmed + (trimmed ? '\n' : '') + resolvedSnippet;
        }, 'insertCode');
    }, [commitMutation]);

    // Generic Code Context for Features
    const codeContext = useMemo(() => {
        try {
            const analyzer = new CodeAnalyzer(code);
            return analyzer.createContext();
        } catch (e) {
            console.warn('CodeContext: Failed to analyze code (likely syntax error):', e);
            // Return a minimal context
            return {
                variables: [],
                getVariableAtIndex: () => 'shape',
                generateUniqueName: (prefix: string) => `${prefix}_fallback`
            } as unknown as CodeGenerationContext;
        }
    }, [code]);

    const renameItem = useCallback((oldName: string, newName: string) => {
        import('../../modeling/features/modeling/RefactoringManager').then(({ refactoringManager }) => {
            commitMutation((prev) => refactoringManager.renameVariable(prev, oldName, newName), 'renameItem');
        });
    }, [commitMutation]);

    const deleteItem = useCallback((name: string, lineHint?: number) => {
        commitMutation((prev) => {
            if (typeof lineHint === 'number') {
                const byIdentity = deleteVariableDeclarationByNameAndLineAST(prev, name, lineHint);
                parseCode(byIdentity);
                return byIdentity;
            }

            const byName = deleteVariableDeclarationAST(prev, name);
            parseCode(byName);
            return byName;
        }, 'deleteItem');
    }, [commitMutation]);

    const deleteHistoryItem = useCallback((item: HistoryItem) => {
        commitMutation((prev) => {
            try {
                const byIdentity = deleteVariableDeclarationByNameAndLineAST(prev, item.name, item.line);
                parseCode(byIdentity);
                return byIdentity;
            } catch {
                const recovered = deleteVariableDeclarationByLineFallback(prev, item.name, item.line);
                parseCode(recovered);
                return recovered;
            }
        }, 'deleteHistoryItem');
    }, [commitMutation]);

    const applyCodeSafe = useCallback(async (newCode: string): Promise<boolean> => {
        try {
            const { agentAPI } = await import('../../agent/api');
            const result = await agentAPI.evaluateCode(newCode);

            if (result.errors && result.errors.length > 0) {
                const msg = "AI Validation Failed:\n" + result.errors.join('\n');
                console.error(msg);
                alert(msg);
                return false;
            }

            setCode(newCode);
            return true;
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.error("Safety Check Error:", e);
            alert("Safety Check Error: " + message);
            return false;
        }
    }, [setCode]);

    const getMutationDiagnostics = useCallback(() => mutationService.getDiagnostics(), [mutationService]);
    const resetMutationDiagnostics = useCallback(() => mutationService.resetDiagnostics(), [mutationService]);

    // Magic Comment Detection
    useEffect(() => {
        const magicCommentRegex = /\/\/ @ai:(.+)(\n|$)/;
        const match = code.match(magicCommentRegex);

        if (match) {
            const fullMatch = match[0];
            const instruction = match[1].trim();
            const isFinished = fullMatch.endsWith('\n');

            if (isFinished && instruction) {
                const processingPlaceholder = `// @ai-processing: ${instruction}...\n`;
                const newCodeWithPlaceholder = code.replace(fullMatch, processingPlaceholder);
                mutationService.replace(newCodeWithPlaceholder, 'magicComment.processing');

                import('../features-ui/ai/LLMService').then(async ({ llmService }) => {
                    try {
                        const contextCode = code.replace(fullMatch, '');
                        const prompt = `Generate code for: "${instruction}". return ONLY the code.`;
                        const response = await llmService.sendMessage(
                            [{ role: 'user', content: prompt }],
                            { code: contextCode }
                        );
                        const cleanCode = response.replace(/```javascript/g, '').replace(/```/g, '').trim();
                        mutationService.apply(
                            (prev) => prev.replace(processingPlaceholder, cleanCode + '\n'),
                            'magicComment.success',
                        );
                    } catch (error) {
                        console.error("Magic Comment Error:", error);
                        mutationService.apply(
                            (prev) => prev.replace(processingPlaceholder, `// @ai-error: Failed to generate for "${instruction}"\n`),
                            'magicComment.failure',
                        );
                    }
                });
            }
        }
    }, [code, mutationService]);


    const hasControlledCode = controlledCode !== undefined;

    const value: CodeContextType = useMemo(() => ({
        code,
        setCode,
        mutateCode,
        insertCode,
        editorInstance,
        setEditorInstance,
        commandManager,
        codeContext,
        renameItem,
        deleteItem,
        deleteHistoryItem,
        applyCodeSafe,
        getMutationDiagnostics,
        resetMutationDiagnostics,
        hasControlledCode,
    }), [code, setCode, mutateCode, insertCode, editorInstance, commandManager, codeContext, renameItem, deleteItem, deleteHistoryItem, applyCodeSafe, getMutationDiagnostics, resetMutationDiagnostics, hasControlledCode]);

    return <CodeContext.Provider value={value}>{children}</CodeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCode() {
    const context = useContext(CodeContext);
    if (!context) {
        throw new Error("useCode must be used within a CodeProvider");
    }
    return context;
}

export { CodeContext };
