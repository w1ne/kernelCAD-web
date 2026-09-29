// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import {
    isInspectorSheet, mobileStatus, mobileTabs, opensFromMore, sheetForInspectorTab, sheetForTab, tabForKey,
    tabForSheet,
} from './mobileShellModel';

describe('mobileShellModel', () => {
    it('lists the tabs, without Agent where the host has none', () => {
        expect(mobileTabs(true)).toEqual(['model', 'agent', 'params', 'code', 'more']);
        expect(mobileTabs(false)).toEqual(['model', 'params', 'code', 'more']);
    });

    it('maps sheets to tabs and back', () => {
        expect(tabForSheet(null)).toBe('model');
        expect(tabForSheet('params')).toBe('params');
        expect(tabForSheet('validity')).toBe('more');
        expect(tabForSheet('status')).toBe('more');
        expect(sheetForTab('model')).toBeNull();
        expect(sheetForTab('code')).toBe('code');
        expect(opensFromMore('tree')).toBe(true);
        expect(opensFromMore('more')).toBe(false);
        expect(opensFromMore('code')).toBe(false);
    });

    it('keeps inspector sheets apart from panes', () => {
        expect(isInspectorSheet('code')).toBe(true);
        expect(isInspectorSheet('validity')).toBe(true);
        expect(isInspectorSheet('agent')).toBe(false);
        expect(isInspectorSheet('tree')).toBe(false);
        expect(isInspectorSheet(null)).toBe(false);
        expect(sheetForInspectorTab('scene')).toBe('tree');
        expect(sheetForInspectorTab('export')).toBe('export');
        expect(sheetForInspectorTab('sections')).toBeNull();
    });

    it('moves along the tab bar with wrap-around', () => {
        expect(tabForKey('ArrowRight', 4, 5)).toBe(0);
        expect(tabForKey('ArrowLeft', 0, 5)).toBe(4);
        expect(tabForKey('Home', 3, 5)).toBe(0);
        expect(tabForKey('End', 0, 5)).toBe(4);
        expect(tabForKey('a', 0, 5)).toBeNull();
    });

    it('turns the status bar into rows', () => {
        const ready = mobileStatus(
            { isComputing: false, error: null, geometryCount: 1, selectedCount: 0, interferences: 0, recomputeMs: 0, viewMode3D: 'wireframe' },
            'v1.2.3',
        );
        expect(ready.tone).toBe('ok');
        expect(ready.state).toBe('Ready');
        expect(ready.detail).toBeNull();
        expect(ready.rows).toEqual([
            { label: 'Bodies', value: '1 body' },
            { label: 'Selection', value: '0 selected' },
            { label: 'Interferences', value: '0' },
            { label: 'View', value: 'Wireframe' },
            { label: 'Version', value: 'v1.2.3' },
        ]);

        const failed = mobileStatus(
            { isComputing: true, error: 'Bad fillet\nstack', geometryCount: 3, selectedCount: 2, interferences: 1, recomputeMs: 40, viewMode3D: 'shaded' },
            'dev',
        );
        expect(failed.tone).toBe('danger');
        expect(failed.state).toBe('Error');
        expect(failed.detail).toBe('Bad fillet');
        expect(failed.rows).toContainEqual({ label: 'Last compute', value: '40 ms' });
        expect(failed.rows[0]).toEqual({ label: 'Bodies', value: '3 bodies' });
    });
});
