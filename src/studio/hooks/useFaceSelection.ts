// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useState, useCallback } from 'react';
import { getReturnedVariables } from '../../shared/codeGeneration/ast';
import type { GeometryResult } from '../../shared/worker/geometryEngine';
import type { SketchModeState } from '../../shared/types/sketch';
import { buildFaceSketchPlaneEntity } from '../../shared/sketch/sketchPlane';

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

/** Find the selected face in its geometry and return its plane when the plane
 *  carries valid 3-component numeric origin and normal data. */
function resolveSelectedFacePlane(
    geometries: GeometryResult[],
    selection: FaceSelection
): FacePlane | null {
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

    return isValidPlane ? plane : null;
}

/** Sketch mode state entered when a face is clicked while face-selection mode
 *  is active: binds the face's plane to the returned variable at that shape
 *  index. */
function buildFaceSketchModeState(
    code: string,
    selection: FaceSelection,
    plane: FacePlane
): SketchModeState {
    const returnedVars = getReturnedVariables(code);
    const targetName = returnedVars[selection.shapeIndex];

    return {
        active: true,
        plane: buildFaceSketchPlaneEntity({
            faceId: selection.faceId,
            targetName,
            origin: plane.origin,
            normal: plane.normal,
            xDir: plane.xDir
        }),
        currentSketch: null,
        tool: 'line'
    };
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

    const startFaceSelection = useCallback(() => {
        setIsFaceSelecting(true);
    }, []);

    const cancelFaceSelection = useCallback(() => {
        setIsFaceSelecting(false);
    }, []);

    const setSelectedFace = useCallback((selection: FaceSelection | null) => {
        setSelectedFaceState(selection);

        if (selection && geometries[selection.shapeIndex]) {
            const plane = resolveSelectedFacePlane(geometries, selection);
            setSelectedFacePlane(plane);

            // If we are in face selection mode for sketching, automatically enter sketch mode
            if (isFaceSelecting && plane && onSketchModeChange) {
                onSketchModeChange(buildFaceSketchModeState(code, selection, plane));
                // We should ideally use a ref for isFaceSelecting if we want to avoid dependency loop,
                // but since this is an event handler, it's tricky.
                // Actually, isFaceSelecting is state.
                // We can't access current state in useCallback without adding it to deps.
                // If we add it to deps, function changes when state changes.
                // That's acceptable.
            } else if (isFaceSelecting && !plane) {
                if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
                    console.error('Selected face does not have a valid planar surface. Only flat faces can be sketched on.');
                }
            }
            // Always turn off face selection after a click in selection mode?
            // Original logic:
            if (isFaceSelecting) {
                setIsFaceSelecting(false);
            }
        } else {
            setSelectedFacePlane(null);
        }
    }, [geometries, code, onSketchModeChange, isFaceSelecting]);

    return {
        selectedFace,
        selectedFacePlane,
        isFaceSelecting,
        setSelectedFace,
        startFaceSelection,
        cancelFaceSelection
    };
}
