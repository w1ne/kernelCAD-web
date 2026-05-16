import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CommandManager } from '../commands/CommandManager';
import { defaultCode } from '../lib/geometryEngine';
import type { EditorLike } from '../shared/types/editor';
import { CodeAnalyzer, type CodeGenerationContext } from '../lib/codeGeneration';
import { deleteVariableDeclarationAST, deleteVariableDeclarationByLineFallback, deleteVariableDeclarationByNameAndLineAST, parseCode } from '../lib/ast';
import type { HistoryItem } from '../lib/codeAnalysis';
import { CodeMutationService, type CodeMutationDiagnostics, type CodeTransform } from '../lib/CodeMutationService';

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
}

const CodeContext = createContext<CodeContextType | undefined>(undefined);

export function CodeProvider({ children, initialCode = defaultCode }: { children: ReactNode; initialCode?: string }) {
    const [code, setRawCode] = useState<string>(initialCode);

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
        import('../modeling/features/modeling/RefactoringManager').then(({ refactoringManager }) => {
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
            const { agentAPI } = await import('../agent/AgentAPI');
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

                import('../features/ai/LLMService').then(async ({ llmService }) => {
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
        resetMutationDiagnostics
    }), [code, setCode, mutateCode, insertCode, editorInstance, commandManager, codeContext, renameItem, deleteItem, deleteHistoryItem, applyCodeSafe, getMutationDiagnostics, resetMutationDiagnostics]);

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
