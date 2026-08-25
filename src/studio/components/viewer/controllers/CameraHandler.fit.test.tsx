// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
//
// Regression cover for the two ways the viewer used to hand a visitor an
// unusable first frame:
//
//  1. The initial framing was a ~600ms tween that ANY pointer-down on the
//     canvas cancelled, and `lastFitBounds` had already been stamped so no
//     later run re-issued it. The camera stayed wherever the tween had got to
//     — for a model straddling the default (40,40,40) camera, that is inside
//     the part, i.e. a blank embed until the viewer finds the home button.
//  2. `distance = radius * 2.8` framed the bounding sphere with a
//     tangent-derived constant and no aspect term, so the model overflowed the
//     frame — mildly at 16:9, badly on anything portrait.
//
// Both are asserted on the camera the controller actually produces: does the
// scene's bounding sphere sit inside the resulting frustum?

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import type { GeometryResult } from '../../../../shared/worker/geometryEngine';

interface FiberState { camera: THREE.PerspectiveCamera; controls: OrbitControls | null }

let fiberState: FiberState;
let frameCallback: ((state: unknown, delta: number) => void) | null = null;
let sketchMode: { active: boolean; plane?: unknown } = { active: false };

vi.mock('@react-three/fiber', () => ({
    useThree: () => fiberState,
    // R3F keeps the LATEST callback in a mutable ref; mirror that.
    useFrame: (cb: (state: unknown, delta: number) => void) => { frameCallback = cb; },
}));

vi.mock('../../../context/WorkbenchContext', () => ({
    useWorkbench: () => ({ selectedFace: null, sketchMode }),
}));

const { CameraHandler } = await import('./CameraHandler');

/** One geometry whose vertex cloud spans `min`..`max`. */
function boxGeometry(min: [number, number, number], max: [number, number, number]): GeometryResult {
    const v = [...min, ...max];
    return {
        faces: [{
            vertices: new Float32Array(v),
            indices: new Uint32Array(),
            normals: new Float32Array(v.length),
            faceId: 0,
        }],
    } as GeometryResult;
}

function boundingSphere(min: [number, number, number], max: [number, number, number]) {
    const lo = new THREE.Vector3(...min);
    const hi = new THREE.Vector3(...max);
    return {
        center: lo.clone().add(hi).multiplyScalar(0.5),
        radius: Math.max(lo.distanceTo(hi) / 2, 1),
    };
}

/** Signed slack, in world units, of the tightest frustum plane. Negative = clipped. */
function frustumSlack(camera: THREE.PerspectiveCamera, center: THREE.Vector3, radius: number): number {
    camera.updateMatrixWorld(true);
    camera.updateProjectionMatrix();
    const frustum = new THREE.Frustum().setFromProjectionMatrix(
        new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
    );
    return Math.min(...frustum.planes.map((p) => p.distanceToPoint(center) - radius));
}

function mountViewer(width: number, height: number) {
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(40, 40, 40);
    camera.lookAt(0, 0, 0);
    const canvas = document.createElement('canvas');
    const controls = new OrbitControls(camera, canvas as unknown as HTMLElement);
    fiberState = { camera, controls };
    return { camera, controls };
}

function runFrames(count: number) {
    act(() => {
        for (let i = 0; i < count; i += 1) frameCallback?.({}, 1 / 60);
    });
}

beforeEach(() => {
    frameCallback = null;
    sketchMode = { active: false };
});

afterEach(() => {
    cleanup();
    fiberState?.controls?.dispose();
});

describe('CameraHandler initial framing', () => {
    // A model that straddles the default camera: the corner (40,30,20) sits
    // right beside the default eye at (40,40,40), so a framing that never
    // lands leaves the viewer staring at (or inside) the part.
    const MIN: [number, number, number] = [0, 0, 0];
    const MAX: [number, number, number] = [40, 30, 20];

    it('frames the model even when the viewer touches the canvas as it loads', () => {
        const { camera, controls } = mountViewer(1280, 720);
        const { rerender } = render(<CameraHandler geometries={[]} />);

        rerender(<CameraHandler geometries={[boxGeometry(MIN, MAX)]} />);
        // The visitor's pointer lands on the canvas the instant geometry shows
        // up. OrbitControls fires 'start'; the old code dropped the framing.
        act(() => { controls.dispatchEvent({ type: 'start' }); });
        runFrames(240);

        const sphere = boundingSphere(MIN, MAX);
        expect(frustumSlack(camera, sphere.center, sphere.radius)).toBeGreaterThan(0);
    });

    it('frames the model inside the frustum on a 16:9 viewport', () => {
        const { camera } = mountViewer(1280, 720);
        const { rerender } = render(<CameraHandler geometries={[]} />);
        rerender(<CameraHandler geometries={[boxGeometry(MIN, MAX)]} />);
        runFrames(240);

        const sphere = boundingSphere(MIN, MAX);
        expect(frustumSlack(camera, sphere.center, sphere.radius)).toBeGreaterThan(0);
    });

    it('frames the model inside the frustum on a portrait viewport', () => {
        // camera.fov is the VERTICAL angle, so a tall viewport has a much
        // narrower horizontal one — the axis that actually crops.
        const { camera } = mountViewer(420, 780);
        const { rerender } = render(<CameraHandler geometries={[]} />);
        rerender(<CameraHandler geometries={[boxGeometry(MIN, MAX)]} />);
        runFrames(240);

        const sphere = boundingSphere(MIN, MAX);
        expect(frustumSlack(camera, sphere.center, sphere.radius)).toBeGreaterThan(0);
    });

    it('re-frames on the home/fit request', () => {
        const { camera } = mountViewer(1280, 720);
        const geometries = [boxGeometry(MIN, MAX)];
        const { rerender } = render(<CameraHandler geometries={[]} />);
        rerender(<CameraHandler geometries={geometries} />);
        runFrames(240);

        camera.position.set(400, 400, 400);
        rerender(
            <CameraHandler geometries={geometries} navigationRequest={{ target: 'fit', id: 1 }} />,
        );
        runFrames(240);

        const sphere = boundingSphere(MIN, MAX);
        expect(frustumSlack(camera, sphere.center, sphere.radius)).toBeGreaterThan(0);
    });
});

describe('CameraHandler anti-twitch behaviour', () => {
    const MIN: [number, number, number] = [0, 0, 0];
    const MAX: [number, number, number] = [40, 30, 20];

    it('leaves the orbit alone when a param nudge wobbles the bounds', () => {
        const { camera } = mountViewer(1280, 720);
        const { rerender } = render(<CameraHandler geometries={[]} />);
        rerender(<CameraHandler geometries={[boxGeometry(MIN, MAX)]} />);
        runFrames(240);

        // The user orbits away from the fitted pose.
        const orbited = new THREE.Vector3(-90, 20, 130);
        camera.position.copy(orbited);

        // A slider moves a joint: the tessellated AABB shifts a hair.
        rerender(<CameraHandler geometries={[boxGeometry([0, 0, 0], [40.2, 30.1, 20.05])]} />);
        runFrames(240);

        expect(camera.position.distanceTo(orbited)).toBeLessThan(0.001);
    });

    it('still yields to the user when a real shape change re-fits', () => {
        const { camera, controls } = mountViewer(1280, 720);
        const { rerender } = render(<CameraHandler geometries={[]} />);
        rerender(<CameraHandler geometries={[boxGeometry(MIN, MAX)]} />);
        runFrames(240);

        const orbited = new THREE.Vector3(-90, 20, 130);
        camera.position.copy(orbited);

        // A genuinely different model — this one is allowed to re-fit, but the
        // re-fit is a tween the user can grab out of at any time.
        rerender(<CameraHandler geometries={[boxGeometry([0, 0, 0], [400, 300, 200])]} />);
        runFrames(2);
        act(() => { controls.dispatchEvent({ type: 'start' }); });
        const grabbed = camera.position.clone();
        runFrames(240);

        expect(camera.position.distanceTo(grabbed)).toBeLessThan(0.001);
    });
});
