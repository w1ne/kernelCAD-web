import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CommandManager } from '../commands/CommandManager';
import { defaultCode } from '../lib/geometryEngine';
import type { EditorLike } from '../types/editor';
import { CodeAnalyzer, type CodeGenerationContext } from '../lib/codeGeneration';

export interface CodeContextType {
    code: string;
    setCode: (code: string) => void;
    insertCode: (snippet: string | ((name: string) => string), baseName?: string) => void;
    editorInstance: EditorLike | null;
    setEditorInstance: (instance: EditorLike | null) => void;
    commandManager: CommandManager;
    codeContext: CodeGenerationContext;
    renameItem: (oldName: string, newName: string) => void;
    applyCodeSafe: (code: string) => Promise<boolean>;
}

const CodeContext = createContext<CodeContextType | undefined>(undefined);

export function CodeProvider({ children, initialCode = defaultCode }: { children: ReactNode; initialCode?: string }) {
    const [code, setCode] = useState<string>(initialCode);

    const [editorInstance, setEditorInstance] = useState<EditorLike | null>(null);

    // Initialize CommandManager once, then update its context provider as state changes.
    const [commandManager] = useState(() => new CommandManager(() => ({ code: initialCode, setCode })));
    useEffect(() => {
        commandManager.setContextProvider(() => ({ code, setCode }));
    }, [commandManager, code]);

    const insertCode = useCallback((snippet: string | ((name: string) => string), baseName?: string) => {
        setCode(prev => {
            const resolvedSnippet = typeof snippet === 'function' ? snippet(baseName || 'shape') : snippet;
            const trimmed = prev.trimEnd();
            return trimmed + (trimmed ? '\n' : '') + resolvedSnippet;
        });
    }, []);

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
                generateUniqueName: (prefix: string) => `${prefix}_${Date.now()}`
            } as unknown as CodeGenerationContext;
        }
    }, [code]);

    const renameItem = useCallback((oldName: string, newName: string) => {
        import('../features/modeling/RefactoringManager').then(({ refactoringManager }) => {
            const newCode = refactoringManager.renameVariable(code, oldName, newName);
            if (newCode !== code) {
                setCode(newCode);
            }
        });
    }, [code]);

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
    }, []);

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
                setCode(newCodeWithPlaceholder);

                import('../features/ai/LLMService').then(async ({ llmService }) => {
                    try {
                        const contextCode = code.replace(fullMatch, '');
                        const prompt = `Generate code for: "${instruction}". return ONLY the code.`;
                        const response = await llmService.sendMessage(
                            [{ role: 'user', content: prompt }],
                            { code: contextCode }
                        );
                        const cleanCode = response.replace(/```javascript/g, '').replace(/```/g, '').trim();
                        setCode(prev => prev.replace(processingPlaceholder, cleanCode + '\n'));
                    } catch (error) {
                        console.error("Magic Comment Error:", error);
                        setCode(prev => prev.replace(processingPlaceholder, `// @ai-error: Failed to generate for "${instruction}"\n`));
                    }
                });
            }
        }
    }, [code]);


    const value: CodeContextType = useMemo(() => ({
        code,
        setCode,
        insertCode,
        editorInstance,
        setEditorInstance,
        commandManager,
        codeContext,
        renameItem,
        applyCodeSafe
    }), [code, insertCode, editorInstance, commandManager, codeContext, renameItem, applyCodeSafe]);

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
