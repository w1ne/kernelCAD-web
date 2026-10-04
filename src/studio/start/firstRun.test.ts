// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import {
    COACH_MARKS_KEY, coachMarksPending, firstRunAllowed, isAutomatedBrowser, isViewportEmpty, markCoachMarksSeen,
    type ViewportContent,
} from './firstRun';

const studio = { viewerMode: false, showHeader: true, pathname: '/', search: '' };

describe('firstRunAllowed', () => {
    it('allows the editable Studio', () => {
        expect(firstRunAllowed(studio)).toBe(true);
        expect(firstRunAllowed({ ...studio, pathname: '/studio' })).toBe(true);
    });

    it('never runs on a shared page, an embed or a supplied source', () => {
        expect(firstRunAllowed({ ...studio, pathname: '/p/abc123' })).toBe(false);
        expect(firstRunAllowed({ ...studio, pathname: '/p/abc123', search: '?view=studio' })).toBe(false);
        expect(firstRunAllowed({ ...studio, pathname: '/embed/abc123' })).toBe(false);
        expect(firstRunAllowed({ ...studio, pathname: '/g/gen1' })).toBe(false);
        expect(firstRunAllowed({ ...studio, viewerMode: true })).toBe(false);
        expect(firstRunAllowed({ ...studio, showHeader: false })).toBe(false);
        for (const key of ['script', 'gallery', 'headless']) {
            expect(firstRunAllowed({ ...studio, search: `?${key}=x` })).toBe(false);
        }
    });
});

describe('isViewportEmpty', () => {
    const empty: ViewportContent = {
        isReady: true, isComputing: false, error: null, executionCount: 1,
        geometryCount: 0, sketchCount: 0, previewCount: 0, sketching: false,
    };

    it('is empty after a clean run with nothing to show', () => {
        expect(isViewportEmpty(empty)).toBe(true);
    });

    it('is not empty before the first result, while running, on an error, or with anything drawn', () => {
        expect(isViewportEmpty({ ...empty, isReady: false })).toBe(false);
        expect(isViewportEmpty({ ...empty, executionCount: 0 })).toBe(false);
        expect(isViewportEmpty({ ...empty, isComputing: true })).toBe(false);
        expect(isViewportEmpty({ ...empty, error: 'boom' })).toBe(false);
        expect(isViewportEmpty({ ...empty, geometryCount: 1 })).toBe(false);
        expect(isViewportEmpty({ ...empty, sketchCount: 1 })).toBe(false);
        expect(isViewportEmpty({ ...empty, previewCount: 1 })).toBe(false);
        expect(isViewportEmpty({ ...empty, sketching: true })).toBe(false);
    });
});

describe('coach-mark flag', () => {
    function memory(): Storage {
        const data = new Map<string, string>();
        return {
            getItem: (k) => data.get(k) ?? null,
            setItem: (k, v) => void data.set(k, v),
        } as Storage;
    }

    it('is pending once, then seen', () => {
        const storage = memory();
        expect(coachMarksPending(storage)).toBe(true);
        markCoachMarksSeen(storage);
        expect(storage.getItem(COACH_MARKS_KEY)).toBe('done');
        expect(coachMarksPending(storage)).toBe(false);
    });

    it('reads blocked storage as seen and never throws', () => {
        const blocked = {
            getItem: () => { throw new Error('SecurityError'); },
            setItem: () => { throw new Error('SecurityError'); },
        } as unknown as Storage;
        expect(coachMarksPending(blocked)).toBe(false);
        expect(() => markCoachMarksSeen(blocked)).not.toThrow();
    });

    it('treats an automated browser as automated', () => {
        expect(isAutomatedBrowser({ webdriver: true })).toBe(true);
        expect(isAutomatedBrowser({ webdriver: false })).toBe(false);
    });
});
