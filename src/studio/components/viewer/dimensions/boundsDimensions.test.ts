// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import type { ViewerDimension } from '../../../../shared/intent/viewerDimension';
import { boundsDimensions, resolveViewerDimensions } from './boundsDimensions';

describe('boundsDimensions', () => {
    it('legacy payload shows bounds dimensions', () => {
        expect(boundsDimensions({ min: [0, 0, 0], max: [40, 20, 10] }).map(d => d.text)).toEqual(['40', '20', '10']);
    });
    it('are auto linear dimensions along the box edges, one decimal at most', () => {
        const dims = boundsDimensions({ min: [-1, 0, 0], max: [11.25, 3, 2] });
        expect(dims.map(d => d.text)).toEqual(['12.3', '3', '2']);
        expect(dims.every(d => d.kind === 'linear' && d.source === 'auto')).toBe(true);
        expect(dims[0].a).toEqual([-1, 0, 0]);
        expect(dims[0].b).toEqual([11.25, 0, 0]);
        expect(new Set(dims.map(d => d.id)).size).toBe(3);
    });
    it('skips zero-length extents', () => {
        expect(boundsDimensions({ min: [0, 0, 0], max: [5, 5, 0] }).map(d => d.text)).toEqual(['5', '5']);
    });
});

describe('resolveViewerDimensions', () => {
    const declared = { id: 'declared:0', source: 'declared', kind: 'linear', a: [0, 0, 0], b: [1, 0, 0], text: '1' } as ViewerDimension;
    it('uses payload dimensions when present', () => {
        expect(resolveViewerDimensions({ dimensions: [declared], bounds: { min: [0, 0, 0], max: [1, 1, 1] } }))
            .toEqual({ dimensions: [declared], legacy: false });
    });
    it('falls back to bounds and flags legacy payloads', () => {
        const r = resolveViewerDimensions({ bounds: { min: [0, 0, 0], max: [40, 20, 10] } });
        expect(r.legacy).toBe(true);
        expect(r.dimensions.map(d => d.text)).toEqual(['40', '20', '10']);
    });
    it('is empty without a payload', () => {
        expect(resolveViewerDimensions(null)).toEqual({ dimensions: [], legacy: false });
    });
});
