import { createContext, useContext, useState, type ReactNode } from 'react';
import type { SketchModeState } from '../types/sketch';
import type { SketchPlaneEntity } from '../types/plane';

export interface SelectionContextType {
    // Face selection
    selectedFace: { shapeIndex: number; faceId: number } | null;
    selectedFacePlane: { origin: [number, number, number]; normal: [number, number, number] } | null;
    setSelectedFace: (selection: { shapeIndex: number; faceId: number } | null) => void;
    setSelectedFacePlane: (plane: { origin: [number, number, number]; normal: [number, number, number] } | null) => void;
    // Face selection mode
    isFaceSelecting: boolean;
    setIsFaceSelecting: (selecting: boolean) => void;
    // Sketch mode
    sketchMode: SketchModeState;
    setSketchMode: (mode: SketchModeState) => void;
    // Sketch history
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sketches: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addSketch: (sketch: any) => void;
    // Planes
    planes: SketchPlaneEntity[];
    addPlane: (plane: SketchPlaneEntity) => void;
    togglePlaneVisibility: (id: string) => void;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export function SelectionProvider({ children }: { children: ReactNode }) {
    const [selectedFace, setSelectedFace] = useState<{ shapeIndex: number; faceId: number } | null>(null);
    const [selectedFacePlane, setSelectedFacePlane] = useState<{ origin: [number, number, number]; normal: [number, number, number] } | null>(null);
    const [isFaceSelecting, setIsFaceSelecting] = useState(false);

    const [sketchMode, setSketchMode] = useState<SketchModeState>({
        active: false,
        plane: null,
        currentSketch: null,
        tool: 'select',
    });

    const [sketches, setSketches] = useState<unknown[]>([]);
    const addSketch = (sketch: unknown) => {
        setSketches(prev => [...prev, sketch]);
    };

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

    const value: SelectionContextType = {
        selectedFace,
        selectedFacePlane,
        setSelectedFace,
        setSelectedFacePlane,
        isFaceSelecting,
        setIsFaceSelecting,
        sketchMode,
        setSketchMode,
        sketches,
        addSketch,
        planes,
        addPlane,
        togglePlaneVisibility,
    };

    return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSelection() {
    const context = useContext(SelectionContext);
    if (!context) {
        throw new Error("useSelection must be used within a SelectionProvider");
    }
    return context;
}

export { SelectionContext };
