// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import type { ViewerDimension } from '../../../../shared/intent/viewerDimension';
import { boundsDimensions } from './boundsDimensions';
import { dimensionColor, dimensionFrame, measuresSame, placeDimensions, withoutAutoDuplicates } from './placement';

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

    it('moves a short linear dimension perpendicular to itself by at most half its length', () => {
        const thickness: ViewerDimension = { id: 'declared:0', kind: 'linear', a: [0, 0, 0], b: [0, 0, 4], text: '4', source: 'declared' };
        const [placed] = placeDimensions([thickness, ...plate]);
        const moved = placed.a.map((x, k) => x - thickness.a[k]);
        expect(Math.hypot(...moved)).toBeCloseTo(2, 9);
        expect(moved[2]).toBeCloseTo(0, 9);
        expect(placed.b[2] - placed.a[2]).toBeCloseTo(4, 9);
    });

    it('offers other label anchors: along and beyond a line, around a hole', () => {
        const hole: ViewerDimension = {
            id: 'auto:holes:root:0', kind: 'diameter', a: [2.5, 10, 10], b: [7.5, 10, 10],
            centre: [5, 10, 10], axis: [0, 0, 1], text: 'Ø5', source: 'auto',
        };
        const placed = placeDimensions([...plate, hole]);
        const [length] = placed;
        expect(length.labelAlternates![0]).toEqual(length.a.map((x, k) => x + (length.b[k] - x) * 0.25));
        const callout = placed.find((p) => p.id === hole.id)!;
        // The other three sides: same height along the axis, same distance from the hole.
        const dist = (p: number[]) => Math.hypot(p[0] - 5, p[1] - 10, p[2] - 10);
        callout.labelAlternates!.slice(0, 3).forEach((p) => {
            expect(p[2]).toBeCloseTo(callout.labelAt![2], 9);
            expect(dist(p)).toBeCloseTo(dist(callout.labelAt!), 9);
        });
        expect(callout.labelAlternates).toHaveLength(11);
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

    it('frames the layout on the body, not on a far-away angular apex', () => {
        // Two nearly parallel edges meet far outside the 40 x 20 x 10 plate.
        const angle: ViewerDimension = {
            id: 'declared:0', kind: 'angular', a: [20, 0, 10], b: [20, 20, 10],
            centre: [5000, 10, 10], text: '0.2°', source: 'declared',
        };
        const box = { min: [0, 0, 0] as const, max: [40, 20, 10] as const };
        const expectOnPlate = (placed: ReturnType<typeof placeDimensions>) => {
            // Overall extents stay on the plate's edges and every line within
            // one diagonal of its centre (the apex is 5 m away).
            placed.filter((p) => p.id.startsWith('auto:')).forEach((p) => p.extension!.forEach(([from]) => from.forEach((x, k) => {
                expect(x).toBeGreaterThanOrEqual(box.min[k] - 1e-9);
                expect(x).toBeLessThanOrEqual(box.max[k] + 1e-9);
            })));
            placed.forEach((p) => [p.a, p.b].forEach((q) => expect(Math.hypot(q[0] - 20, q[1] - 10, q[2] - 5)).toBeLessThan(diag)));
        };
        expectOnPlate(placeDimensions([angle, ...plate], [1, 1, 1]));
        // Payload bounds that also cover a meshed tool body (z -5..15) do not
        // move the frame off the kernel's overall extents.
        expectOnPlate(placeDimensions([angle, ...plate], [1, 1, 1], { min: [0, 0, -5], max: [40, 20, 15] }));
        // Without overall extents, the payload bounds frame the layout.
        expect(dimensionFrame([angle], box)).toMatchObject({ lo: [0, 0, 0], hi: [40, 20, 10] });
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

describe('withoutAutoDuplicates', () => {
    const dim = (id: string, kind: ViewerDimension['kind'], a: [number, number, number], b: [number, number, number], extra: Partial<ViewerDimension> = {}): ViewerDimension =>
        ({ id, kind, a, b, text: id, source: id.startsWith('declared') ? 'declared' : 'auto', ...extra });
    const z: [number, number, number] = [0, 0, -1];

    it('drops an automatic hole callout of the same size, even one standing for a group', () => {
        const declared = dim('declared:0', 'diameter', [12.5, 8, 6], [7.5, 8, 6], { axis: z });
        expect(measuresSame(declared, dim('auto:holes:p:0', 'diameter', [50, 10.5, 6], [50, 5.5, 6], { axis: z }))).toBe(true);
        expect(measuresSame(declared, dim('auto:holes:p:1', 'diameter', [53, 8, 6], [47, 8, 6], { axis: z }))).toBe(false);
        expect(measuresSame(declared, dim('auto:holes:p:2', 'diameter', [12.5, 8, 6], [7.5, 8, 6], { axis: [1, 0, 0] }))).toBe(false);
        expect(measuresSame(declared, dim('auto:radii:p:0', 'radius', [12.5, 8, 6], [7.5, 8, 6], { axis: z }))).toBe(false);
    });

    it('drops an automatic linear dimension between the same points, in either order', () => {
        const declared = dim('declared:0', 'linear', [0, 0, 0], [60, 0, 0]);
        expect(measuresSame(declared, dim('auto:overall:m:0', 'linear', [60, 0, 0], [0, 0, 0]))).toBe(true);
        // Same length and direction elsewhere: an overall extent is kept.
        expect(measuresSame(declared, dim('auto:overall:m:1', 'linear', [0, 40, 0], [60, 40, 0]))).toBe(false);
    });

    it('drops an automatic hole spacing of the same size and direction between other holes of the pattern', () => {
        const declared = dim('declared:1', 'linear', [10, 8, 6], [10, 26, 6]);
        expect(measuresSame(declared, dim('auto:spacing:p:1', 'linear', [50, 8, 6], [50, 26, 6]))).toBe(true);
        expect(measuresSame(declared, dim('auto:spacing:p:0', 'linear', [50, 8, 6], [32, 8, 6]))).toBe(false);
    });

    it('keeps everything when nothing is declared, and never drops a declared dimension', () => {
        const auto = [dim('auto:spacing:p:0', 'linear', [0, 0, 0], [10, 0, 0])];
        expect(withoutAutoDuplicates(auto)).toEqual(auto);
        const both = [dim('declared:0', 'linear', [0, 0, 0], [10, 0, 0]), dim('declared:1', 'linear', [0, 0, 0], [10, 0, 0])];
        expect(withoutAutoDuplicates([...both, ...auto])).toEqual(both);
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
