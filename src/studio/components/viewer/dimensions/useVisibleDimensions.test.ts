// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { boundsDimensions } from './boundsDimensions';
import { placeDimensions } from './placement';
import { prepareLabelPass, runLabelPass, screenLabels } from './useVisibleDimensions';

function topCamera(): THREE.Camera {
    const cam = new THREE.OrthographicCamera(-40, 40, 30, -30, 0.1, 1000);
    cam.position.set(20, 10, 100);
    cam.lookAt(20, 10, 0);
    cam.updateMatrixWorld();
    return cam;
}

describe('screenLabels', () => {
    const placed = placeDimensions(boundsDimensions({ min: [0, 0, 0], max: [40, 20, 10] }), [1, 1, 1]);
    const size = { width: 800, height: 600 };

    it('leaves out a dimension seen end-on (the height from straight above)', () => {
        const ids = screenLabels(placed, topCamera(), size).map((l) => l.id);
        expect(ids).toEqual(['auto:bounds:root:0', 'auto:bounds:root:1']);
    });

    it('leaves out a dimension seen nearly end-on in perspective (depth from the front)', () => {
        const cam = new THREE.PerspectiveCamera(40, 800 / 600, 0.1, 1000);
        cam.position.set(20, -120, 5);
        cam.lookAt(20, 10, 5);
        cam.updateMatrixWorld();
        const ids = screenLabels(placeDimensions(boundsDimensions({ min: [0, 0, 0], max: [40, 20, 10] }), [1, -1, 1]), cam, size)
            .map((l) => l.id);
        expect(ids).toEqual(['auto:bounds:root:0', 'auto:bounds:root:2']);
    });

    it('centres each label box on its anchor', () => {
        const [length] = screenLabels(placed, topCamera(), size);
        // x-extent midpoint is x=20 (the view centre); box is centred there.
        expect(length.box.x + length.box.w / 2).toBeCloseTo(400, 3);
        expect(length.box.w).toBeGreaterThan(0);
    });

    it('moves a colliding label to its first free alternative anchor', () => {
        const [first] = placeDimensions(boundsDimensions({ min: [0, 0, 0], max: [40, 20, 10] }), [1, 1, 1]);
        // A second dimension whose label would sit exactly on the first one.
        const twin = { ...first, id: 'declared:twin', priority: 1, labelAlternates: [first.a.map((x, k) => (x + first.b[k]) / 2) as [number, number, number], [20, 10, 30] as [number, number, number]] };
        const pass = prepareLabelPass([first, twin]);
        runLabelPass(pass, topCamera(), size);
        expect(pass.shown).toEqual([true, true]);
        expect(pass.anchor).toEqual([0, 2]);
    });
});
