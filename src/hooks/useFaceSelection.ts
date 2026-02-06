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
    xDir?: [number, number, number];
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
            // Cast to include xDir which we added to Worker Types but might not be in generic types yet if they are shared
            const plane = face?.plane as FacePlane | undefined || null;

            // Validate plane data before using it
            const isValidPlane = plane &&
                Array.isArray(plane.origin) && plane.origin.length === 3 &&
                Array.isArray(plane.normal) && plane.normal.length === 3 &&
                plane.origin.every(v => typeof v === 'number' && !isNaN(v)) &&
                plane.normal.every(v => typeof v === 'number' && !isNaN(v));

            setSelectedFacePlane(isValidPlane ? plane : null);

            // If we are in face selection mode for sketching, automatically enter sketch mode
            if (isFaceSelecting && isValidPlane && onSketchModeChange) {
                const returnedVars = getReturnedVariables(code);
                const targetName = returnedVars[selection.shapeIndex];

                onSketchModeChange({
                    active: true,
                    plane: {
                        id: `face-${selection.faceId}-${Date.now()}`,
                        name: targetName ? `Face ${selection.faceId} of ${targetName}` : `Face ${selection.faceId}`,
                        type: 'face',
                        origin: plane!.origin,
                        normal: plane!.normal,
                        xDir: plane!.xDir,
                        visible: true,
                        parentId: targetName || undefined,
                        faceId: selection.faceId
                    },
                    currentSketch: null,
                    tool: 'line'
                });
                setIsFaceSelecting(false);
            } else if (isFaceSelecting && !isValidPlane) {
                // Invalid plane - cancel face selection and show error
                if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
                    console.error('Selected face does not have a valid planar surface. Only flat faces can be sketched on.');
                }
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
