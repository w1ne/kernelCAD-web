// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SketchData, SketchModeState } from '../../shared/types/sketch';
import type { SketchPlaneEntity } from '../../shared/types/plane';

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
    // List-based selection (Scene Browser / Viewer objects)
    selectedItemIds: string[];
    selectedItemId: string | null; // Primary selection (usually the last selected)
    setSelectedItemId: (id: string | null) => void;
    toggleSelection: (id: string, multi: boolean) => void;
    hoveredItemId: string | null;
    setHoveredItemId: (id: string | null) => void;
    hiddenIds: string[]; // IDs of hidden objects (Solids, Sketches, etc.)
    toggleVisibility: (id: string) => void;
    hideItem: (id: string) => void;
    showAll: () => void;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

import { useWorkbenchState } from './WorkbenchStateContext';

export function SelectionProvider({ children }: { children: ReactNode }) {
    const [selectedFace, setSelectedFace] = useState<{ shapeIndex: number; faceId: number } | null>(null);
    const [selectedFacePlane, setSelectedFacePlane] = useState<{ origin: [number, number, number]; normal: [number, number, number] } | null>(null);
    const [selectedSketchName, setSelectedSketchName] = useState<string | null>(null);

    // Multi-selection state
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

    // Backward compatibility: primary selection is the last selected item (or null)
    const selectedItemId = useMemo(() => selectedItemIds.length > 0 ? selectedItemIds[selectedItemIds.length - 1] : null, [selectedItemIds]);

    const setSelectedItemId = useCallback((id: string | null) => {
        setSelectedItemIds(id ? [id] : []);
    }, []);

    const toggleSelection = useCallback((id: string, multi: boolean) => {
        setSelectedItemIds(prev => {
            if (!multi) {
                // If single select mode, asking to toggle could mean:
                // 1. If ID matches unique selection, deselect?
                // 2. If ID matches one of many, select only it?
                // Standard behavior: Click without modifier selects ONLY that item.
                // If it was already the ONLY selected item, usually we don't deselect in CAD unless clicking void.
                // But SceneBrowser behavior 'onSelect' usually implies "Select this".
                return [id];
            } else {
                // Multi select (Cmd/Ctrl)
                if (prev.includes(id)) {
                    return prev.filter(i => i !== id);
                } else {
                    return [...prev, id];
                }
            }
        });
    }, []);
    const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
    const [hiddenIds, setHiddenIds] = useState<string[]>(() => {
        if (typeof window === 'undefined') return [];
        try {
            const saved = localStorage.getItem('kernelcad_hidden_ids');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.warn('Failed to load hiddenIds:', e);
            return [];
        }
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('kernelcad_hidden_ids', JSON.stringify(hiddenIds));
        }
    }, [hiddenIds]);

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
        { id: 'base-xy', name: 'Origin XY', type: 'base', origin: [0, 0, 0], normal: [0, 0, 1] },
        { id: 'base-xz', name: 'Origin XZ', type: 'base', origin: [0, 0, 0], normal: [0, 1, 0] },
        { id: 'base-yz', name: 'Origin YZ', type: 'base', origin: [0, 0, 0], normal: [1, 0, 0] },
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

    const toggleVisibility = useCallback((id: string) => {
        setHiddenIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    }, []);

    const togglePlaneVisibility = useCallback((id: string) => {
        toggleVisibility(id);
    }, [toggleVisibility]);

    const hideItem = useCallback((id: string) => {
        setHiddenIds(prev => prev.includes(id) ? prev : [...prev, id]);
    }, []);

    const showAll = useCallback(() => {
        setHiddenIds([]);
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
        selectedItemIds,
        selectedItemId,
        setSelectedItemId,
        toggleSelection,
        hoveredItemId,
        setHoveredItemId,
        hiddenIds,
        toggleVisibility,
        hideItem,
        showAll,
    }), [
        selectedFace, selectedFacePlane, selectedSketchName, isFaceSelecting, setIsFaceSelecting,
        sketchMode, setSketchMode, sketches, addSketch, planes, addPlane, togglePlaneVisibility,
        selectedItemId, setSelectedItemId, hoveredItemId, setHoveredItemId, hiddenIds,
        toggleVisibility, hideItem, showAll, selectedItemIds, toggleSelection
    ]);

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
