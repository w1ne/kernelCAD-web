import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { GeometryEngine, type GeometryResult, type SketchGeometry } from '../lib/geometryEngine';

export interface GeometryContextType {
    geometries: GeometryResult[];
    sketchesGeometries: SketchGeometry[];
    showSketches: boolean;
    toggleSketchVisibility: () => void;
    error: string | null;
    isReady: boolean;
    isComputing: boolean;
    // Execute code to update geometries
    executeGeometry: (code: string) => Promise<void>;
}

const GeometryContext = createContext<GeometryContextType | undefined>(undefined);

export function GeometryProvider({ children, code }: { children: ReactNode; code: string }) {
    const [geometries, setGeometries] = useState<GeometryResult[]>([]);
    const [sketchesGeometries, setSketchesGeometries] = useState<SketchGeometry[]>([]);
    const [showSketches, setShowSketches] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [isComputing, setIsComputing] = useState(false);

    // Get singleton instance
    const engine = GeometryEngine.getInstance();

    const toggleSketchVisibility = () => {
        setShowSketches(prev => !prev);
    };

    // Initialize Engine
    useEffect(() => {
        engine.initialize().then(() => setIsReady(true));
        return () => {
            // Optional: we could terminate here if we wanted to kill worker on unmount
            // engine.terminate(); 
            // note: terminating the global singleton might be bad if we remount.
        };
    }, []);

    // Execution Loop
    useEffect(() => {
        if (!isReady) return;

        const run = async () => {
            setIsComputing(true);
            try {
                const result = await engine.executeCode(code);
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

    const executeGeometry = async (codeToExecute: string) => {
        if (!isReady) return;
        setIsComputing(true);
        try {
            const result = await engine.executeCode(codeToExecute);
            setGeometries(result.geometries);
            setSketchesGeometries(result.sketches);
            setError(null);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsComputing(false);
        }
    };

    const value: GeometryContextType = {
        geometries,
        sketchesGeometries,
        showSketches,
        toggleSketchVisibility,
        error,
        isReady,
        isComputing,
        executeGeometry,
    };

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
