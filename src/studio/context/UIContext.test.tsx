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
