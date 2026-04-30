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
