// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
//
// The label pass runs inside the Canvas frame loop. It must do no work when
// the view is unchanged and must not allocate per frame.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import * as THREE from 'three';

type FrameCb = (state: { camera: THREE.Camera; size: { width: number; height: number } }) => void;
const frame = vi.hoisted(() => ({ cb: null as null | FrameCb }));
vi.mock('@react-three/fiber', () => ({ useFrame: (cb: FrameCb) => { frame.cb = cb; } }));

import { boundsDimensions } from './boundsDimensions';
import { placeDimensions } from './placement';
import { prepareLabelPass, runLabelPass, useVisibleDimensions } from './useVisibleDimensions';

function camera(x: number): THREE.PerspectiveCamera {
    const cam = new THREE.PerspectiveCamera(40, 800 / 600, 0.1, 1000);
    cam.position.set(x, 80, 60);
    cam.lookAt(20, 10, 5);
    cam.updateMatrixWorld();
    return cam;
}

const size = { width: 800, height: 600 };
const placed = placeDimensions(boundsDimensions({ min: [0, 0, 0], max: [40, 20, 10] }), [1, 1, 1]);

afterEach(() => vi.restoreAllMocks());

describe('runLabelPass', () => {
    it('reports a change only when the visible set changes', () => {
        const pass = prepareLabelPass(placed);
        const top = new THREE.OrthographicCamera(-40, 40, 30, -30, 0.1, 1000);
        top.position.set(20, 10, 100);
        top.lookAt(20, 10, 0);
        top.updateMatrixWorld();
        expect(runLabelPass(pass, top, size)).toBe(true); // height hidden from above
        expect(pass.shown).toEqual([true, true, false]);
        expect(runLabelPass(pass, top, size)).toBe(false);
        expect(runLabelPass(pass, camera(90), size)).toBe(true);
        expect(pass.shown).toEqual([true, true, true]);
    });
});

describe('useVisibleDimensions', () => {
    it('skips the pass while the camera and canvas size are unchanged', () => {
        const project = vi.spyOn(THREE.Vector3.prototype, 'project');
        const { result } = renderHook(() => useVisibleDimensions(placed));
        const cam = camera(90);
        act(() => frame.cb!({ camera: cam, size }));
        const first = project.mock.calls.length;
        expect(first).toBe(placed.length * 3);
        act(() => frame.cb!({ camera: cam, size }));
        act(() => frame.cb!({ camera: cam, size: { ...size } }));
        expect(project.mock.calls.length).toBe(first);
        cam.position.x = 95;
        cam.updateMatrixWorld();
        act(() => frame.cb!({ camera: cam, size }));
        expect(project.mock.calls.length).toBe(first * 2);
        act(() => frame.cb!({ camera: cam, size: { width: 400, height: 600 } }));
        expect(project.mock.calls.length).toBe(first * 3);
        expect(result.current.size).toBe(3);
    });
});
