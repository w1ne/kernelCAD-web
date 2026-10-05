// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import type { ViewerDimension } from '../../../../shared/intent/viewerDimension';
import { boundsDimensions } from './boundsDimensions';
import { dimensionColor, placeDimensions } from './placement';

const plate = boundsDimensions({ min: [0, 0, 0], max: [40, 20, 10] });
const diag = Math.hypot(40, 20, 10);

describe('placeDimensions', () => {
    it('moves linear dimensions outward from the box centre by 6% of the diagonal', () => {
        const [length] = placeDimensions(plate, [-1, -1, 1]);
        // Camera on -y, above: x-extent on the near bottom edge y=0, z=0; outward is -y/-z.
        expect(length.a[1]).toBeLessThan(0);
        expect(length.a[2]).toBeLessThan(0);
        const moved = Math.hypot(length.a[0] - 0, length.a[1] - 0, length.a[2] - 0);
        expect(moved).toBeCloseTo(0.06 * diag, 6);
        expect(length.extension).toEqual([[[0, 0, 0], length.a], [[40, 0, 0], length.b]]);
        expect(length.labelAt).toBeUndefined();
    });

    it('puts overall extents on the silhouette edges for the camera octant', () => {
        const edge = (eye: [number, number, number]) =>
            placeDimensions(plate, eye).map((p) => p.extension!.map(([from]) => from));
        // Camera at +x +y +z: x-extent on the front-bottom edge (y=20, z=0),
        // y-extent on the near-side bottom edge (x=40, z=0), z-extent on (x=40, y=0).
        expect(edge([1, 1, 1])).toEqual([
            [[0, 20, 0], [40, 20, 0]],
            [[40, 0, 0], [40, 20, 0]],
            [[40, 0, 0], [40, 0, 10]],
        ]);
        // Camera below (-z): the x-extent moves to the top edge.
        expect(edge([1, 1, -1])[0]).toEqual([[0, 20, 10], [40, 20, 10]]);
    });

    it('keeps a hole callout on the hole and moves only its label', () => {
        const hole: ViewerDimension = {
            id: 'auto:holes:root:0', kind: 'diameter', a: [2.5, 10, 10], b: [7.5, 10, 10],
            centre: [5, 10, 10], text: '2× Ø5', source: 'auto',
        };
        const placed = placeDimensions([...plate, hole]).find((p) => p.id === hole.id)!;
        expect(placed.a).toEqual(hole.a);
        expect(placed.b).toEqual(hole.b);
        expect(placed.kind).toBe('diameter');
        expect(placed.labelAt).toBeDefined();
        const [x, y, z] = placed.labelAt!;
        expect(Math.hypot(x - 5, y - 10, z - 10)).toBeCloseTo(0.06 * diag, 6);
    });

    it('draws angular dimensions as a straight callout with the degree label', () => {
        const angle: ViewerDimension = { id: 'declared:0', kind: 'angular', a: [0, 0, 10], b: [10, 0, 10], text: '90°', source: 'declared' };
        const [placed] = placeDimensions([angle, ...plate]);
        expect(placed.kind).toBe('linear');
        expect(placed.label).toBe('90°');
    });

    it('puts declared dimensions first and passes the part name as the sublabel', () => {
        const declared: ViewerDimension = { id: 'declared:0', kind: 'linear', a: [0, 0, 0], b: [0, 20, 0], text: '20', source: 'declared', part: 'lid' };
        const placed = placeDimensions([...plate, declared]);
        const first = placed.find((p) => p.priority === 0)!;
        expect(first.id).toBe('declared:0');
        expect(first.sublabel).toBe('lid');
        expect(first.source).toBe('declared');
    });
});

describe('dimensionColor', () => {
    afterEach(() => {
        document.documentElement.style.removeProperty('--kc-accent');
        document.documentElement.style.removeProperty('--kc-fg-2');
    });

    it('reads the accent token for declared and the neutral grey token for auto', () => {
        document.documentElement.style.setProperty('--kc-accent', '#1E5FA8');
        document.documentElement.style.setProperty('--kc-fg-2', '#3F4C5E');
        expect(dimensionColor('declared')).toBe('#1e5fa8');
        expect(dimensionColor('auto')).toBe('#3f4c5e');
    });

    it('falls back to the dark-theme values when no theme is loaded', () => {
        expect(dimensionColor('declared')).toBe('#5b9be6');
        expect(dimensionColor('auto')).toBe('#aab3c2');
    });
});
