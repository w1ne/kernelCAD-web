import { useState } from 'react';
import { getReturnedVariables } from '../lib/ast';
import type { GeometryResult } from '../lib/geometryEngine';
import type { SketchModeState } from '../types/sketch';

export interface FaceSelection {
    shapeIndex: number;
    faceId: number;
}

export interface FacePlane {
    origin: [number, number, number];
    normal: [number, number, number];
}

export interface UseFaceSelectionOptions {
    geometries: GeometryResult[];
    code: string;
    onSketchModeChange?: (mode: SketchModeState) => void;
}

export interface UseFaceSelectionReturn {
    selectedFace: FaceSelection | null;
    selectedFacePlane: FacePlane | null;
    isFaceSelecting: boolean;
    setSelectedFace: (selection: FaceSelection | null) => void;
    startFaceSelection: () => void;
    cancelFaceSelection: () => void;
}

/**
 * Custom hook for managing face selection state and logic
 * Encapsulates face selection, plane detection, and sketch mode triggering
 */
export function useFaceSelection({
    geometries,
    code,
    onSketchModeChange
}: UseFaceSelectionOptions): UseFaceSelectionReturn {
    const [selectedFace, setSelectedFaceState] = useState<FaceSelection | null>(null);
    const [selectedFacePlane, setSelectedFacePlane] = useState<FacePlane | null>(null);
    const [isFaceSelecting, setIsFaceSelecting] = useState(false);

    const startFaceSelection = () => {
        setIsFaceSelecting(true);
    };

    const cancelFaceSelection = () => {
        setIsFaceSelecting(false);
    };

    const setSelectedFace = (selection: FaceSelection | null) => {
        setSelectedFaceState(selection);

        if (selection && geometries[selection.shapeIndex]) {
            // Find the selected face and extract its plane
            const face = geometries[selection.shapeIndex].faces.find(
                f => f.faceId === selection.faceId
            );
            const plane = face?.plane || null;
            setSelectedFacePlane(plane);

            // If we are in face selection mode for sketching, automatically enter sketch mode
            if (isFaceSelecting && plane && onSketchModeChange) {
                const returnedVars = getReturnedVariables(code);
                let targetName = returnedVars[selection.shapeIndex] || 'shape';
                if (targetName === 'unknown') targetName = 'shape';

                onSketchModeChange({
                    active: true,
                    plane: {
                        id: `face-${selection.faceId}-${Date.now()}`,
                        name: `Face ${selection.faceId} of ${targetName}`,
                        type: 'face',
                        origin: plane.origin,
                        normal: plane.normal,
                        visible: true,
                        parentId: targetName
                    },
                    currentSketch: null,
                    tool: 'line'
                });
                setIsFaceSelecting(false);
            }
        } else {
            setSelectedFacePlane(null);
        }
    };

    return {
        selectedFace,
        selectedFacePlane,
        isFaceSelecting,
        setSelectedFace,
        startFaceSelection,
        cancelFaceSelection
    };
}
