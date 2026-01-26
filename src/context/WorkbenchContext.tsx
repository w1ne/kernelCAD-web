import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { defaultCode, executeCode, init as initEngine, type GeometryResult } from '../lib/geometryEngine';
import { CommandManager } from '../commands/CommandManager';
import type { ViewMode3D } from '../types/viewMode';
import type { SketchModeState } from '../types/sketch';

interface WorkbenchContextType {
    viewMode: 'code' | 'gui';
    setViewMode: (mode: 'code' | 'gui') => void;
    viewMode3D: ViewMode3D;
    setViewMode3D: (mode: ViewMode3D) => void;
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
    commandManager: CommandManager;
    // Sketch mode
    sketchMode: SketchModeState;
    setSketchMode: (mode: SketchModeState) => void;
}

// Export for testing
export const WorkbenchContext = createContext<WorkbenchContextType | undefined>(undefined);

export function WorkbenchProvider({ children }: { children: ReactNode }) {
    const [viewMode, setViewMode] = useState<'code' | 'gui'>('code');
    const [viewMode3D, setViewMode3D] = useState<ViewMode3D>('shadedWithEdges');
    const [code, setCode] = useState<string>(defaultCode);
    const [geometries, setGeometries] = useState<GeometryResult[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);

    // Sketch mode state
    const [sketchMode, setSketchMode] = useState<SketchModeState>({
        active: false,
        plane: null,
        currentSketch: null,
        tool: 'select',
    });
    const [isComputing, setIsComputing] = useState(false);
    const [activeDialog, setActiveDialog] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [editorInstance, setEditorInstance] = useState<any>(null);

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
                // Also update ref immediately for consecutive commands? 
                // setCode is async-ish (batching), but CommandManager expects immediate update?
                // Actually CommandManager just calls setCode. 
                // If multiple commands run in one tick, codeRef might be stale.
                // But typically UI limits speed.
                codeRef.current = newCode;
            }
        }));
    }

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

    const value = {
        viewMode,
        setViewMode,
        viewMode3D,
        setViewMode3D,
        code,
        setCode,
        geometries,
        error,
        isReady,
        isComputing,
        activeDialog,
        setActiveDialog,
        editorInstance,
        setEditorInstance,
        commandManager: commandManagerRef.current,
        sketchMode,
        setSketchMode,
    };

    return <WorkbenchContext.Provider value={value}>{children}</WorkbenchContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWorkbench() {
    const context = useContext(WorkbenchContext);
    if (!context) {
        throw new Error("useWorkbench must be used within a WorkbenchProvider");
    }
    return context;
}
