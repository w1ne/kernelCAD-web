// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { GeometryResult } from '../../shared/worker/geometryEngine';
import type { SketchModeState } from '../../shared/types/sketch';
import { useFaceSelection } from '../hooks/useFaceSelection';

function geometryWithPlane(faceId: number, plane?: { origin: [number, number, number]; normal: [number, number, number] }): GeometryResult {
    return {
        faces: [
            {
                vertices: new Float32Array(),
                indices: new Uint32Array(),
                normals: new Float32Array(),
                faceId,
                ...(plane !== undefined ? { plane } : {}),
            },
        ],
    };
}

const VALID_PLANE = { origin: [0, 0, 10] as [number, number, number], normal: [0, 0, 1] as [number, number, number] };

describe('useFaceSelection — characterisation before split', () => {
    it('starts with no selection, no plane and selection mode off', () => {
        const { result } = renderHook(() => useFaceSelection({ geometries: [], code: '' }));
        expect(result.current.selectedFace).toBeNull();
        expect(result.current.selectedFacePlane).toBeNull();
        expect(result.current.isFaceSelecting).toBe(false);
    });

    it('startFaceSelection / cancelFaceSelection toggle the flag', () => {
        const { result } = renderHook(() => useFaceSelection({ geometries: [], code: '' }));
        act(() => result.current.startFaceSelection());
        expect(result.current.isFaceSelecting).toBe(true);
        act(() => result.current.cancelFaceSelection());
        expect(result.current.isFaceSelecting).toBe(false);
    });

    it('setSelectedFace(null) clears both selection and plane', () => {
        const geometries = [geometryWithPlane(7, VALID_PLANE)];
        const { result } = renderHook(() => useFaceSelection({ geometries, code: 'return [box];' }));
        act(() => result.current.setSelectedFace({ shapeIndex: 0, faceId: 7 }));
        expect(result.current.selectedFace).toEqual({ shapeIndex: 0, faceId: 7 });
        expect(result.current.selectedFacePlane).toMatchObject({ origin: [0, 0, 10], normal: [0, 0, 1] });
        act(() => result.current.setSelectedFace(null));
        expect(result.current.selectedFace).toBeNull();
        expect(result.current.selectedFacePlane).toBeNull();
    });

    it('keeps a selection for an unknown shape index but yields a null plane', () => {
        const { result } = renderHook(() => useFaceSelection({ geometries: [], code: '' }));
        act(() => result.current.setSelectedFace({ shapeIndex: 3, faceId: 1 }));
        expect(result.current.selectedFace).toEqual({ shapeIndex: 3, faceId: 1 });
        expect(result.current.selectedFacePlane).toBeNull();
    });

    it('surfaces a valid plane without entering sketch mode when not selecting', () => {
        const geometries = [geometryWithPlane(7, VALID_PLANE)];
        const onSketchModeChange = vi.fn();
        const { result } = renderHook(() => useFaceSelection({ geometries, code: 'return [box];', onSketchModeChange }));
        act(() => result.current.setSelectedFace({ shapeIndex: 0, faceId: 7 }));
        expect(result.current.selectedFacePlane).toEqual({ origin: [0, 0, 10], normal: [0, 0, 1] });
        expect(onSketchModeChange).not.toHaveBeenCalled();
        expect(result.current.isFaceSelecting).toBe(false);
    });

    it('enters sketch mode with the returned variable name while selecting', () => {
        const geometries = [geometryWithPlane(7, VALID_PLANE)];
        const onSketchModeChange = vi.fn<(mode: SketchModeState) => void>();
        const { result } = renderHook(() => useFaceSelection({ geometries, code: 'return [box];', onSketchModeChange }));
        act(() => result.current.startFaceSelection());
        act(() => result.current.setSelectedFace({ shapeIndex: 0, faceId: 7 }));
        expect(onSketchModeChange).toHaveBeenCalledTimes(1);
        const mode = onSketchModeChange.mock.calls[0][0];
        expect(mode.active).toBe(true);
        expect(mode.currentSketch).toBeNull();
        expect(mode.tool).toBe('line');
        expect(mode.plane).toMatchObject({
            name: 'Face 7 of box',
            type: 'face',
            origin: [0, 0, 10],
            normal: [0, 0, 1],
            xDir: [1, 0, 0],
            visible: true,
            parentId: 'box',
            faceId: 7,
        });
        expect(mode.plane.id.startsWith('face-7-')).toBe(true);
        expect(result.current.selectedFacePlane).toEqual({ origin: [0, 0, 10], normal: [0, 0, 1] });
        expect(result.current.isFaceSelecting).toBe(false);
    });

    it('stays out of sketch mode when the plane has a non-numeric origin component', () => {
        const geometries = [geometryWithPlane(7, { origin: [0, 0, NaN], normal: [0, 0, 1] })];
        const onSketchModeChange = vi.fn();
        const { result } = renderHook(() => useFaceSelection({ geometries, code: 'return [box];', onSketchModeChange }));
        act(() => result.current.startFaceSelection());
        act(() => result.current.setSelectedFace({ shapeIndex: 0, faceId: 7 }));
        expect(result.current.selectedFace).toEqual({ shapeIndex: 0, faceId: 7 });
        expect(result.current.selectedFacePlane).toBeNull();
        expect(onSketchModeChange).not.toHaveBeenCalled();
        expect(result.current.isFaceSelecting).toBe(false);
    });

    it('stays out of sketch mode for a face without plane data', () => {
        const geometries = [geometryWithPlane(7)];
        const onSketchModeChange = vi.fn();
        const { result } = renderHook(() => useFaceSelection({ geometries, code: 'return [box];', onSketchModeChange }));
        act(() => result.current.startFaceSelection());
        act(() => result.current.setSelectedFace({ shapeIndex: 0, faceId: 7 }));
        expect(result.current.selectedFacePlane).toBeNull();
        expect(onSketchModeChange).not.toHaveBeenCalled();
        expect(result.current.isFaceSelecting).toBe(false);
    });
});
