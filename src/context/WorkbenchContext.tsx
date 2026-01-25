import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { defaultCode, executeCode, init as initEngine, type GeometryResult } from '../lib/geometryEngine';

interface WorkbenchContextType {
    viewMode: 'code' | 'gui';
    setViewMode: (mode: 'code' | 'gui') => void;
    code: string;
    setCode: (code: string) => void;
    geometries: GeometryResult[];
    error: string | null;
    isReady: boolean;
    isComputing: boolean;
    activeDialog: string | null;
    setActiveDialog: (dialogId: string | null) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editorInstance: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setEditorInstance: (instance: any) => void;
}

const WorkbenchContext = createContext<WorkbenchContextType | undefined>(undefined);

export function WorkbenchProvider({ children }: { children: ReactNode }) {
    const [viewMode, setViewMode] = useState<'code' | 'gui'>('code');
    const [code, setCode] = useState(defaultCode);
    const [geometries, setGeometries] = useState<GeometryResult[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [isComputing, setIsComputing] = useState(false);
    const [activeDialog, setActiveDialog] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [editorInstance, setEditorInstance] = useState<any>(null);

    // Initialize Engine
    useEffect(() => {
        initEngine().then(() => setIsReady(true));
    }, []);

    // Execution Loop
    useEffect(() => {
        if (!isReady) return;

        const run = async () => {
            setIsComputing(true);
            try {
                const shapes = await executeCode(code);
                setGeometries(shapes);
                setError(null);
            } catch (err: unknown) {
                console.error(err);
                let message = "Unknown error";
                if (err instanceof Error) {
                    message = err.message;
                } else if (typeof err === 'object' && err !== null) {
                    try {
                        message = JSON.stringify(err);
                    } catch {
                        message = String(err);
                    }
                } else {
                    message = String(err);
                }
                setError(message);
            } finally {
                setIsComputing(false);
            }
        };

        const timer = setTimeout(run, 600);
        return () => clearTimeout(timer);
    }, [code, isReady]);

    const value: WorkbenchContextType = {
        viewMode,
        setViewMode,
        code,
        setCode,
        geometries,
        error,
        isReady,
        isComputing,
        activeDialog,
        setActiveDialog,
        editorInstance,
        setEditorInstance
    };

    return (
        <WorkbenchContext.Provider value={value}>
            {children}
        </WorkbenchContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWorkbench() {
    const context = useContext(WorkbenchContext);
    if (!context) {
        throw new Error("useWorkbench must be used within a WorkbenchProvider");
    }
    return context;
}
