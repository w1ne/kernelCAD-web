import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { SketchData, SketchModeState } from '../types/sketch';
import type { SketchPlaneEntity } from '../types/plane';

export interface SelectionContextType {
    // Face selection
    selectedFace: { shapeIndex: number; faceId: number } | null;
    selectedFacePlane: { origin: [number, number, number]; normal: [number, number, number] } | null;
    setSelectedFace: (selection: { shapeIndex: number; faceId: number } | null) => void;
    setSelectedFacePlane: (plane: { origin: [number, number, number]; normal: [number, number, number] } | null) => void;
    // Sketch selection (viewport)
    selectedSketchName: string | null;
    setSelectedSketchName: (name: string | null) => void;
    // Face selection mode
    isFaceSelecting: boolean;
    setIsFaceSelecting: (selecting: boolean) => void;
    // Sketch mode
    sketchMode: SketchModeState;
    setSketchMode: (mode: SketchModeState) => void;
    // Sketch history
    sketches: SketchData[];
    addSketch: (sketch: SketchData) => void;
    // Planes
    planes: SketchPlaneEntity[];
    addPlane: (plane: SketchPlaneEntity) => void;
    togglePlaneVisibility: (id: string) => void;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

import { useWorkbenchState } from './WorkbenchStateContext';

export function SelectionProvider({ children }: { children: ReactNode }) {
    const [selectedFace, setSelectedFace] = useState<{ shapeIndex: number; faceId: number } | null>(null);
    const [selectedFacePlane, setSelectedFacePlane] = useState<{ origin: [number, number, number]; normal: [number, number, number] } | null>(null);
    const [selectedSketchName, setSelectedSketchName] = useState<string | null>(null);

    // Central state machine
    const { state, dispatch } = useWorkbenchState();

    const isFaceSelecting = state.mode.type === 'FACE_SELECTION';

    const setIsFaceSelecting = useCallback((selecting: boolean) => {
        if (selecting) {
            // Defaulting to feature purpose if generic toggle
            dispatch({ type: 'START_FACE_SELECTION', purpose: 'feature' });
        } else {
            dispatch({ type: 'CANCEL_SELECTION' });
        }
    }, [dispatch]);

    const [planes, setPlanes] = useState<SketchPlaneEntity[]>([
        { id: 'base-xy', name: 'Origin XY', type: 'base', origin: [0, 0, 0], normal: [0, 0, 1], visible: true },
        { id: 'base-xz', name: 'Origin XZ', type: 'base', origin: [0, 0, 0], normal: [0, 1, 0], visible: true },
        { id: 'base-yz', name: 'Origin YZ', type: 'base', origin: [0, 0, 0], normal: [1, 0, 0], visible: true },
    ]);

    const addPlane = useCallback((plane: SketchPlaneEntity) => {
        setPlanes(prev => {
            if (prev.find(p => p.id === plane.id)) return prev;
            return [...prev, plane];
        });
    }, []);

    const sketchMode: SketchModeState = useMemo(() => {
        if (state.mode.type !== 'SKETCHING') {
            return {
                active: false,
                plane: null,
                currentSketch: null,
                tool: 'select',
            };
        }

        const planeId = state.mode.planeId;
        return {
            active: true,
            plane: planes.find(p => p.id === planeId) || planeId,
            currentSketch: null, // TODO: Pass sketch object via state or lookup
            tool: 'line', // Default tool
        };
    }, [planes, state.mode]);

    const setSketchMode = useCallback((mode: SketchModeState) => {
        if (mode.active) {
            let planeId = '';
            if (typeof mode.plane === 'string') {
                planeId = mode.plane;
            } else if (mode.plane && typeof mode.plane === 'object') {
                planeId = mode.plane.id;
                // Ensure this plane is in our planes list so we can resolve it later
                addPlane(mode.plane);
            }

            if (!planeId) {
                planeId = mode.currentSketch?.plane === 'face' ? 'face' : 'XY';
            }

            dispatch({ type: 'START_SKETCH', planeId, sketchId: mode.currentSketch?.id });
        } else {
            dispatch({ type: 'EXIT_SKETCH' });
        }
    }, [addPlane, dispatch]);

    const [sketches, setSketches] = useState<SketchData[]>([]);
    const addSketch = useCallback((sketch: SketchData) => {
        setSketches(prev => [...prev, sketch]);
    }, []);

    const togglePlaneVisibility = useCallback((id: string) => {
        setPlanes(prev => prev.map(p => p.id === id ? { ...p, visible: !p.visible } : p));
    }, []);

    const value: SelectionContextType = useMemo(() => ({
        selectedFace,
        selectedFacePlane,
        setSelectedFace,
        setSelectedFacePlane,
        selectedSketchName,
        setSelectedSketchName,
        isFaceSelecting,
        setIsFaceSelecting,
        sketchMode,
        setSketchMode,
        sketches,
        addSketch,
        planes,
        addPlane,
        togglePlaneVisibility,
    }), [selectedFace, selectedFacePlane, selectedSketchName, isFaceSelecting, setIsFaceSelecting, sketchMode, setSketchMode, sketches, addSketch, planes, addPlane, togglePlaneVisibility]);

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
