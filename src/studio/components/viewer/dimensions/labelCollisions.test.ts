// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { visibleLabels } from './labelCollisions';

describe('visibleLabels', () => {
    it('hides the lower-priority of two overlapping labels', () => {
        const kept = visibleLabels([
            { id: 'a', priority: 0, box: { x: 0, y: 0, w: 40, h: 12 } },
            { id: 'b', priority: 1, box: { x: 10, y: 4, w: 40, h: 12 } },
        ]);
        expect(kept).toEqual(['a']);
    });
    it('keeps the higher priority even when listed second', () => {
        const kept = visibleLabels([
            { id: 'b', priority: 1, box: { x: 10, y: 4, w: 40, h: 12 } },
            { id: 'a', priority: 0, box: { x: 0, y: 0, w: 40, h: 12 } },
        ]);
        expect(kept).toEqual(['a']);
    });
    it('keeps labels that only touch', () => {
        const kept = visibleLabels([
            { id: 'a', priority: 0, box: { x: 0, y: 0, w: 40, h: 12 } },
            { id: 'b', priority: 1, box: { x: 40, y: 0, w: 40, h: 12 } },
        ]);
        expect(kept).toEqual(['a', 'b']);
    });
    it('a hidden label does not hide a third one', () => {
        const kept = visibleLabels([
            { id: 'a', priority: 0, box: { x: 0, y: 0, w: 40, h: 12 } },
            { id: 'b', priority: 1, box: { x: 30, y: 0, w: 40, h: 12 } },
            { id: 'c', priority: 2, box: { x: 60, y: 0, w: 40, h: 12 } },
        ]);
        expect(kept).toEqual(['a', 'c']);
    });
});
