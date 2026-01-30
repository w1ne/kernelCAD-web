import { createContext, useContext, useState, useRef, useEffect, type ReactNode } from 'react';
import { CommandManager } from '../commands/CommandManager';
import { defaultCode } from '../lib/geometryEngine';

export interface CodeContextType {
    code: string;
    setCode: (code: string) => void;
    insertCode: (snippet: string) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editorInstance: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setEditorInstance: (instance: any) => void;
    commandManager: CommandManager;
}

const CodeContext = createContext<CodeContextType | undefined>(undefined);

export function CodeProvider({ children, initialCode = defaultCode }: { children: ReactNode; initialCode?: string }) {
    const [code, setCode] = useState<string>(initialCode);
    const [editorInstance, setEditorInstance] = useState<unknown>(null);

    // Keep code in ref for CommandManager to access latest without re-render loop
    const codeRef = useRef(code);
    useEffect(() => {
        codeRef.current = code;
    }, [code]);

    // Initialize CommandManager once
    const commandManagerRef = useRef<CommandManager | null>(null);
    if (!commandManagerRef.current) {
        commandManagerRef.current = new CommandManager(() => ({
            code: codeRef.current,
            setCode: (newCode) => {
                setCode(newCode);
                codeRef.current = newCode;
            }
        }));
    }

    const insertCode = (snippet: string) => {
        setCode(prev => {
            const trimmed = prev.trimEnd();
            return trimmed + (trimmed ? '\n' : '') + snippet;
        });
    };

    const value: CodeContextType = {
        code,
        setCode,
        insertCode,
        editorInstance,
        setEditorInstance,
        commandManager: commandManagerRef.current,
    };

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
