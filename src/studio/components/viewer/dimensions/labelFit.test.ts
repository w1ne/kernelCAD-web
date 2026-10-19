// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { clampLabelCentre, compactDimensionLabel, labelBoxSize } from './labelFit';

describe('compactDimensionLabel', () => {
    it('drops notes in brackets and keeps the value', () => {
        expect(compactDimensionLabel('reachable width (pencil tip, collision-free) 140')).toBe('reachable width 140');
        expect(compactDimensionLabel('reachable depth (pencil tip, collision-free) 87.5')).toBe('reachable depth 87.5');
    });

    it('leaves short labels alone', () => {
        expect(compactDimensionLabel('80')).toBe('80');
        expect(compactDimensionLabel('Ø 6.4')).toBe('Ø 6.4');
    });

    it('cuts a long name with an ellipsis but keeps the trailing value', () => {
        const out = compactDimensionLabel('distance between the left mounting hole and the right edge 42.5');
        expect(out.endsWith(' 42.5')).toBe(true);
        expect(out).toContain('…');
        expect(out.length).toBeLessThanOrEqual(24);
    });

    it('cuts a long label without a number at the end', () => {
        const out = compactDimensionLabel('a very long label with no value at the end of it');
        expect(out.endsWith('…')).toBe(true);
        expect(out.length).toBeLessThanOrEqual(22);
    });
});

describe('labelBoxSize', () => {
    it('is smaller for the compact label', () => {
        const label = 'reachable width (pencil tip, collision-free) 140';
        expect(labelBoxSize(label, undefined, true).w).toBeLessThan(labelBoxSize(label, undefined, false).w / 2);
    });
});

describe('clampLabelCentre', () => {
    it('slides a label that runs past the left edge back inside', () => {
        // The "80" label at x = 8 on a 390 px canvas, 36 px wide.
        expect(clampLabelCentre(8, 300, 36, 22, 390, 744)).toEqual([22, 300]);
    });

    it('slides a wide label off the right and bottom edges', () => {
        const [x, y] = clampLabelCentre(380, 740, 200, 20, 390, 744);
        expect(x + 100).toBeLessThanOrEqual(390);
        expect(y + 10).toBeLessThanOrEqual(744);
    });

    it('centres a label wider than the canvas', () => {
        expect(clampLabelCentre(50, 100, 500, 20, 390, 744)[0]).toBe(195);
    });

    it('pulls in a label whose anchor is just past the edge', () => {
        expect(clampLabelCentre(-8, 300, 28, 20, 390, 744)).toEqual([18, 300]);
    });

    it('leaves a label whose anchor is far off the canvas', () => {
        expect(clampLabelCentre(-200, 100, 60, 20, 390, 744)).toEqual([-200, 100]);
    });
});
