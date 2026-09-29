// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { clampInspectorWidth, fitInspectorWidth, inspectorWidthForKey } from '../logic/inspectorWidth';

describe('inspector width', () => {
    it('clamps to 280–560 px and falls back to 340 for junk', () => {
        expect(clampInspectorWidth(100)).toBe(280);
        expect(clampInspectorWidth(9000)).toBe(560);
        expect(clampInspectorWidth(Number.NaN)).toBe(340);
    });

    it('ArrowLeft widens (the panel is on the right), ArrowRight narrows, Home/End jump', () => {
        expect(inspectorWidthForKey(340, 'ArrowLeft')).toBe(356);
        expect(inspectorWidthForKey(340, 'ArrowRight')).toBe(324);
        expect(inspectorWidthForKey(340, 'Home')).toBe(280);
        expect(inspectorWidthForKey(340, 'End')).toBe(560);
        expect(inspectorWidthForKey(340, 'Enter')).toBeNull();
    });

    it('leaves the model room on a narrow window, never below the minimum', () => {
        expect(fitInspectorWidth(340, 1440)).toBe(340);
        expect(fitInspectorWidth(560, 600)).toBe(490);
        expect(fitInspectorWidth(340, 390)).toBe(280);
    });
});
