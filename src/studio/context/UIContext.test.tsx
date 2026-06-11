// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { UIProvider, useUI } from './UIContext';
import { WorkbenchStateProvider } from './WorkbenchStateContext';

function wrapper({ children }: { children: React.ReactNode }) {
    return (
        <WorkbenchStateProvider>
            <UIProvider>{children}</UIProvider>
        </WorkbenchStateProvider>
    );
}

describe('UIContext layout mode', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it('defaults to split layout mode', () => {
        const { result } = renderHook(() => useUI(), { wrapper });
        expect(result.current.layoutMode).toBe('split');
    });

    it('updates and persists layout mode', () => {
        const { result, unmount } = renderHook(() => useUI(), { wrapper });

        act(() => {
            result.current.setLayoutMode('viewport');
        });

        expect(result.current.layoutMode).toBe('viewport');
        expect(window.localStorage.getItem('kernelcad:layoutMode')).toBe('viewport');

        unmount();

        const { result: next } = renderHook(() => useUI(), { wrapper });
        expect(next.current.layoutMode).toBe('viewport');
    });
});

describe('UIContext viewport background', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it('defaults to dark', () => {
        const { result } = renderHook(() => useUI(), { wrapper });
        expect(result.current.viewportBackground).toBe('dark');
    });

    it('persists across remount via localStorage', () => {
        const { result, unmount } = renderHook(() => useUI(), { wrapper });

        act(() => {
            result.current.setViewportBackground('checkered');
        });

        expect(result.current.viewportBackground).toBe('checkered');
        expect(window.localStorage.getItem('kernelcad:viewportBackground')).toBe('checkered');

        unmount();

        const { result: next } = renderHook(() => useUI(), { wrapper });
        expect(next.current.viewportBackground).toBe('checkered');
    });

    it('falls back to dark on a garbage localStorage value', () => {
        window.localStorage.setItem('kernelcad:viewportBackground', 'rainbow');
        const { result } = renderHook(() => useUI(), { wrapper });
        expect(result.current.viewportBackground).toBe('dark');
    });
});

describe('UIContext ground grid visibility', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it('defaults to visible', () => {
        const { result } = renderHook(() => useUI(), { wrapper });
        expect(result.current.gridVisible).toBe(true);
    });

    it('hides and persists across remount via localStorage', () => {
        const { result, unmount } = renderHook(() => useUI(), { wrapper });

        act(() => {
            result.current.setGridVisible(false);
        });

        expect(result.current.gridVisible).toBe(false);
        expect(window.localStorage.getItem('kernelcad:gridVisible')).toBe('false');

        unmount();

        const { result: next } = renderHook(() => useUI(), { wrapper });
        expect(next.current.gridVisible).toBe(false);
    });

    it('treats any non-"false" stored value as visible', () => {
        window.localStorage.setItem('kernelcad:gridVisible', 'garbage');
        const { result } = renderHook(() => useUI(), { wrapper });
        expect(result.current.gridVisible).toBe(true);
    });
});
