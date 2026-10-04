// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { saveSourceToScriptMock } = vi.hoisted(() => ({ saveSourceToScriptMock: vi.fn() }));

vi.mock('./directEdit/saveSource', () => ({
    saveSourceToScript: saveSourceToScriptMock,
}));

import {
    clearDiskScriptSource,
    noteDiskScriptSource,
    scriptCodeEditorIsReadOnly,
    shouldApplyDiskSource,
    useLinkedScriptAutosave,
} from './linkedScriptAutosave';

const SCRIPT = 'examples/horn.kcad.ts';
const FILE = 'return 42;';

beforeEach(() => {
    vi.useFakeTimers();
    saveSourceToScriptMock.mockReset();
    saveSourceToScriptMock.mockResolvedValue(undefined);
    clearDiskScriptSource();
});

afterEach(() => {
    cleanup();
    clearDiskScriptSource();
    vi.useRealTimers();
});

describe('useLinkedScriptAutosave', () => {
    it('does not write the file until the editor has shown it, then saves one settled edit', async () => {
        noteDiskScriptSource(SCRIPT, FILE);
        const { rerender } = renderHook(
            ({ code }) => useLinkedScriptAutosave(SCRIPT, code, true),
            { initialProps: { code: 'const leftover = 1;' } },
        );

        await act(async () => {
            vi.advanceTimersByTime(2000);
        });
        expect(saveSourceToScriptMock).not.toHaveBeenCalled();

        rerender({ code: FILE });
        rerender({ code: 'return 1;' });
        await act(async () => {
            vi.advanceTimersByTime(400);
        });
        rerender({ code: 'return 2;' });
        await act(async () => {
            vi.advanceTimersByTime(1000);
            await Promise.resolve();
        });

        expect(saveSourceToScriptMock).toHaveBeenCalledTimes(1);
        expect(saveSourceToScriptMock).toHaveBeenCalledWith(SCRIPT, 'return 2;');
    });

    it('does not write a half-typed script, and does not write again for the reload echo', async () => {
        noteDiskScriptSource(SCRIPT, FILE);
        const { rerender } = renderHook(
            ({ code }) => useLinkedScriptAutosave(SCRIPT, code, true),
            { initialProps: { code: FILE } },
        );

        rerender({ code: 'const x = ;' });
        await act(async () => {
            vi.advanceTimersByTime(2000);
        });
        expect(saveSourceToScriptMock).not.toHaveBeenCalled();

        rerender({ code: 'return 7;' });
        await act(async () => {
            vi.advanceTimersByTime(1000);
            await Promise.resolve();
        });
        expect(saveSourceToScriptMock).toHaveBeenCalledTimes(1);

        rerender({ code: 'return 7;' });
        await act(async () => {
            vi.advanceTimersByTime(2000);
            await Promise.resolve();
        });
        expect(saveSourceToScriptMock).toHaveBeenCalledTimes(1);
    });

    it('does not write when the dev file endpoint is absent', async () => {
        noteDiskScriptSource(SCRIPT, FILE);
        const { rerender } = renderHook(
            ({ code }) => useLinkedScriptAutosave(SCRIPT, code, false),
            { initialProps: { code: FILE } },
        );
        rerender({ code: 'return 9;' });
        await act(async () => {
            vi.advanceTimersByTime(2000);
        });
        expect(saveSourceToScriptMock).not.toHaveBeenCalled();
    });
});

describe('scriptCodeEditorIsReadOnly', () => {
    it('is read-only only for a script page that cannot write the file', () => {
        expect(scriptCodeEditorIsReadOnly('examples/horn.kcad.ts', false)).toBe(true);
        expect(scriptCodeEditorIsReadOnly('examples/horn.kcad.ts', true)).toBe(false);
        expect(scriptCodeEditorIsReadOnly(null, false)).toBe(false);
    });
});

describe('shouldApplyDiskSource', () => {
    it('keeps unsaved typing and takes a clean editor to the new file', () => {
        expect(shouldApplyDiskSource('return 2;', 'return 1;', 'return 1;')).toBe(false);
        expect(shouldApplyDiskSource('return 1;', 'return 1;', 'return 3;')).toBe(true);
        expect(shouldApplyDiskSource('return 3;', 'return 1;', 'return 3;')).toBe(true);
        expect(shouldApplyDiskSource(null, 'return 1;', 'return 3;')).toBe(true);
    });
});
