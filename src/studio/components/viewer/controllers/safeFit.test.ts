// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { boxCorners, fitPointsToSafeArea, NO_INSETS, occluderInsets, type CanvasInsets } from './safeFit';
import { buildFitCameraPose, fitDistance } from './cameraPose';

// A wide, flat model like the DRAW 01 plotter: 180 x 190 x 80 mm.
const MIN = new THREE.Vector3(0, 0, 0);
const MAX = new THREE.Vector3(180, 190, 80);
const CORNERS = boxCorners(MIN, MAX);
const CENTRE = MIN.clone().add(MAX).multiplyScalar(0.5);
const FOV = 40;
// A 390 x 844 phone: the canvas between the header (44) and the tab bar (56).
const W = 390;
const H = 744;
// The floating toolbar covers the top 62 px.
const TOOLBAR: CanvasInsets = { ...NO_INSETS, top: 62 };

/** Screen pixels (x right, y down) of `points` seen from `pose`. */
function project(points: readonly THREE.Vector3[], pose: { position: THREE.Vector3; lookAt: THREE.Vector3 }) {
    const camera = new THREE.PerspectiveCamera(FOV, W / H, 0.1, 1e5);
    camera.up.set(0, 0, 1);
    camera.position.copy(pose.position);
    camera.lookAt(pose.lookAt);
    camera.updateMatrixWorld();
    return points.map((p) => {
        const v = p.clone().project(camera);
        return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H };
    });
}

function extent(points: { x: number; y: number }[]) {
    return {
        left: Math.min(...points.map((p) => p.x)),
        right: Math.max(...points.map((p) => p.x)),
        top: Math.min(...points.map((p) => p.y)),
        bottom: Math.max(...points.map((p) => p.y)),
    };
}

const direction = buildFitCameraPose(CENTRE, 1).position.clone().sub(CENTRE).normalize();

describe('fitPointsToSafeArea', () => {
    it('keeps every box corner below the toolbar and inside the canvas', () => {
        const pose = fitPointsToSafeArea({
            points: CORNERS, direction, up: new THREE.Vector3(0, 0, 1), fovDegrees: FOV, width: W, height: H, insets: TOOLBAR,
        })!;
        const box = extent(project(CORNERS, pose));
        expect(box.top).toBeGreaterThanOrEqual(62);
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(W);
        expect(box.bottom).toBeLessThanOrEqual(H);
        // Fills the narrow axis (width) minus the 3 % air on each side.
        expect(box.right - box.left).toBeGreaterThan(W * 0.9);
        // Centred in the free area, not the whole canvas.
        const freeMid = (62 + H) / 2;
        expect(Math.abs((box.top + box.bottom) / 2 - freeMid)).toBeLessThan(H * 0.25);
    });

    it('frames a base-and-arm model larger than the bounding-sphere fit', () => {
        // A wide plate with a thin arm in one corner: its box (and sphere) is
        // much bigger than its silhouette.
        const plate = boxCorners(new THREE.Vector3(0, 0, 0), new THREE.Vector3(180, 190, 3));
        const arm = boxCorners(new THREE.Vector3(165, 175, 0), new THREE.Vector3(180, 190, 80));
        const points = [...plate, ...arm];
        const radius = MIN.distanceTo(MAX) / 2;
        const sphere = buildFitCameraPose(CENTRE, fitDistance(radius, FOV, W / H));
        const tight = fitPointsToSafeArea({
            points, direction, up: new THREE.Vector3(0, 0, 1), fovDegrees: FOV, width: W, height: H, insets: TOOLBAR,
        })!;
        const sphereBox = extent(project(points, sphere));
        const tightBox = extent(project(points, tight));
        expect(tightBox.right - tightBox.left).toBeGreaterThan((sphereBox.right - sphereBox.left) * 1.03);
        expect(tightBox.top).toBeGreaterThanOrEqual(62);
    });

    it('keeps extra points (dimension endpoints) in view too', () => {
        const far = new THREE.Vector3(-60, 95, 0);
        const pose = fitPointsToSafeArea({
            points: [...CORNERS, far], direction, up: new THREE.Vector3(0, 0, 1), fovDegrees: FOV, width: W, height: H, insets: TOOLBAR,
        })!;
        const [p] = project([far], pose);
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(W);
        expect(p.y).toBeGreaterThanOrEqual(62);
    });

    it('returns null when there is nothing to fit or no free area', () => {
        const up = new THREE.Vector3(0, 0, 1);
        expect(fitPointsToSafeArea({ points: [], direction, up, fovDegrees: FOV, width: W, height: H, insets: NO_INSETS })).toBeNull();
        expect(fitPointsToSafeArea({ points: CORNERS, direction, up, fovDegrees: FOV, width: W, height: H, insets: { ...NO_INSETS, top: H } })).toBeNull();
    });
});

describe('occluderInsets', () => {
    const canvas = new DOMRect(0, 44, 390, 744);

    it('counts a wide bar at the top as a top inset', () => {
        expect(occluderInsets(canvas, [new DOMRect(12, 52, 366, 54)]).top).toBe(62);
    });

    it('ignores a small corner widget and anything off the canvas', () => {
        expect(occluderInsets(canvas, [new DOMRect(300, 600, 80, 80), new DOMRect(0, 0, 390, 44)])).toEqual(NO_INSETS);
    });

    it('counts a wide bar at the bottom as a bottom inset', () => {
        expect(occluderInsets(canvas, [new DOMRect(0, 700, 390, 88)]).bottom).toBe(88);
    });
});
