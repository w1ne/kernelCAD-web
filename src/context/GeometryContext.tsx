import { createContext, useCallback, useContext, useMemo, useState, useEffect, useRef, type ReactNode } from 'react';
import { GeometryEngine, type GeometryResult, type SketchGeometry } from '../lib/geometryEngine';
import { remapSketchNames } from '../lib/sketchNaming';
import { parseCode } from '../lib/ast';

export interface GeometryContextType {
    geometries: GeometryResult[];
    previewGeometries: GeometryResult[];
    sketchesGeometries: SketchGeometry[];
    showSketches: boolean;
    toggleSketchVisibility: () => void;
    error: string | null;
    isReady: boolean;
    isComputing: boolean;
    executionCount: number;
    staleMainResponsesDropped: number;
    stalePreviewResponsesDropped: number;
    // Execute code to update geometries
    executeGeometry: (code: string) => Promise<void>;
    setPreviewCode: (code: string | null) => void;
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
    const [previewGeometries, setPreviewGeometries] = useState<GeometryResult[]>([]);
    const [previewCode, setPreviewCode] = useState<string | null>(null);
    const [sketchesGeometries, setSketchesGeometries] = useState<SketchGeometry[]>([]);
    const [showSketches, setShowSketches] = useState(() => readStoredShowSketches());
    const [error, setError] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [isComputing, setIsComputing] = useState(false);
    const [executionCount, setExecutionCount] = useState(0);
    const [staleMainResponsesDropped, setStaleMainResponsesDropped] = useState(0);
    const [stalePreviewResponsesDropped, setStalePreviewResponsesDropped] = useState(0);
    const mainRevisionRef = useRef(0);
    const previewRevisionRef = useRef(0);

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
        };
    }, [engine]);

    // Execution Loop
    useEffect(() => {
        if (!isReady) return;

        const run = async () => {
            const revision = ++mainRevisionRef.current;
            let staleRecorded = false;
            try {
                parseCode(code);
            } catch (err) {
                if (revision !== mainRevisionRef.current) {
                    setStaleMainResponsesDropped((prev) => prev + 1);
                    staleRecorded = true;
                    return;
                }
                const message = err instanceof Error ? err.message : String(err);
                setError(message);
                return;
            }
            setIsComputing(true);
            try {
                const result = await engine.executeCode(code);
                if (revision !== mainRevisionRef.current) {
                    setStaleMainResponsesDropped((prev) => prev + 1);
                    staleRecorded = true;
                    return;
                }
                setGeometries(result.geometries);
                const remappedSketches = remapSketchNames(result.sketches, code);
                setSketchesGeometries(remappedSketches);
                setError(null);
            } catch (err: unknown) {
                if (revision !== mainRevisionRef.current) {
                    setStaleMainResponsesDropped((prev) => prev + 1);
                    staleRecorded = true;
                    return;
                }
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
                if (revision === mainRevisionRef.current) {
                    setIsComputing(false);
                    setExecutionCount(prev => prev + 1);
                } else if (!staleRecorded) {
                    setStaleMainResponsesDropped((prev) => prev + 1);
                }
            }
        };

        const timer = setTimeout(run, 600);
        return () => clearTimeout(timer);
    }, [code, isReady, engine]);

    // Preview Execution Loop
    useEffect(() => {
        if (!isReady || !previewCode) {
            setPreviewGeometries([]);
            return;
        }

        const runPreview = async () => {
            const revision = ++previewRevisionRef.current;
            try {
                parseCode(code);
                parseCode(`${code}\n${previewCode}`);
                // Combine current code (as library) with preview code
                // Or just run the preview code if it's independent
                // For live modeling, it's usually current code + the new operation
                const result = await engine.executeCode(`${code}\n${previewCode}`);
                if (revision !== previewRevisionRef.current) {
                    setStalePreviewResponsesDropped((prev) => prev + 1);
                    return;
                }
                setPreviewGeometries(result.geometries);
            } catch (err) {
                if (revision !== previewRevisionRef.current) {
                    setStalePreviewResponsesDropped((prev) => prev + 1);
                    return;
                }
                // Silently ignore preview errors to avoid flickering red screens
                console.warn('Live Preview Error:', err);
            }
        };

        const timer = setTimeout(runPreview, 150); // Aggressive debounce for preview
        return () => clearTimeout(timer);
    }, [code, previewCode, isReady, engine]);

    const executeGeometry = useCallback(async (codeToExecute: string) => {
        if (!isReady) return;
        try {
            parseCode(codeToExecute);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            return;
        }
        setIsComputing(true);
        try {
            const result = await engine.executeCode(codeToExecute);
            setGeometries(result.geometries);
            const remappedSketches = remapSketchNames(result.sketches, codeToExecute);
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
        previewGeometries,
        sketchesGeometries,
        showSketches,
        toggleSketchVisibility,
        error,
        isReady,
        isComputing,
        executionCount,
        staleMainResponsesDropped,
        stalePreviewResponsesDropped,
        executeGeometry,
        setPreviewCode,
    }), [geometries, previewGeometries, sketchesGeometries, showSketches, toggleSketchVisibility, error, isReady, isComputing, executionCount, staleMainResponsesDropped, stalePreviewResponsesDropped, executeGeometry]);

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
