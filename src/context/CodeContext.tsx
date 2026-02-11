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
