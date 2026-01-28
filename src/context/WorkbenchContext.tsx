import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { defaultCode, executeCode, init as initEngine, type GeometryResult, type SketchGeometry } from '../lib/geometryEngine';
import { CommandManager } from '../commands/CommandManager';
import type { ViewMode3D } from '../types/viewMode';
import type { SketchModeState } from '../types/sketch';
import type { SketchPlaneEntity } from '../types/plane';
import { useFaceSelection } from '../hooks/useFaceSelection';

export interface WorkbenchContextType {
    viewMode: 'code' | 'gui';
    setViewMode: (mode: 'code' | 'gui') => void;
    viewMode3D: ViewMode3D;
    setViewMode3D: (mode: ViewMode3D) => void;
    code: string;
    setCode: (code: string) => void;
    insertCode: (snippet: string) => void;
    geometries: GeometryResult[];
    sketchesGeometries: SketchGeometry[];
    showSketches: boolean;
    toggleSketchVisibility: () => void;
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
    // Sketch history
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sketches: any[]; // Using any for now to avoid circular dependency or complex types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addSketch: (sketch: any) => void;
    // Plane management
    planes: SketchPlaneEntity[];
    addPlane: (plane: SketchPlaneEntity) => void;
    togglePlaneVisibility: (id: string) => void;
    // Selection
    selectedFace: { shapeIndex: number; faceId: number } | null;
    selectedFacePlane: { origin: [number, number, number]; normal: [number, number, number] } | null;
    setSelectedFace: (selection: { shapeIndex: number; faceId: number } | null) => void;
    // Face selection mode (for sketching)
    isFaceSelecting: boolean;
    startFaceSelection: () => void;
    cancelFaceSelection: () => void;
}

// Export for testing
// eslint-disable-next-line react-refresh/only-export-components
export const WorkbenchContext = createContext<WorkbenchContextType | undefined>(undefined);

export function WorkbenchProvider({ children }: { children: ReactNode }) {
    const [viewMode, setViewMode] = useState<'code' | 'gui'>('code');
    const [viewMode3D, setViewMode3D] = useState<ViewMode3D>('shadedWithEdges');
    const [code, setCode] = useState<string>(defaultCode);
    const [geometries, setGeometries] = useState<GeometryResult[]>([]);
    const [sketchesGeometries, setSketchesGeometries] = useState<SketchGeometry[]>([]);
    const [showSketches, setShowSketches] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);

    // Sketch mode state
    const [sketchMode, setSketchMode] = useState<SketchModeState>({
        active: false,
        plane: null,
        currentSketch: null,
        tool: 'select',
    });
    // Sketch history state
    const [sketches, setSketches] = useState<unknown[]>([]);

    const addSketch = (sketch: unknown) => {
        setSketches(prev => [...prev, sketch]);
    };

    // Plane management state
    const [planes, setPlanes] = useState<SketchPlaneEntity[]>([
        { id: 'base-xy', name: 'Origin XY', type: 'base', origin: [0, 0, 0], normal: [0, 0, 1], visible: true },
        { id: 'base-xz', name: 'Origin XZ', type: 'base', origin: [0, 0, 0], normal: [0, 1, 0], visible: true },
        { id: 'base-yz', name: 'Origin YZ', type: 'base', origin: [0, 0, 0], normal: [1, 0, 0], visible: true },
    ]);

    const addPlane = (plane: SketchPlaneEntity) => {
        setPlanes(prev => [...prev, plane]);
    };

    const togglePlaneVisibility = (id: string) => {
        setPlanes(prev => prev.map(p => p.id === id ? { ...p, visible: !p.visible } : p));
    };

    const toggleSketchVisibility = () => {
        setShowSketches(prev => !prev);
    };

    const [isComputing, setIsComputing] = useState(false);
    const [activeDialog, setActiveDialog] = useState<string | null>(null);
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
                const result = await executeCode(code);
                setGeometries(result.geometries);
                setSketchesGeometries(result.sketches);
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

    // Use face selection hook
    const faceSelection = useFaceSelection({
        geometries,
        code,
        onSketchModeChange: setSketchMode
    });

    // Wrap startFaceSelection to also close the dialog
    const startFaceSelectionWithDialog = () => {
        faceSelection.startFaceSelection();
        setActiveDialog(null); // Close plane selector
    };

    const insertCode = (snippet: string) => {
        setCode(prev => {
            const trimmed = prev.trimEnd();
            return trimmed + (trimmed ? '\n' : '') + snippet;
        });
    };

    const value = {
        viewMode,
        setViewMode,
        viewMode3D,
        setViewMode3D,
        code,
        setCode,
        insertCode,
        geometries,
        sketchesGeometries,
        showSketches,
        toggleSketchVisibility,
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
        sketches,
        addSketch,
        planes,
        addPlane,
        togglePlaneVisibility,
        // Face selection from hook
        selectedFace: faceSelection.selectedFace,
        selectedFacePlane: faceSelection.selectedFacePlane,
        setSelectedFace: faceSelection.setSelectedFace,
        isFaceSelecting: faceSelection.isFaceSelecting,
        startFaceSelection: startFaceSelectionWithDialog,
        cancelFaceSelection: faceSelection.cancelFaceSelection,
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
