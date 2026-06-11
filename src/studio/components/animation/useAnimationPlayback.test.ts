// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
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

/**
 * Reproduce the live-browser oscillation deterministically.
 *
 * Confirmed mechanism: in the dev StrictMode browser there are intermittently
 * TWO live self-rescheduling rAF chains (the `isPlaying` effect schedules one;
 * the tick self-reschedules another; a mount/cleanup/mount cycle whose cleanup
 * `cancelAnimationFrame` landed *after* the browser committed the prior frame
 * orphans one of them). Both chains share `lastNowRef`/`tMsRef`. Because rAF
 * delivers each chain's frame with ITS OWN timestamp, the two chains fire with
 * out-of-order `nowMs`: chain A advances lastNow to 100, then orphan chain B's
 * already-committed frame fires with nowMs=92 → `wallDelta = 92 - 100 = -8` →
 * tMs steps BACKWARD. Next frame steps forward again. That is the back-and-forth
 * oscillation the controller sampled (744,760,794,777 — a 17ms backward step).
 *
 * This clock retains the most-recent scheduled callback as the "live" chain and
 * lets the test fire it (`stepLive`) and ALSO fire it a second time as an
 * orphan with an earlier timestamp (`stepOrphan`) — exactly the out-of-order
 * two-chain delivery. With absolute-anchored playback both calls compute the
 * SAME tMs from the shared anchor (idempotent); with delta accumulation the
 * orphan drags tMs backward.
 */
function makeRacingClock(): PlaybackClock & {
    /** Fire the live chain at wall-time `nowMs` (advances the clock). */
    stepLive: (nowMs: number) => void;
    /** Re-fire the live chain's callback as an orphaned second chain whose
     *  browser-committed frame arrives with an earlier `nowMs`. Does not change
     *  which callback is "live". */
    stepOrphan: (nowMs: number) => void;
    hasLive: boolean;
} {
    let nowMs = 0;
    let handle = 0;
    let live: ((n: number) => void) | null = null;
    return {
        request(fn) { live = fn; handle += 1; return handle; },
        cancel() { /* orphan frames are already committed; cancel is a no-op */ },
        now() { return nowMs; },
        stepLive(t: number) { nowMs = t; const fn = live; if (fn) fn(t); },
        stepOrphan(t: number) {
            // The orphan frame fires with its own (earlier) timestamp without
            // becoming the live chain. The browser would pass it nowMs=t.
            const fn = live;
            if (fn) fn(t);
        },
        get hasLive() { return live !== null; },
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
    lock: ReturnType<typeof vi.fn>;
    bakeFetcher: ReturnType<typeof vi.fn>;
    clock: ReturnType<typeof makeManualClock>;
}

function harness(overrides: Partial<{ bakeFetcher: Harness['bakeFetcher'] }> = {}): Harness {
    return {
        apply: vi.fn(),
        clear: vi.fn(),
        update: vi.fn().mockResolvedValue(undefined),
        lock: vi.fn(),
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
            setViewportDriverLock: h.lock,
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

    it('claims the viewport-driver lock while playing and releases it on pause', async () => {
        const h = harness();
        const { result } = renderPlayback(h);
        // Idle: not locked yet (initial effect runs with driving=false).
        expect(h.lock.mock.calls.every(([v]) => v === false)).toBe(true);

        await act(async () => { result.current.play(); await Promise.resolve(); });
        act(() => { h.clock.flush(0); });
        await act(async () => { await Promise.resolve(); });
        // Locked (true) at some point once playing.
        expect(h.lock).toHaveBeenCalledWith(true);

        h.lock.mockClear();
        act(() => { result.current.pause(); });
        // Released (false) on pause; never re-locked after.
        expect(h.lock).toHaveBeenCalledWith(false);
        expect(h.lock.mock.calls.some(([v]) => v === true)).toBe(false);
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

    // I3: a Params-tab edit changes a param's CURRENT value (kernel state)
    // without touching metadata.tracks, so the timeline key is unchanged. The
    // kernel-state epoch (bumped by GeometryContext on every relower) must
    // invalidate the stale bake so the next play/scrub re-bakes.
    it('I3: a foreign kernel-epoch bump between plays re-bakes (stale bake not served)', async () => {
        const h = harness();
        const { result, rerender } = renderHook(
            (props: { kernelEpoch: number }) =>
                useAnimationPlayback({
                    metadata: FIXTURE,
                    sessionToken: 't1',
                    updateParam: h.update,
                    applyPartTransform: h.apply,
                    clearPartTransforms: h.clear,
                    bakeFetcher: h.bakeFetcher,
                    clock: h.clock,
                    kernelEpoch: props.kernelEpoch,
                }),
            { initialProps: { kernelEpoch: 0 } },
        );
        // First play bakes once. Its trailing relower is a SELF-edit; the test
        // models that as part of the foreign bump below being net-foreign.
        await act(async () => { result.current.play(); await Promise.resolve(); await Promise.resolve(); });
        act(() => { result.current.pause(); });
        expect(h.bakeFetcher).toHaveBeenCalledTimes(1);

        // A Params-tab edit lands: GeometryContext sees the relower and bumps the
        // epoch. The player accounted for ONE self-edit (the bake's trailing
        // relower) + ONE self-edit (the pause-sync), so to be NET foreign the
        // epoch must advance past those. Bump by 3 (2 self + 1 foreign).
        rerender({ kernelEpoch: 3 });
        expect(result.current.bakeState).toBe('idle'); // cache dropped

        await act(async () => { result.current.play(); await Promise.resolve(); await Promise.resolve(); });
        expect(h.bakeFetcher).toHaveBeenCalledTimes(2); // re-baked on foreign edit
    });

    // RACE (the finding): a FOREIGN Params-tab edit's relower bump arrives
    // BEFORE a still-pending self-edit's bump. Under a fungible COUNT-based
    // credit the foreign bump is wrongly consumed by the outstanding self-credit
    // → the stale bake is served. The invariant under test: a foreign edit ALWAYS
    // invalidates; the worst acceptable outcome is a redundant re-bake, never a
    // silent stale serve.
    //
    // Simulated by holding the scrub-sync write UNSETTLED (its relower bump has
    // not yet been attributed) and delivering a foreign epoch bump in that
    // window. The self-credit must NOT absorb the foreign bump.
    it('I3-race: a foreign bump interleaved BEFORE a pending self-edit settles still invalidates', async () => {
        // A controllable updateParam: the player's scrub/pause-sync write stays
        // pending until we release it, modelling the window in which a foreign
        // relower can interleave before the self relower is attributed.
        let releaseSync: (() => void) | null = null;
        const update = vi.fn().mockImplementation(
            () => new Promise<void>((resolve) => { releaseSync = () => resolve(); }),
        );
        const bakeFetcher = vi.fn().mockResolvedValue(fakeBake());
        const clock = makeManualClock();
        const { result, rerender } = renderHook(
            (props: { kernelEpoch: number }) =>
                useAnimationPlayback({
                    metadata: FIXTURE,
                    sessionToken: 't1',
                    updateParam: update,
                    applyPartTransform: vi.fn(),
                    clearPartTransforms: vi.fn(),
                    bakeFetcher,
                    clock,
                    kernelEpoch: props.kernelEpoch,
                }),
            { initialProps: { kernelEpoch: 0 } },
        );

        // Scrub bakes once. The bake-restore relower settles (bake promise
        // resolved) and is attributed: epoch advances to 1 for it. The
        // scrub-sync write is issued but held UNSETTLED (releaseSync not called).
        await act(async () => {
            result.current.scrubTo(1000);
            await Promise.resolve(); await Promise.resolve();
        });
        expect(bakeFetcher).toHaveBeenCalledTimes(1);
        expect(update).toHaveBeenCalledTimes(1);

        // Account for the bake-restore self relower (epoch 0 → 1) — that one IS
        // settled (the bake resolved) so it must be credited.
        rerender({ kernelEpoch: 1 });
        expect(result.current.bakeState).toBe('ready'); // bake-restore credited

        // FOREIGN edit lands now, BEFORE the held scrub-sync write settles. Its
        // relower bumps the epoch 1 → 2. A fungible self-credit for the
        // unsettled scrub-sync would wrongly swallow this → stale serve. The fix
        // must treat it as foreign and invalidate.
        rerender({ kernelEpoch: 2 });
        expect(result.current.bakeState).toBe('idle'); // foreign edit invalidated

        // Now the held scrub-sync finally settles + its own relower arrives
        // (epoch 2 → 3). This must NOT resurrect the (already-invalidated) bake.
        await act(async () => { releaseSync?.(); await Promise.resolve(); });
        rerender({ kernelEpoch: 3 });
        expect(result.current.bakeState).toBe('idle');

        // Next scrub must RE-BAKE — the stale bake was correctly dropped.
        await act(async () => {
            result.current.scrubTo(3000);
            await Promise.resolve(); await Promise.resolve();
        });
        expect(bakeFetcher).toHaveBeenCalledTimes(2);
    });

    it('I3: the player\'s OWN kernel writes (bake restore + pause-sync) do NOT trigger a re-bake', async () => {
        const h = harness();
        const { result, rerender } = renderHook(
            (props: { kernelEpoch: number }) =>
                useAnimationPlayback({
                    metadata: FIXTURE,
                    sessionToken: 't1',
                    updateParam: h.update,
                    applyPartTransform: h.apply,
                    clearPartTransforms: h.clear,
                    bakeFetcher: h.bakeFetcher,
                    clock: h.clock,
                    kernelEpoch: props.kernelEpoch,
                }),
            { initialProps: { kernelEpoch: 0 } },
        );
        // Scrub bakes once (1 self-edit: bake restore) + scrub-sync (1 self-edit).
        await act(async () => { result.current.scrubTo(1000); await Promise.resolve(); await Promise.resolve(); });
        expect(h.bakeFetcher).toHaveBeenCalledTimes(1);

        // The two self-originated relowers arrive as epoch bumps (0 → 2). They
        // are exactly consumed by the pending self-edit credit, so the bake is
        // NOT invalidated and a second scrub serves the cache.
        rerender({ kernelEpoch: 2 });
        expect(result.current.bakeState).toBe('ready'); // cache survived

        await act(async () => { result.current.scrubTo(3000); await Promise.resolve(); await Promise.resolve(); });
        expect(h.bakeFetcher).toHaveBeenCalledTimes(1); // no re-bake from self-edits
    });

    it('I1: collisions from the bake response are exposed on the playback state', async () => {
        const collidingBake: BakedTimeline = {
            ...fakeBake(),
            collisions: [{ tMs: 500, a: 'arm', b: 'post', volumeMm3: 312.5 }],
        };
        const h = harness({ bakeFetcher: vi.fn().mockResolvedValue(collidingBake) });
        const { result } = renderPlayback(h);
        expect(result.current.collisions).toEqual([]); // none before the bake
        await act(async () => { result.current.scrubTo(500); await Promise.resolve(); await Promise.resolve(); });
        expect(result.current.collisions).toEqual([
            { tMs: 500, a: 'arm', b: 'post', volumeMm3: 312.5 },
        ]);
    });
});

describe('useAnimationPlayback — oscillation (clock monotonicity)', () => {
    function baseHarness() {
        return {
            apply: vi.fn(),
            clear: vi.fn(),
            update: vi.fn().mockResolvedValue(undefined),
            bakeFetcher: vi.fn().mockResolvedValue(fakeBake()),
        };
    }

    function renderRacing(
        clock: PlaybackClock,
        h: ReturnType<typeof baseHarness>,
    ) {
        return renderHook(() =>
            useAnimationPlayback({
                metadata: FIXTURE,
                sessionToken: 't1',
                updateParam: h.update,
                applyPartTransform: h.apply,
                clearPartTransforms: h.clear,
                bakeFetcher: h.bakeFetcher,
                clock,
            }),
        );
    }

    // REPRODUCTION: two concurrent rAF chains (the documented mechanism — a
    // StrictMode mount/cleanup/mount cycle whose cleanup cancel landed after the
    // browser had already committed the prior chain's frame). Both chains share
    // lastNowRef/tMsRef. We interleave a "stale" orphan frame with a "current"
    // frame; on delta-accumulation code the orphan computes its advance against
    // the other chain's lastNow, leapfrogging tMs forward then snapping it back
    // — the visible oscillation. Absolute-anchored code computes the SAME tMs
    // from the shared anchor regardless of which chain fires → idempotent.
    it('loop playback survives two interleaved rAF chains without stepping backward', async () => {
        const clock = makeRacingClock();
        const h = baseHarness();
        const { result } = renderRacing(clock, h);

        await act(async () => { result.current.play(); await Promise.resolve(); await Promise.resolve(); });

        const samples: number[] = [];
        let t = 0;
        for (let i = 0; i < 60; i++) {
            t += 16;
            // Fire the live chain at the frame's wall-time.
            await act(async () => { clock.stepLive(t); await Promise.resolve(); });
            samples.push(result.current.tMs);
            // Every few frames, an orphaned second chain's already-committed
            // frame arrives with an EARLIER timestamp — the StrictMode race.
            if (i % 3 === 0) {
                await act(async () => { clock.stepOrphan(t - 8); await Promise.resolve(); });
                samples.push(result.current.tMs);
            }
        }

        const dur = FIXTURE.durationMs;
        const backwardNonWrap = samples
            .map((v, i) => (i === 0 ? 0 : v - samples[i - 1]))
            .filter((d) => d < 0 && Math.abs(d) < dur / 2);
        expect(backwardNonWrap).toEqual([]);
    });

    it('reciprocate produces a clean triangle (no jittery double-back at the apex)', async () => {
        const clock = makeRacingClock();
        const h = baseHarness();
        const { result } = renderRacing(clock, h);

        act(() => { result.current.setMode('reciprocate'); });
        await act(async () => { result.current.play(); await Promise.resolve(); await Promise.resolve(); });

        const samples: number[] = [];
        let t = 0;
        for (let i = 0; i < 700; i++) { // > 2x duration to cross the apex
            t += 16;
            await act(async () => { clock.stepLive(t); await Promise.resolve(); });
            samples.push(result.current.tMs);
            if (i % 3 === 0) {
                await act(async () => { clock.stepOrphan(t - 8); await Promise.resolve(); });
                samples.push(result.current.tMs);
            }
        }

        let reversals = 0;
        let prevDir = 0;
        for (let i = 1; i < samples.length; i++) {
            const d = samples[i] - samples[i - 1];
            const dir = d > 1e-6 ? 1 : d < -1e-6 ? -1 : 0;
            if (dir !== 0 && prevDir !== 0 && dir !== prevDir) reversals++;
            if (dir !== 0) prevDir = dir;
        }
        // 0→4000 up, 4000→0 down, 0→~3200 up → at most 3 direction reversals for
        // a clean triangle. The oscillation bug yields dozens.
        expect(reversals).toBeLessThanOrEqual(3);
    });

    it('speed change mid-play does not jump tMs (re-anchor preserves position)', async () => {
        const clock = makeRacingClock();
        const h = baseHarness();
        const { result } = renderRacing(clock, h);

        await act(async () => { result.current.play(); await Promise.resolve(); await Promise.resolve(); });
        let t = 0;
        for (let i = 0; i < 30; i++) {
            t += 16;
            await act(async () => { clock.stepLive(t); await Promise.resolve(); });
        }
        const before = result.current.tMs;
        act(() => { result.current.setSpeed(0.25); });
        t += 16;
        await act(async () => { clock.stepLive(t); await Promise.resolve(); });
        const after = result.current.tMs;
        expect(after).toBeGreaterThanOrEqual(before);
        expect(after - before).toBeLessThan(50);
    });
});
