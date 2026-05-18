// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useParamUpdate } from './useParamUpdate';

describe('useParamUpdate', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

    it('commit() fires updateParam with edits', () => {
        const update = vi.fn().mockResolvedValue(undefined);
        const { result } = renderHook(() => useParamUpdate(update));
        act(() => { result.current.commit([{ name: 'width', value: 5 }]); });
        expect(update).toHaveBeenCalledExactlyOnceWith([{ name: 'width', value: 5 }]);
    });

    it('commit() routes rejection through default onError (console.warn with source tag)', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const update = vi.fn().mockRejectedValue(new Error('boom'));
        const { result } = renderHook(() => useParamUpdate(update, { source: 'ParamsTab' }));
        act(() => { result.current.commit([{ name: 'x', value: 1 }]); });
        await vi.waitFor(() => expect(warn).toHaveBeenCalledOnce());
        const [msg, err, edits] = warn.mock.calls[0];
        expect(msg).toBe('[ParamsTab] updateParam failed');
        expect((err as Error).message).toBe('boom');
        expect(edits).toEqual([{ name: 'x', value: 1 }]);
    });

    it('commit() routes rejection through custom onError when provided', async () => {
        const onError = vi.fn();
        const update = vi.fn().mockRejectedValue(new Error('nope'));
        const { result } = renderHook(() => useParamUpdate(update, { onError }));
        act(() => { result.current.commit([{ name: 'x', value: 1 }]); });
        await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce());
        expect((onError.mock.calls[0][0] as Error).message).toBe('nope');
        expect(onError.mock.calls[0][1]).toEqual([{ name: 'x', value: 1 }]);
    });

    it('commit() is a no-op when updateParam is undefined', () => {
        const { result } = renderHook(() => useParamUpdate(undefined));
        // Just verify it doesn't throw.
        act(() => { result.current.commit([{ name: 'x', value: 1 }]); });
    });

    it('commit() is a no-op for empty edits', () => {
        const update = vi.fn().mockResolvedValue(undefined);
        const { result } = renderHook(() => useParamUpdate(update));
        act(() => { result.current.commit([]); });
        expect(update).not.toHaveBeenCalled();
    });

    it('commitDebounced() does not fire immediately', () => {
        const update = vi.fn().mockResolvedValue(undefined);
        const { result } = renderHook(() => useParamUpdate(update, { debounceMs: 100 }));
        act(() => { result.current.commitDebounced([{ name: 'x', value: 1 }]); });
        expect(update).not.toHaveBeenCalled();
    });

    it('commitDebounced() fires once after debounceMs elapses', () => {
        const update = vi.fn().mockResolvedValue(undefined);
        const { result } = renderHook(() => useParamUpdate(update, { debounceMs: 100 }));
        act(() => { result.current.commitDebounced([{ name: 'x', value: 7 }]); });
        act(() => { vi.advanceTimersByTime(100); });
        expect(update).toHaveBeenCalledExactlyOnceWith([{ name: 'x', value: 7 }]);
    });

    it('commitDebounced() coalesces per-name (last-wins) across burst', () => {
        const update = vi.fn().mockResolvedValue(undefined);
        const { result } = renderHook(() => useParamUpdate(update, { debounceMs: 100 }));
        act(() => {
            result.current.commitDebounced([{ name: 'x', value: 1 }]);
            result.current.commitDebounced([{ name: 'x', value: 2 }]);
            result.current.commitDebounced([{ name: 'x', value: 3 }]);
        });
        act(() => { vi.advanceTimersByTime(100); });
        expect(update).toHaveBeenCalledExactlyOnceWith([{ name: 'x', value: 3 }]);
    });

    it('commitDebounced() batches multiple distinct names into one fire', () => {
        const update = vi.fn().mockResolvedValue(undefined);
        const { result } = renderHook(() => useParamUpdate(update, { debounceMs: 100 }));
        act(() => {
            result.current.commitDebounced([{ name: 'x', value: 1 }]);
            result.current.commitDebounced([{ name: 'y', value: 2 }]);
            result.current.commitDebounced([{ name: 'x', value: 3 }]);
        });
        act(() => { vi.advanceTimersByTime(100); });
        expect(update).toHaveBeenCalledOnce();
        const batch = update.mock.calls[0][0] as { name: string; value: number }[];
        expect(batch).toHaveLength(2);
        expect(batch).toEqual(expect.arrayContaining([
            { name: 'x', value: 3 },
            { name: 'y', value: 2 },
        ]));
    });

    it('commitDebounced(edits, 0) fires immediately', () => {
        const update = vi.fn().mockResolvedValue(undefined);
        const { result } = renderHook(() => useParamUpdate(update, { debounceMs: 100 }));
        act(() => { result.current.commitDebounced([{ name: 'x', value: 9 }], 0); });
        expect(update).toHaveBeenCalledExactlyOnceWith([{ name: 'x', value: 9 }]);
    });

    it('commit() flushes pending debounced edits before firing its own batch', () => {
        const update = vi.fn().mockResolvedValue(undefined);
        const { result } = renderHook(() => useParamUpdate(update, { debounceMs: 100 }));
        act(() => {
            result.current.commitDebounced([{ name: 'x', value: 1 }]);
            result.current.commit([{ name: 'y', value: 2 }]);
        });
        expect(update).toHaveBeenCalledTimes(2);
        expect(update.mock.calls[0][0]).toEqual([{ name: 'x', value: 1 }]);
        expect(update.mock.calls[1][0]).toEqual([{ name: 'y', value: 2 }]);
    });

    it('flush() fires pending edits on demand', () => {
        const update = vi.fn().mockResolvedValue(undefined);
        const { result } = renderHook(() => useParamUpdate(update, { debounceMs: 1000 }));
        act(() => { result.current.commitDebounced([{ name: 'x', value: 5 }]); });
        expect(update).not.toHaveBeenCalled();
        act(() => { result.current.flush(); });
        expect(update).toHaveBeenCalledExactlyOnceWith([{ name: 'x', value: 5 }]);
    });

    it('unmount drops pending edits (does not fire on teardown)', () => {
        const update = vi.fn().mockResolvedValue(undefined);
        const { result, unmount } = renderHook(() => useParamUpdate(update, { debounceMs: 100 }));
        act(() => { result.current.commitDebounced([{ name: 'x', value: 1 }]); });
        unmount();
        act(() => { vi.advanceTimersByTime(500); });
        expect(update).not.toHaveBeenCalled();
    });

    it('returned commit/commitDebounced/flush identities are stable across renders', () => {
        const update = vi.fn().mockResolvedValue(undefined);
        const { result, rerender } = renderHook(
            (props: { update: typeof update }) => useParamUpdate(props.update),
            { initialProps: { update } },
        );
        const first = result.current;
        // Rerender with the SAME updateParam to confirm identity stability.
        rerender({ update });
        expect(result.current.commit).toBe(first.commit);
        expect(result.current.commitDebounced).toBe(first.commitDebounced);
        expect(result.current.flush).toBe(first.flush);
    });
});
