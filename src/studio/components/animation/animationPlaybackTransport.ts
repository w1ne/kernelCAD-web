// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { AnimationViewMetadata } from '../../../shared/intent/animationViewRecord';
import type { BakedTimeline } from './bakeInterpolation';
import type { PlaybackClock, PlaybackMode, PlaybackSpeed } from './useAnimationPlayback';

export interface PlaybackTickDeps {
    mountedRef: MutableRefObject<boolean>;
    metaRef: MutableRefObject<AnimationViewMetadata | null>;
    speedRef: MutableRefObject<PlaybackSpeed>;
    modeRef: MutableRefObject<PlaybackMode>;
    tMsRef: MutableRefObject<number>;
    clockRef: MutableRefObject<PlaybackClock>;
    rafRef: MutableRefObject<number | null>;
    genRef: MutableRefObject<number>;
    anchorWallRef: MutableRefObject<number>;
    anchorTMsRef: MutableRefObject<number>;
    maxElapsedRef: MutableRefObject<number>;
    tickRef: MutableRefObject<(nowMs: number) => void>;
    setTMs: Dispatch<SetStateAction<number>>;
    setIsPlaying: Dispatch<SetStateAction<boolean>>;
    stopRaf: () => void;
    applyBakedAt: (at: number) => void;
    syncKernelTo: (at: number) => void;
}

/** One rAF frame of the playback loop. `nowMs` is the frame's wall clock. */
export function runPlaybackTick(nowMs: number, deps: PlaybackTickDeps): void {
    const {
        mountedRef,
        metaRef,
        speedRef,
        modeRef,
        tMsRef,
        clockRef,
        rafRef,
        genRef,
        anchorWallRef,
        anchorTMsRef,
        maxElapsedRef,
        tickRef,
        setTMs,
        setIsPlaying,
        stopRaf,
        applyBakedAt,
        syncKernelTo,
    } = deps;
    if (!mountedRef.current) return;
    // Single-flight: capture the generation this chain belongs to.
    const myGen = genRef.current;
    const dur = metaRef.current?.durationMs ?? 0;

    if (dur <= 0) {
        tMsRef.current = 0;
        setTMs(0);
        setIsPlaying(false);
        stopRaf();
        return;
    }

    // Absolute-anchored elapsed, clamped non-decreasing so an orphaned
    // chain's out-of-order `now` can't run the clock backward.
    const rawElapsed = (nowMs - anchorWallRef.current) * speedRef.current;
    const elapsed = Math.max(maxElapsedRef.current, rawElapsed);
    maxElapsedRef.current = elapsed;
    const advanced = anchorTMsRef.current + elapsed;

    let next: number;
    let keepGoing = true;
    const mode = modeRef.current;
    if (mode === 'once') {
        if (advanced >= dur) { next = dur; keepGoing = false; }
        else next = advanced;
    } else if (mode === 'loop') {
        next = advanced % dur;
    } else {
        // reciprocate as a pure triangle wave of period 2*dur — no flip
        // state, so there is no double-back glitch at the apex.
        const phase = advanced % (2 * dur);
        next = phase <= dur ? phase : 2 * dur - phase;
    }

    tMsRef.current = next;
    setTMs(next);
    // Pure client-side: interpolate + apply baked transforms. NO param
    // edit during playback.
    applyBakedAt(next);

    // Only the current-generation chain may reschedule; a stale orphan
    // (whose generation was bumped by stopRaf/re-anchor) stops here.
    if (myGen !== genRef.current) return;

    if (keepGoing) {
        rafRef.current = clockRef.current.request((n) => tickRef.current(n));
    } else {
        setIsPlaying(false);
        stopRaf();
        // Reached the end (once mode): sync the kernel to the final pose.
        syncKernelTo(next);
    }
}

/** Re-anchor the clock to the current displayed pose at the current wall
 *  time, so tMs = map(anchorTMs + (now - anchorWall) * speed). */
export function anchorPlaybackClock(
    clockRef: MutableRefObject<PlaybackClock>,
    tMsRef: MutableRefObject<number>,
    anchorWallRef: MutableRefObject<number>,
    anchorTMsRef: MutableRefObject<number>,
    maxElapsedRef: MutableRefObject<number>,
): void {
    anchorWallRef.current = clockRef.current.now();
    anchorTMsRef.current = tMsRef.current;
    maxElapsedRef.current = 0;
}

/** Invalidate any in-flight chain (single-flight guard) and cancel the
 *  scheduled frame. */
export function stopPlaybackRaf(
    clockRef: MutableRefObject<PlaybackClock>,
    rafRef: MutableRefObject<number | null>,
    genRef: MutableRefObject<number>,
): void {
    genRef.current += 1;
    if (rafRef.current !== null) {
        clockRef.current.cancel(rafRef.current);
        rafRef.current = null;
    }
}

/** Claim/release the viewport-driver lock for as long as this player is
 *  baking or playing; returns the effect cleanup when a lock exists. */
export function holdViewportDriverLock(
    driverLockRef: MutableRefObject<((locked: boolean) => void) | undefined>,
    driving: boolean,
): (() => void) | undefined {
    const lock = driverLockRef.current;
    if (!lock) return;
    lock(driving);
    return () => { driverLockRef.current?.(false); };
}

/** Drive the loop off `isPlaying`. `stopRaf` bumps the generation and cancels
 *  any in-flight frame BEFORE scheduling a new chain, so even the StrictMode
 *  mount/cleanup/mount cycle can never leave two live chains: the orphaned
 *  chain carries a stale generation and bails on its next tick. */
export function drivePlaybackLoop(
    isPlaying: boolean,
    stopRaf: () => void,
    reanchor: () => void,
    clockRef: MutableRefObject<PlaybackClock>,
    rafRef: MutableRefObject<number | null>,
    tickRef: MutableRefObject<(nowMs: number) => void>,
): (() => void) | undefined {
    if (!isPlaying) {
        stopRaf();
        return;
    }
    stopRaf();         // single-flight: kill any prior chain first
    reanchor();        // absolute anchor at the current pose + wall time
    rafRef.current = clockRef.current.request((n) => tickRef.current(n));
    return () => { stopRaf(); };
}

/** Unmount cleanup: stop rAF and drop viewport overrides so the next session
 *  starts from the kernel's solved pose, not a left-over baked frame. */
export function releasePlayback(
    stopRaf: () => void,
    clearPartTransforms: (() => void) | undefined,
): () => void {
    return () => {
        stopRaf();
        clearPartTransforms?.();
    };
}

/** Start playback (or restart a `once` timeline parked at the end). Kicks the
 *  bake if not ready; playback starts moving once it resolves. */
export function startPlayback(
    metaRef: MutableRefObject<AnimationViewMetadata | null>,
    modeRef: MutableRefObject<PlaybackMode>,
    tMsRef: MutableRefObject<number>,
    mountedRef: MutableRefObject<boolean>,
    setTMs: Dispatch<SetStateAction<number>>,
    setIsPlaying: Dispatch<SetStateAction<boolean>>,
    ensureBake: () => Promise<BakedTimeline | null>,
    applyBakedAt: (at: number) => void,
): void {
    const meta = metaRef.current;
    if (meta == null || (meta.durationMs ?? 0) <= 0) return;
    // `once` parked at the end restarts from 0.
    if (modeRef.current === 'once' && tMsRef.current >= (meta.durationMs ?? 0)) {
        tMsRef.current = 0;
        setTMs(0);
    }
    void ensureBake().then((baked) => {
        if (baked && mountedRef.current) applyBakedAt(tMsRef.current);
    });
    setIsPlaying(true);
}

/** Scrub to an absolute timeline position: pause, cancel the loop, anchor the
 *  paused clock, apply the baked pose immediately, and sync the kernel. */
export function scrubPlaybackTo(
    to: number,
    metaRef: MutableRefObject<AnimationViewMetadata | null>,
    tMsRef: MutableRefObject<number>,
    mountedRef: MutableRefObject<boolean>,
    setTMs: Dispatch<SetStateAction<number>>,
    setIsPlaying: Dispatch<SetStateAction<boolean>>,
    stopRaf: () => void,
    reanchor: () => void,
    ensureBake: () => Promise<BakedTimeline | null>,
    applyBakedAt: (at: number) => void,
    syncKernelTo: (at: number) => void,
): void {
    const dur = metaRef.current?.durationMs ?? 0;
    const clamped = Math.max(0, Math.min(dur, to));
    setIsPlaying(false);
    stopRaf();             // single-flight: kill any in-flight chain
    tMsRef.current = clamped;
    setTMs(clamped);
    reanchor();            // anchor the (paused) clock to the scrubbed pose
    // Ensure the bake, then apply immediately (instant scrub). Sync the
    // kernel to the scrubbed pose for state coherence.
    void ensureBake().then((baked) => {
        if (baked && mountedRef.current) applyBakedAt(clamped);
    });
    syncKernelTo(clamped);
}
