// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { contrastRatio, parseHex } from './contrast';
import { menuKey, placeMenu } from './menuModel';
import { formatNumber, keyStep, normalize, parseNumber, stepDecimals } from './numberModel';
import { nearestSnap, snapForKey } from './sheetModel';
import { splitTabs } from './tabsModel';
import { dropToast, MAX_TOASTS, pushToast, toastDuration, type ToastItem } from './toastModel';

describe('contrast', () => {
    it('matches the WCAG reference values', () => {
        expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
        expect(contrastRatio('#fff', '#fff')).toBeCloseTo(1, 5);
        // The two failures the spec found on vellum.
        expect(contrastRatio('#B87333', '#F4ECD7')).toBeLessThan(4.5);
        expect(contrastRatio('#97A0AC', '#F4ECD7')).toBeLessThan(4.5);
    });
    it('rejects bad input', () => {
        expect(() => parseHex('red')).toThrow();
    });
});

describe('numberModel', () => {
    it('parses numbers with units and commas', () => {
        expect(parseNumber('12.5 mm')).toBe(12.5);
        expect(parseNumber('12,5')).toBe(12.5);
        expect(parseNumber('-3°')).toBe(-3);
        expect(parseNumber('.5')).toBe(0.5);
        expect(parseNumber('abc')).toBeNull();
        expect(parseNumber('')).toBeNull();
        expect(parseNumber('1 2')).toBeNull();
    });
    it('clamps and removes float noise', () => {
        expect(normalize(0.1 + 0.2, { step: 0.1 })).toBe(0.3);
        expect(normalize(500, { min: 0, max: 100 })).toBe(100);
        expect(normalize(-5, { min: 0 })).toBe(0);
    });
    it('steps with modifiers', () => {
        expect(keyStep(1, { shiftKey: true, altKey: false })).toBe(10);
        expect(keyStep(1, { shiftKey: false, altKey: true })).toBe(0.1);
        expect(stepDecimals(0.25)).toBe(2);
        expect(stepDecimals(1e-7)).toBe(7);
        expect(formatNumber(30.200000000001, 0.1)).toBe('30.2');
    });
});

describe('sheetModel', () => {
    const snaps = [0.25, 0.55, 0.9];
    it('snaps to the nearest point', () => {
        expect(nearestSnap(0.3, snaps)).toBe(0);
        expect(nearestSnap(0.7, snaps)).toBe(1);
        expect(nearestSnap(0.8, snaps)).toBe(2);
    });
    it('moves between snaps by key', () => {
        expect(snapForKey('ArrowUp', 1, 3)).toBe(2);
        expect(snapForKey('ArrowUp', 2, 3)).toBe(2);
        expect(snapForKey('ArrowDown', 0, 3)).toBe(0);
        expect(snapForKey('End', 0, 3)).toBe(2);
        expect(snapForKey('a', 0, 3)).toBeNull();
    });
});

describe('splitTabs', () => {
    const items = [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B', available: false },
        { id: 'c', label: 'C' },
        { id: 'd', label: 'D' },
        { id: 'e', label: 'E' },
    ];
    it('hides unavailable tabs instead of disabling them', () => {
        expect(splitTabs(items, 'a', undefined).shown.map((t) => t.id)).toEqual(['a', 'c', 'd', 'e']);
    });
    it('moves extra tabs to overflow and keeps the selected tab visible', () => {
        const r = splitTabs(items, 'e', 3);
        expect(r.shown.map((t) => t.id)).toEqual(['a', 'e']);
        expect(r.overflow.map((t) => t.id)).toEqual(['c', 'd']);
    });
});

describe('toastModel', () => {
    it('auto-dismisses success and info, keeps errors', () => {
        expect(toastDuration('success')).toBe(2000);
        expect(toastDuration('info')).toBeGreaterThan(2000);
        expect(toastDuration('error')).toBeNull();
    });
    it('keeps at most MAX_TOASTS, dropping the oldest', () => {
        let list: ToastItem[] = [];
        for (let i = 1; i <= MAX_TOASTS + 2; i++) list = pushToast(list, { id: i, tone: 'info', title: String(i) });
        expect(list.map((t) => t.id)).toEqual([3, 4, 5]);
        expect(dropToast(list, 4).map((t) => t.id)).toEqual([3, 5]);
    });
});

describe('menuModel', () => {
    it('moves over enabled items only and wraps', () => {
        const enabled = [0, 2, 3]; // item 1 is disabled
        expect(menuKey('ArrowDown', enabled, 0)).toEqual({ kind: 'focus', index: 2 });
        expect(menuKey('ArrowDown', enabled, 3)).toEqual({ kind: 'focus', index: 0 });
        expect(menuKey('ArrowUp', enabled, 0)).toEqual({ kind: 'focus', index: 3 });
        expect(menuKey('End', enabled, 0)).toEqual({ kind: 'focus', index: 3 });
        expect(menuKey('Enter', enabled, 0)).toEqual({ kind: 'select' });
        expect(menuKey('Escape', enabled, 0)).toEqual({ kind: 'close' });
        expect(menuKey('x', enabled, 0)).toBeNull();
    });
    it('opens above the trigger when there is no room below, and stays on screen', () => {
        const vp = { width: 400, height: 300 };
        const anchor = { top: 260, bottom: 290, left: 380, right: 400 };
        const p = placeMenu(anchor, { width: 180, height: 120 }, 'start', vp);
        expect(p.top).toBe(260 - 4 - 120);
        expect(p.left).toBe(400 - 180 - 8);
    });
});
