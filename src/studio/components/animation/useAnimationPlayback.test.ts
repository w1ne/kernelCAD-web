// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useAnimationPlayback, type PlaybackClock } from './useAnimationPlayback';
import type { AnimationViewMetadata } from '../../../shared/intent/animationViewRecord';
import type { BakedTimeline } from './bakeInterpolation';
import { interpolateMatrix } from './bakeInterpolation';

// Two-track carousel-like fixture (matches the server contract's track shape).
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

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
// Rotation about Z by 90° (column-major).
const ROT_Z_90 = [0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/** A baked timeline: `base` static at identity, `drum` rotates 0→90° across
 *  two frames at t=0 and t=4000. Off-sample times interpolate between them. */
function fakeBake(): BakedTimeline {
    return {
        frames: 2,
        durationMs: 4000,
        fps: 30,
        times: [0, 4000],
        parts: [
            { name: 'base', matrices: [IDENTITY, IDENTITY] },
            { name: 'drum', matrices: [IDENTITY, ROT_Z_90] },
        ],
    };
}

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

interface Harness {
    apply: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    bakeFetcher: ReturnType<typeof vi.fn>;
    clock: ReturnType<typeof makeManualClock>;
}

function harness(overrides: Partial<{ bakeFetcher: Harness['bakeFetcher'] }> = {}): Harness {
    return {
        apply: vi.fn(),
        clear: vi.fn(),
        update: vi.fn().mockResolvedValue(undefined),
        bakeFetcher: overrides.bakeFetcher ?? vi.fn().mockResolvedValue(fakeBake()),
        clock: makeManualClock(),
    };
}

function renderPlayback(h: Harness, opts: { metadata?: AnimationViewMetadata | null; sessionToken?: string | null } = {}) {
    return renderHook(() =>
        useAnimationPlayback({
            metadata: opts.metadata === undefined ? FIXTURE : opts.metadata,
            sessionToken: opts.sessionToken === undefined ? 't1' : opts.sessionToken,
            updateParam: h.update,
            applyPartTransform: h.apply,
            clearPartTransforms: h.clear,
            bakeFetcher: h.bakeFetcher,
            clock: h.clock,
        }),
    );
}

afterEach(() => { vi.restoreAllMocks(); });

describe('useAnimationPlayback (baked)', () => {
    it('scrub bakes once then applies interpolated transforms; ONE pause-sync param edit', async () => {
        const h = harness();
        const { result } = renderPlayback(h);

        // Scrub to the midpoint (t=2000 of [0,4000] → u=0.5).
        await act(async () => { result.current.scrubTo(2000); await Promise.resolve(); await Promise.resolve(); });

        expect(h.bakeFetcher).toHaveBeenCalledTimes(1);
        expect(result.current.bakeState).toBe('ready');
        expect(result.current.bakeFrames).toBe(2);

        // base stays identity; drum is slerp(I, Rz90, 0.5).
        const expectedDrum = interpolateMatrix(IDENTITY, ROT_Z_90, 0.5);
        const applied = Object.fromEntries(h.apply.mock.calls.map(([n, m]) => [n, m]));
        expect(applied.base).toEqual(IDENTITY);
        expect(applied.drum).toEqual(expectedDrum);

        // Exactly ONE param edit (the scrub-sync), carrying both tracks.
        expect(h.update).toHaveBeenCalledTimes(1);
        const batch = h.update.mock.calls[0][0] as Array<{ name: string; value: number }>;
        expect(batch.map((b) => b.name)).toEqual(['drumDeg', 'meterDeg']);
        // drum is held at 60 past its 1200ms key; sampled at t=2000 → 60.
        expect(batch[0]).toEqual({ name: 'drumDeg', value: 60 });
    });

    it('play applies transforms every tick and emits NO param edits during playback', async () => {
        const h = harness();
        const { result } = renderPlayback(h);

        await act(async () => { result.current.play(); await Promise.resolve(); await Promise.resolve(); });
        // baseline frame (no advance)
        act(() => { h.clock.flush(0); });
        await act(async () => { await Promise.resolve(); });
        h.apply.mockClear();
        // advance a few ticks
        act(() => { h.clock.flush(100); });
        act(() => { h.clock.flush(250); });
        act(() => { h.clock.flush(400); });

        // transforms applied each tick (base + drum per tick)
        expect(h.apply.mock.calls.length).toBeGreaterThanOrEqual(4);
        // NO param edits while playing.
        expect(h.update).not.toHaveBeenCalled();
        expect(result.current.isPlaying).toBe(true);
    });

    it('pause sends exactly ONE param edit matching the displayed frame', async () => {
        const h = harness();
        const { result } = renderPlayback(h);
        await act(async () => { result.current.play(); await Promise.resolve(); });
        act(() => { h.clock.flush(0); });
        await act(async () => { await Promise.resolve(); });
        act(() => { h.clock.flush(500); });
        expect(h.update).not.toHaveBeenCalled();
        const at = result.current.tMs;
        act(() => { result.current.pause(); });
        expect(result.current.isPlaying).toBe(false);
        expect(h.update).toHaveBeenCalledTimes(1);
        // The sync batch carries both tracks sampled at the paused tMs.
        const batch = h.update.mock.calls[0][0] as Array<{ name: string }>;
        expect(batch.map((b) => b.name).sort()).toEqual(['drumDeg', 'meterDeg']);
        expect(at).toBeGreaterThan(0);
    });

    it('cache hit: a second scrub does NOT re-bake', async () => {
        const h = harness();
        const { result } = renderPlayback(h);
        await act(async () => { result.current.scrubTo(1000); await Promise.resolve(); await Promise.resolve(); });
        expect(h.bakeFetcher).toHaveBeenCalledTimes(1);
        await act(async () => { result.current.scrubTo(3000); await Promise.resolve(); await Promise.resolve(); });
        expect(h.bakeFetcher).toHaveBeenCalledTimes(1); // still one
    });

    it('invalidation on external timeline change re-bakes', async () => {
        const h = harness();
        const { result, rerender } = renderHook(
            (props: { metadata: AnimationViewMetadata }) =>
                useAnimationPlayback({
                    metadata: props.metadata,
                    sessionToken: 't1',
                    updateParam: h.update,
                    applyPartTransform: h.apply,
                    clearPartTransforms: h.clear,
                    bakeFetcher: h.bakeFetcher,
                    clock: h.clock,
                }),
            { initialProps: { metadata: FIXTURE } },
        );
        await act(async () => { result.current.scrubTo(1000); await Promise.resolve(); await Promise.resolve(); });
        expect(h.bakeFetcher).toHaveBeenCalledTimes(1);

        // A script edit yields fresh metadata (different keyframe values).
        const edited: AnimationViewMetadata = {
            ...FIXTURE,
            tracks: [
                { param: 'drumDeg', keys: [
                    { atMs: 0, value: 0, ease: 'linear' },
                    { atMs: 1200, value: 90, ease: 'easeInOut' }, // value changed
                    { atMs: 4000, value: 90, ease: 'linear' },
                ] },
                FIXTURE.tracks[1],
            ],
        };
        rerender({ metadata: edited });
        expect(result.current.bakeState).toBe('idle'); // cache dropped
        await act(async () => { result.current.scrubTo(1000); await Promise.resolve(); await Promise.resolve(); });
        expect(h.bakeFetcher).toHaveBeenCalledTimes(2); // re-baked
    });

    it('interpolation golden: scrub to an off-sample time slerps the moving part', async () => {
        const h = harness();
        const { result } = renderPlayback(h);
        // t=1000 → u = 1000/4000 = 0.25
        await act(async () => { result.current.scrubTo(1000); await Promise.resolve(); await Promise.resolve(); });
        const applied = Object.fromEntries(h.apply.mock.calls.map(([n, m]) => [n, m]));
        expect(applied.drum).toEqual(interpolateMatrix(IDENTITY, ROT_Z_90, 0.25));
        expect(applied.base).toEqual(IDENTITY);
    });

    it('editor mode (no session token): canDrive false, no bake, readout still samples', async () => {
        const h = harness();
        const { result } = renderPlayback(h, { sessionToken: null });
        expect(result.current.canDrive).toBe(false);
        await act(async () => { result.current.scrubTo(600); await Promise.resolve(); });
        expect(h.bakeFetcher).not.toHaveBeenCalled();
        expect(h.apply).not.toHaveBeenCalled();
        // readout: drumDeg midpoint of 0→1200 easeInOut at 600 → 30
        expect(result.current.trackValues).toEqual([
            { param: 'drumDeg', value: 30 },
            { param: 'meterDeg', value: 0 },
        ]);
    });

    it('bake error surfaces a state and message; no apply, no crash', async () => {
        const h = harness({ bakeFetcher: vi.fn().mockRejectedValue(new Error('no animationView')) });
        const { result } = renderPlayback(h);
        await act(async () => { result.current.scrubTo(1000); await Promise.resolve(); await Promise.resolve(); });
        expect(result.current.bakeState).toBe('error');
        expect(result.current.bakeError).toBe('no animationView');
        expect(h.apply).not.toHaveBeenCalled();
    });

    it('unmount stops the rAF and clears viewport overrides', async () => {
        const h = harness();
        const { result, unmount } = renderPlayback(h);
        await act(async () => { result.current.play(); await Promise.resolve(); });
        act(() => { h.clock.flush(0); });
        expect(h.clock.pending).toBe(true);
        unmount();
        expect(h.clock.pending).toBe(false);
        expect(h.clear).toHaveBeenCalled();
    });

    it('null metadata → inert (no duration, no bake, no emit)', async () => {
        const h = harness();
        const { result } = renderPlayback(h, { metadata: null });
        expect(result.current.durationMs).toBe(0);
        act(() => { result.current.play(); });
        expect(result.current.isPlaying).toBe(false);
        await act(async () => { result.current.scrubTo(100); await Promise.resolve(); });
        expect(h.bakeFetcher).not.toHaveBeenCalled();
        expect(h.update).not.toHaveBeenCalled();
    });

    it('once stops exactly at durationMs and syncs the kernel to the end pose', async () => {
        const h = harness();
        const { result } = renderPlayback(h);
        act(() => { result.current.setMode('once'); });
        await act(async () => { result.current.play(); await Promise.resolve(); });
        act(() => { h.clock.flush(0); });
        await act(async () => { await Promise.resolve(); });
        h.update.mockClear();
        act(() => { h.clock.flush(10_000); }); // jump past the end
        expect(result.current.tMs).toBe(4000);
        expect(result.current.isPlaying).toBe(false);
        expect(h.clock.pending).toBe(false);
        // End-of-playback kernel sync: exactly one edit at the final pose.
        expect(h.update).toHaveBeenCalledTimes(1);
    });
});
