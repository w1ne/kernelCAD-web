// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useAnimationPlayback, type PlaybackClock } from './useAnimationPlayback';
import type { AnimationViewMetadata } from '../../../shared/intent/animationViewRecord';

// Carousel-like two-track fixture (mirrors the spice-carousel dispense cycle):
//   drumDeg: 0@0 → 60@1200 (easeInOut) → 60@4000
//   meterDeg: 0@1400 → 117@2200 (easeIn) → 117@3000 → 0@3800 (easeOut)
const FIXTURE: AnimationViewMetadata = {
    name: 'dispense-cycle',
    fps: 30,
    durationMs: 4000,
    virtual: true,
    tracks: [
        { param: 'drumDeg', keys: [
            { atMs: 0, value: 0, ease: 'linear' },
            { atMs: 1200, value: 60, ease: 'easeInOut' },
            { atMs: 4000, value: 60, ease: 'linear' },
        ] },
        { param: 'meterDeg', keys: [
            { atMs: 1400, value: 0, ease: 'linear' },
            { atMs: 2200, value: 117, ease: 'easeIn' },
            { atMs: 3000, value: 117, ease: 'linear' },
            { atMs: 3800, value: 0, ease: 'easeOut' },
        ] },
    ],
};

/** A hand-driven clock: tests call `frame.flush(nowMs)` to advance one tick. */
function makeManualClock(): PlaybackClock & { flush: (nowMs: number) => void; pending: boolean } {
    let cb: ((nowMs: number) => void) | null = null;
    let handle = 0;
    return {
        request(fn) { cb = fn; handle += 1; return handle; },
        cancel() { cb = null; },
        now() { return 0; },
        flush(nowMs: number) {
            const fn = cb;
            cb = null;
            if (fn) fn(nowMs);
        },
        get pending() { return cb !== null; },
    };
}

afterEach(() => { vi.restoreAllMocks(); });

describe('useAnimationPlayback', () => {
    it('scrub samples ALL tracks and emits ONE batch with golden eased values', () => {
        const update = vi.fn().mockResolvedValue(undefined);
        const clock = makeManualClock();
        const { result } = renderHook(() =>
            useAnimationPlayback({ metadata: FIXTURE, updateParam: update, clock }),
        );
        // tMs=600 is the midpoint of drum segment 0→1200 (easeInOut):
        //   u=0.5 → easeInOut(0.5)=4*0.125=0.5 → 0 + 60*0.5 = 30
        // meterDeg keyed span starts at 1400 → hold-clamp to first key 0.
        act(() => { result.current.scrubTo(600); });
        expect(update).toHaveBeenCalledOnce();
        expect(update.mock.calls[0][0]).toEqual([
            { name: 'drumDeg', value: 30 },
            { name: 'meterDeg', value: 0 },
        ]);
        // readout reflects the same sampled values
        expect(result.current.trackValues).toEqual([
            { param: 'drumDeg', value: 30 },
            { param: 'meterDeg', value: 0 },
        ]);
    });

    it('play advances tMs monotonically and emits a batch per tick', async () => {
        const update = vi.fn().mockResolvedValue(undefined);
        const clock = makeManualClock();
        const { result } = renderHook(() =>
            useAnimationPlayback({ metadata: FIXTURE, updateParam: update, clock }),
        );
        act(() => { result.current.play(); });
        // first frame establishes the wall baseline (no advance, no emit)
        act(() => { clock.flush(0); });
        expect(result.current.tMs).toBe(0);
        // settle in-flight promise so the next tick can emit
        await act(async () => { await Promise.resolve(); });
        act(() => { clock.flush(100); });
        const t1 = result.current.tMs;
        await act(async () => { await Promise.resolve(); });
        act(() => { clock.flush(250); });
        const t2 = result.current.tMs;
        expect(t1).toBeGreaterThan(0);
        expect(t2).toBeGreaterThan(t1);
        expect(update.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('trailing-edge coalescing: slow update fn → latest-wins, no unbounded queue', async () => {
        let resolve: (() => void) | null = null;
        const update = vi.fn().mockImplementation(
            () => new Promise<void>((res) => { resolve = () => res(); }),
        );
        const clock = makeManualClock();
        const { result } = renderHook(() =>
            useAnimationPlayback({ metadata: FIXTURE, updateParam: update, clock }),
        );
        // First scrub sends immediately and is now in-flight.
        act(() => { result.current.scrubTo(100); });
        expect(update).toHaveBeenCalledOnce();
        // Three more scrubs while in flight: must NOT call update again (queued
        // to a single latest-wins slot).
        act(() => { result.current.scrubTo(200); });
        act(() => { result.current.scrubTo(300); });
        act(() => { result.current.scrubTo(900); });
        expect(update).toHaveBeenCalledOnce();
        // Resolve the in-flight send → exactly ONE trailing send for tMs=900.
        await act(async () => { resolve?.(); await Promise.resolve(); await Promise.resolve(); });
        expect(update).toHaveBeenCalledTimes(2);
        // drumDeg at 900: between 0→1200 easeInOut, u=0.75 → 1-4*(0.25)^3=0.9375 → 56.25
        expect(update.mock.calls[1][0]).toEqual([
            { name: 'drumDeg', value: 56.25 },
            { name: 'meterDeg', value: 0 },
        ]);
    });

    it('rejected send clears in-flight so a later scrub still emits (recovery)', async () => {
        // First send rejects; subsequent sends resolve. The `.finally` must
        // clear `inFlightRef` either way, so a later scrub is not wedged.
        const update = vi.fn()
            .mockRejectedValueOnce(new Error('relower 500'))
            .mockResolvedValue(undefined);
        // Silence the expected console.warn from the rejected send.
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        const clock = makeManualClock();
        const { result } = renderHook(() =>
            useAnimationPlayback({ metadata: FIXTURE, updateParam: update, clock }),
        );
        act(() => { result.current.scrubTo(100); });
        expect(update).toHaveBeenCalledOnce();
        // Let the rejected promise settle (catch → finally clears in-flight).
        await act(async () => { await Promise.resolve(); await Promise.resolve(); });
        // A fresh scrub after the failure must emit again, not be stuck.
        act(() => { result.current.scrubTo(900); });
        expect(update).toHaveBeenCalledTimes(2);
        expect(update.mock.calls[1][0]).toEqual([
            { name: 'drumDeg', value: 56.25 },
            { name: 'meterDeg', value: 0 },
        ]);
    });

    it('once stops exactly at durationMs with a final batch AT the end', async () => {
        const update = vi.fn().mockResolvedValue(undefined);
        const clock = makeManualClock();
        const { result } = renderHook(() =>
            useAnimationPlayback({ metadata: FIXTURE, updateParam: update, clock }),
        );
        act(() => { result.current.setMode('once'); });
        act(() => { result.current.play(); });
        act(() => { clock.flush(0); }); // baseline
        await act(async () => { await Promise.resolve(); });
        // One huge wall jump past the end.
        act(() => { clock.flush(10_000); });
        expect(result.current.tMs).toBe(4000);
        expect(result.current.isPlaying).toBe(false);
        expect(clock.pending).toBe(false); // no orphan rAF
        const last = update.mock.calls[update.mock.calls.length - 1][0];
        expect(last).toEqual([
            { name: 'drumDeg', value: 60 },
            { name: 'meterDeg', value: 0 },
        ]);
    });

    it('reciprocate ping-pongs at the boundaries', async () => {
        const update = vi.fn().mockResolvedValue(undefined);
        const clock = makeManualClock();
        const { result } = renderHook(() =>
            useAnimationPlayback({ metadata: FIXTURE, updateParam: update, clock }),
        );
        act(() => { result.current.setMode('reciprocate'); });
        act(() => { result.current.play(); });
        act(() => { clock.flush(0); }); // baseline
        await act(async () => { await Promise.resolve(); });
        // Overshoot the end: 4000 + overflow reflects back below durationMs.
        act(() => { clock.flush(5000); });
        const reflected = result.current.tMs;
        expect(reflected).toBeLessThan(4000);
        expect(reflected).toBeGreaterThan(0);
        expect(result.current.isPlaying).toBe(true); // still running, reversed
        // Next forward-then-back: now moving backward, overshoot 0 → reflect up.
        await act(async () => { await Promise.resolve(); });
        act(() => { clock.flush(60_000); });
        expect(result.current.tMs).toBeGreaterThanOrEqual(0);
        expect(result.current.tMs).toBeLessThanOrEqual(4000);
    });

    it('loop wraps past durationMs back into range', async () => {
        const update = vi.fn().mockResolvedValue(undefined);
        const clock = makeManualClock();
        const { result } = renderHook(() =>
            useAnimationPlayback({ metadata: FIXTURE, updateParam: update, clock }),
        );
        act(() => { result.current.setMode('loop'); });
        act(() => { result.current.play(); });
        act(() => { clock.flush(0); });
        await act(async () => { await Promise.resolve(); });
        act(() => { clock.flush(5000); }); // wall jump > duration
        expect(result.current.tMs).toBeGreaterThanOrEqual(0);
        expect(result.current.tMs).toBeLessThan(4000);
        expect(result.current.isPlaying).toBe(true);
    });

    it('scrub-drag pauses active playback', () => {
        const update = vi.fn().mockResolvedValue(undefined);
        const clock = makeManualClock();
        const { result } = renderHook(() =>
            useAnimationPlayback({ metadata: FIXTURE, updateParam: update, clock }),
        );
        act(() => { result.current.play(); });
        expect(result.current.isPlaying).toBe(true);
        act(() => { result.current.scrubTo(500); });
        expect(result.current.isPlaying).toBe(false);
    });

    it('unmount stops the rAF and blocks post-unmount sends', async () => {
        let resolve: (() => void) | null = null;
        const update = vi.fn().mockImplementation(
            () => new Promise<void>((res) => { resolve = () => res(); }),
        );
        const clock = makeManualClock();
        const { result, unmount } = renderHook(() =>
            useAnimationPlayback({ metadata: FIXTURE, updateParam: update, clock }),
        );
        act(() => { result.current.play(); });
        act(() => { clock.flush(0); });
        expect(clock.pending).toBe(true);
        // Start an in-flight send, queue a trailing one, then unmount.
        act(() => { result.current.scrubTo(100); });
        act(() => { result.current.scrubTo(800); });
        const callsBefore = update.mock.calls.length;
        unmount();
        expect(clock.pending).toBe(false); // orphan rAF cancelled
        // Resolving the in-flight promise must NOT trigger the trailing send.
        await act(async () => { resolve?.(); await Promise.resolve(); await Promise.resolve(); });
        expect(update.mock.calls.length).toBe(callsBefore);
    });

    it('editor mode (no updateParam) still samples readout but emits nothing', () => {
        const clock = makeManualClock();
        const { result } = renderHook(() =>
            useAnimationPlayback({ metadata: FIXTURE, updateParam: undefined, clock }),
        );
        expect(result.current.canDrive).toBe(false);
        act(() => { result.current.scrubTo(600); });
        expect(result.current.trackValues).toEqual([
            { param: 'drumDeg', value: 30 },
            { param: 'meterDeg', value: 0 },
        ]);
    });

    it('null metadata → inert (no duration, no emit)', () => {
        const update = vi.fn().mockResolvedValue(undefined);
        const clock = makeManualClock();
        const { result } = renderHook(() =>
            useAnimationPlayback({ metadata: null, updateParam: update, clock }),
        );
        expect(result.current.durationMs).toBe(0);
        act(() => { result.current.play(); });
        expect(result.current.isPlaying).toBe(false);
        act(() => { result.current.scrubTo(100); });
        expect(update).not.toHaveBeenCalled();
    });
});
