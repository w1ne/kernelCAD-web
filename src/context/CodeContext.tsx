import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CommandManager } from '../commands/CommandManager';
import { defaultCode } from '../lib/geometryEngine';
import type { EditorLike } from '../types/editor';

export interface CodeContextType {
    code: string;
    setCode: (code: string) => void;
    insertCode: (snippet: string | ((name: string) => string), baseName?: string) => void;
    editorInstance: EditorLike | null;
    setEditorInstance: (instance: EditorLike | null) => void;
    commandManager: CommandManager;
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

    // Magic Comment Detection
    useEffect(() => {
        const magicCommentRegex = /\/\/ @ai:(.+)(\n|$)/;
        const match = code.match(magicCommentRegex);

        if (match) {
            const fullMatch = match[0];
            const instruction = match[1].trim();
            const isFinished = fullMatch.endsWith('\n');

            if (isFinished && instruction) {
                // Prevent infinite loops or re-triggering
                // We'll immediately "mark" it as processing by replacing it or adding a loader comment
                // For now, simpler: replace with "Generating..."

                const processingPlaceholder = `// @ai-processing: ${instruction}...\n`;
                const newCodeWithPlaceholder = code.replace(fullMatch, processingPlaceholder);
                setCode(newCodeWithPlaceholder);

                // Import LLM Service dynamically to avoid circular dependency issues at top level if any
                import('../features/ai/LLMService').then(async ({ llmService }) => {
                    try {
                        // We pass the *current code* as context so it knows what to do
                        // We exclude the magic comment line itself from the context to avoid confusing the AI
                        const contextCode = code.replace(fullMatch, '');

                        const prompt = `Generate code for: "${instruction}". return ONLY the code.`;

                        const response = await llmService.sendMessage(
                            [{ role: 'user', content: prompt }],
                            { code: contextCode }
                        );

                        // Clean up response (remove markdown blocks if present)
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
    }), [code, insertCode, editorInstance, commandManager]);

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
