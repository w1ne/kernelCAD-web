// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { ViewerDimension } from '../../../../shared/intent/viewerDimension';
import { buildFitCameraPose, fitDistance } from '../controllers/cameraPose';
import { placeDimensions } from './placement';
import { prepareLabelPass, runLabelPass } from './useVisibleDimensions';

// viewerDimensionsForModel on examples/gallery/mounting-bracket-dimensioned.kcad.ts.
const BRACKET: ViewerDimension[] = [
    { kind: 'linear', a: [10, 8, 6], b: [50, 8, 6], text: 'hole spacing X 40', id: 'declared:0', source: 'declared' },
    { kind: 'linear', a: [10, 8, 6], b: [10, 26, 6], text: 'hole spacing Y 18', id: 'declared:1', source: 'declared' },
    { kind: 'linear', a: [0, 0, 0], b: [0, 0, 6], text: 'thickness 6', id: 'declared:2', source: 'declared' },
    { kind: 'diameter', a: [12.5, 8, 6], b: [7.5, 8, 6], centre: [10, 8, 6], axis: [0, 0, -1], text: 'bolt hole Ø5', id: 'declared:3', source: 'declared' },
    { kind: 'linear', a: [0, 0, 0], b: [60, 0, 0], text: '60', id: 'auto:overall:model:0', source: 'auto' },
    { kind: 'linear', a: [60, 0, 0], b: [60, 40, 0], text: '40', id: 'auto:overall:model:1', source: 'auto' },
    { kind: 'linear', a: [60, 0, 0], b: [60, 0, 46], text: '46', id: 'auto:overall:model:2', source: 'auto' },
    { kind: 'diameter', a: [50, 10.5, 6], b: [50, 5.5, 6], centre: [50, 8, 6], axis: [0, 0, -1], text: '4× Ø5', id: 'auto:holes:part:0', source: 'auto' },
    { kind: 'linear', a: [50, 8, 6], b: [10, 8, 6], text: '40', id: 'auto:spacing:part:0', source: 'auto' },
    { kind: 'linear', a: [50, 8, 6], b: [50, 26, 6], text: '18', id: 'auto:spacing:part:1', source: 'auto' },
];
const BOUNDS = { min: [0, 0, 0] as const, max: [60, 40, 46] as const };

function fitCamera(size: { width: number; height: number }, dir?: [number, number, number]): THREE.PerspectiveCamera {
    const cam = new THREE.PerspectiveCamera(40, size.width / size.height, 0.1, 5000);
    const centre = new THREE.Vector3(30, 20, 23);
    const radius = Math.hypot(60, 40, 46) / 2;
    const pose = buildFitCameraPose(centre, fitDistance(radius, 40, cam.aspect));
    if (dir) pose.position.copy(centre.clone().add(new THREE.Vector3(...dir).normalize().multiplyScalar(pose.position.distanceTo(centre))));
    cam.position.copy(pose.position);
    cam.up.copy(pose.up);
    cam.lookAt(pose.lookAt);
    cam.updateMatrixWorld();
    return cam;
}

const VIEWS: Array<{ name: string; dir: [number, number, number]; eye: [number, number, number] }> = [
    { name: 'fit (+x +y, above)', dir: [1, 1, 0.75], eye: [1, 1, 1] },
    { name: 'front-left (-x -y, above)', dir: [-1, -1, 0.75], eye: [-1, -1, 1] },
    { name: 'front-right (+x -y, above)', dir: [1, -1, 0.75], eye: [1, -1, 1] },
];
const SIZES = [{ width: 646, height: 958 }, { width: 800, height: 600 }];

/** Ids shown for a view, with the anchor index of each label. */
function shown(view: (typeof VIEWS)[number], size: { width: number; height: number }): Map<string, number> {
    const placed = placeDimensions(BRACKET, view.eye, BOUNDS);
    const pass = prepareLabelPass(placed);
    runLabelPass(pass, fitCamera(size, view.dir), size);
    return new Map(placed.flatMap((d, i) => (pass.shown[i] ? [[d.id, pass.anchor[i]] as const] : [])));
}

describe('mounting bracket layout', () => {
    it('drops the automatic dimensions the declared ones repeat', () => {
        const ids = placeDimensions(BRACKET, [1, 1, 1], BOUNDS).map((d) => d.id);
        expect(ids).toEqual([
            'declared:0', 'declared:1', 'declared:2', 'declared:3',
            'auto:overall:model:0', 'auto:overall:model:1', 'auto:overall:model:2',
        ]);
    });

    it.each(VIEWS.flatMap((view) => SIZES.map((size) => [view.name, size.width, size.height, view, size] as const)))(
        'shows every declared label in the %s view at %ix%i',
        (_name, _w, _h, view, size) => {
            const ids = shown(view, size);
            for (const id of ['declared:0', 'declared:1', 'declared:3']) expect(ids.has(id), id).toBe(true);
            // The thickness is seen end-on from nowhere here; it shows unless
            // the corner it measures is hidden behind the upright (fit view).
            if (view.eye[1] < 0) expect(ids.has('declared:2')).toBe(true);
        },
    );

    it('keeps the thickness line next to the edge it measures', () => {
        for (const view of VIEWS) {
            const thickness = placeDimensions(BRACKET, view.eye, BOUNDS).find((d) => d.id === 'declared:2')!;
            const [[from, to]] = thickness.extension!;
            const moved: [number, number, number] = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
            // Within half the 6 mm it measures, perpendicular to it, outward (-x -y).
            expect(Math.hypot(...moved)).toBeLessThanOrEqual(3 + 1e-9);
            expect(moved[2]).toBeCloseTo(0, 9);
            expect(moved[0]).toBeLessThan(0);
            expect(moved[1]).toBeLessThan(0);
            expect(thickness.a[2]).toBeCloseTo(0, 9);
            expect(thickness.b[2]).toBeCloseTo(6, 9);
        }
    });
});
