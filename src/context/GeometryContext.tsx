import { createContext, useCallback, useContext, useMemo, useState, useEffect, type ReactNode } from 'react';
import { GeometryEngine, type GeometryResult, type SketchGeometry } from '../lib/geometryEngine';
import { getSketchVariablesAST } from '../lib/ast';

export interface GeometryContextType {
    geometries: GeometryResult[];
    sketchesGeometries: SketchGeometry[];
    showSketches: boolean;
    toggleSketchVisibility: () => void;
    error: string | null;
    isReady: boolean;
    isComputing: boolean;
    executionCount: number;
    // Execute code to update geometries
    executeGeometry: (code: string) => Promise<void>;
}

const GeometryContext = createContext<GeometryContextType | undefined>(undefined);

const STORAGE_KEY_SHOW_SKETCHES = 'kernelcad:showSketches';
function readStoredShowSketches(): boolean {
    if (typeof window === 'undefined') return true;
    const raw = window.localStorage.getItem(STORAGE_KEY_SHOW_SKETCHES);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return true;
}

export function GeometryProvider({ children, code }: { children: ReactNode; code: string }) {
    const [geometries, setGeometries] = useState<GeometryResult[]>([]);
    const [sketchesGeometries, setSketchesGeometries] = useState<SketchGeometry[]>([]);
    const [showSketches, setShowSketches] = useState(() => readStoredShowSketches());
    const [error, setError] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [isComputing, setIsComputing] = useState(false);
    const [executionCount, setExecutionCount] = useState(0);

    // Get singleton instance
    const engine = GeometryEngine.getInstance();

    const toggleSketchVisibility = useCallback(() => {
        setShowSketches(prev => !prev);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(STORAGE_KEY_SHOW_SKETCHES, String(showSketches));
    }, [showSketches]);

    // Initialize Engine
    useEffect(() => {
        engine.initialize().then(() => setIsReady(true));
        return () => {
            // Optional: we could terminate here if we wanted to kill worker on unmount
            // engine.terminate(); 
            // note: terminating the global singleton might be bad if we remount.
        };
    }, [engine]);

    // Execution Loop
    useEffect(() => {
        if (!isReady) return;

        const run = async () => {
            setIsComputing(true);
            try {
                const result = await engine.executeCode(code);
                setGeometries(result.geometries);
                const sketchVarNames = (() => {
                    try {
                        return getSketchVariablesAST(code);
                    } catch {
                        return [];
                    }
                })();

                // Worker assigns tracked sketch ids like `sketch-${index}-${Date.now()}`.
                // Remap those names to the real variable names from user code so viewport
                // selection can drive feature dialogs (extrude/revolve) correctly.
                const remappedSketches = result.sketches.map((s) => {
                    const m = /^sketch-(\d+)-/.exec(s.id);
                    if (!m) return s;
                    const idx = Number(m[1]);
                    const name = sketchVarNames[idx];
                    if (!name) return s;
                    if (s.name === name) return s;
                    return { ...s, name };
                });

                setSketchesGeometries(remappedSketches);
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
                setExecutionCount(prev => prev + 1);
            }
        };

        const timer = setTimeout(run, 600);
        return () => clearTimeout(timer);
    }, [code, isReady, engine]);

    const executeGeometry = useCallback(async (codeToExecute: string) => {
        if (!isReady) return;
        setIsComputing(true);
        try {
            const result = await engine.executeCode(codeToExecute);
            setGeometries(result.geometries);
            const sketchVarNames = (() => {
                try {
                    return getSketchVariablesAST(codeToExecute);
                } catch {
                    return [];
                }
            })();

            const remappedSketches = result.sketches.map((s) => {
                const m = /^sketch-(\d+)-/.exec(s.id);
                if (!m) return s;
                const idx = Number(m[1]);
                const name = sketchVarNames[idx];
                if (!name) return s;
                if (s.name === name) return s;
                return { ...s, name };
            });

            setSketchesGeometries(remappedSketches);
            setError(null);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsComputing(false);
            setExecutionCount(prev => prev + 1);
        }
    }, [engine, isReady]);

    const value: GeometryContextType = useMemo(() => ({
        geometries,
        sketchesGeometries,
        showSketches,
        toggleSketchVisibility,
        error,
        isReady,
        isComputing,
        executionCount,
        executeGeometry,
    }), [geometries, sketchesGeometries, showSketches, toggleSketchVisibility, error, isReady, isComputing, executionCount, executeGeometry]);

    return <GeometryContext.Provider value={value}>{children}</GeometryContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGeometry() {
    const context = useContext(GeometryContext);
    if (!context) {
        throw new Error("useGeometry must be used within a GeometryProvider");
    }
    return context;
}

export { GeometryContext };
