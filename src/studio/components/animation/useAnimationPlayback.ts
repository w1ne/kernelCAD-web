// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';
import type { AnimationViewMetadata } from '../../../shared/intent/animationViewRecord';
import type { UpdateParamFn } from '../../hooks/useParamUpdate';
import type { BakedTimeline, BakedCollision } from './bakeInterpolation';
import { fetchAnimationBake, type BakeFetcher } from './fetchAnimationBake';
import {
    applyBakedPose,
    applyKernelEpochBump,
    bakeTimelineKey,
    ensureBakedTimeline,
    resetBakeCache,
    sampleTrackBatch,
    syncKernelPose,
    trackBakeKey,
    trackReadouts,
} from './animationPlaybackBake';
import {
    anchorPlaybackClock,
    drivePlaybackLoop,
    holdViewportDriverLock,
    releasePlayback,
    runPlaybackTick,
    scrubPlaybackTo,
    startPlayback,
    stopPlaybackRaf,
} from './animationPlaybackTransport';

/** Playback loop behaviour at the end of the timeline. */
export type PlaybackMode = 'once' | 'loop' | 'reciprocate';

/** Playback speed multiplier applied to wall-clock delta. */
export type PlaybackSpeed = 0.25 | 0.5 | 1;

export const PLAYBACK_SPEEDS: readonly PlaybackSpeed[] = [0.25, 0.5, 1];
export const PLAYBACK_MODES: readonly PlaybackMode[] = ['once', 'loop', 'reciprocate'];

/** Bake lifecycle. The viewport only moves once the timeline is `ready`. */
export type BakeState = 'idle' | 'baking' | 'ready' | 'error';

/**
 * Schedule a rAF-style tick. Injectable so the headless hook tests can drive
 * the clock with fake timers instead of a real animation frame.
 */
export interface PlaybackClock {
    /** Schedule `cb(nowMs)` for the next frame; return a cancel handle. */
    request: (cb: (nowMs: number) => void) => number;
    /** Cancel a previously scheduled frame. */
    cancel: (handle: number) => void;
    /** Monotonic wall clock in milliseconds. */
    now: () => number;
}

const defaultClock: PlaybackClock = {
    request: (cb) => requestAnimationFrame(cb),
    cancel: (h) => cancelAnimationFrame(h),
    now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
};

/** Apply a single part's world transform directly to the existing viewport
 *  part group, keyed by `assemblyPartName` (no mesh re-fetch). Wired to
 *  `GeometryContext.setGeometryTransformOverride` in Studio. */
export type ApplyPartTransform = (partName: string, matrix: number[]) => void;

export interface UseAnimationPlaybackOptions {
    /** The animation timeline to play (last-wins record metadata). `null`
     *  disables every control and emits nothing. */
    metadata: AnimationViewMetadata | null;
    /** The pooled-session token. Baked playback requires it (the bake endpoint
     *  reads the server session). `null`/`undefined` → editor mode (readout
     *  only, viewport does not move). */
    sessionToken: string | null | undefined;
    /** The Params-pipeline batch sender (POST /__kernelcad/params). Used ONCE
     *  on pause/stop to sync the kernel/session pose to the displayed frame —
     *  NOT per tick. `undefined` in editor mode. */
    updateParam: UpdateParamFn | undefined;
    /** Apply one part's baked world transform to the viewport directly. When
     *  absent (editor mode) playback only updates the readout. */
    applyPartTransform?: ApplyPartTransform;
    /** Drop all viewport part-transform overrides (return to the kernel's
     *  solved pose). Called when leaving baked playback. */
    clearPartTransforms?: () => void;
    /** Claim/release sole ownership of the viewport part-transform override map
     *  while this player is driving it (baking or playing). While locked the
     *  GeometryContext SSE pose-only fast path will NOT replace the override
     *  map — so the single trailing relower the bake emits after restoring the
     *  pre-bake pose (and any concurrent ParamsTab edit) cannot yank the
     *  viewport off the baked playback pose. No-op in editor mode. */
    setViewportDriverLock?: (locked: boolean) => void;
    /** Injected bake fetcher for tests; defaults to the real network fetch. */
    bakeFetcher?: BakeFetcher;
    /** Gallery static-bake mode: when set (and `sessionToken` is absent), the
     *  player drives the viewport from a build-time precomputed timeline that
     *  `bakeFetcher(staticBakeKey)` fetches (the `/gallery/_anim/<sha>.json`
     *  static file) — no live session required. This is how anonymous gallery
     *  visitors, who cannot open a server session, get a moving mechanism. */
    staticBakeKey?: string | null;
    /** Injected clock for deterministic tests; defaults to real rAF. */
    clock?: PlaybackClock;
    /** Monotonic kernel-state epoch, bumped by GeometryContext on EVERY relower
     *  the session receives (a ParamsTab edit that re-poses a non-animated mate
     *  or changes geometry, a script rebuild, etc.). Folded into the bake cache
     *  key so ANY kernel mutation invalidates the cached bake — otherwise a
     *  Params-tab edit changes a param's current value WITHOUT touching
     *  metadata.tracks, leaving the key unchanged and the stale bake playing
     *  pre-edit transforms. The player's OWN kernel writes (the bake's trailing
     *  relower + the pause/scrub-sync edit) are excluded from invalidation (see
     *  `settledSelfCreditsRef`) so they don't trigger a pointless re-bake loop.
     *  Foreign edits are NEVER mis-credited as self: a self-credit is registered
     *  only once its write has settled, so an interleaved foreign relower always
     *  invalidates (worst case: a redundant re-bake, never a stale serve). */
    kernelEpoch?: number;
}

export interface TrackReadout {
    param: string;
    value: number;
}

export interface AnimationPlaybackState {
    readonly durationMs: number;
    readonly fps: number;
    readonly name: string;
    readonly tMs: number;
    readonly isPlaying: boolean;
    readonly mode: PlaybackMode;
    readonly speed: PlaybackSpeed;
    /** Current sampled value per track at `tMs` (for the per-track readout). */
    readonly trackValues: readonly TrackReadout[];
    /** True when there is a live session + apply path to drive the viewport.
     *  False → editor-mode note (scrub/play read sampled values, no motion). */
    readonly canDrive: boolean;
    /** Bake lifecycle for the tab caption. */
    readonly bakeState: BakeState;
    /** Number of baked frames once `ready`, else 0 — for the "Baking… N frames"
     *  progress line. */
    readonly bakeFrames: number;
    /** Server-side bake error message when `bakeState === 'error'`. */
    readonly bakeError: string | null;
    /** ADVISORY keyframe-pose collisions reported by the last successful bake
     *  (the same check `kernelcad animate` runs). Non-empty → the tab shows a
     *  collision warning banner. Empty for a clean mechanism. */
    readonly collisions: readonly BakedCollision[];
    setMode: (mode: PlaybackMode) => void;
    setSpeed: (speed: PlaybackSpeed) => void;
    /** Scrub to an absolute timeline position (pauses playback). */
    scrubTo: (tMs: number) => void;
    play: () => void;
    pause: () => void;
    toggle: () => void;
}

interface PlaybackLoopState {
    tMs: number;
    isPlaying: boolean;
    speed: PlaybackSpeed;
    mode: PlaybackMode;
    bakeState: BakeState;
    setBakeState: Dispatch<SetStateAction<BakeState>>;
    setBakeFrames: Dispatch<SetStateAction<number>>;
    setBakeError: Dispatch<SetStateAction<string | null>>;
    setCollisions: Dispatch<SetStateAction<readonly BakedCollision[]>>;
    setTMs: Dispatch<SetStateAction<number>>;
    setIsPlaying: Dispatch<SetStateAction<boolean>>;
}

interface PlaybackEngine {
    metaRef: RefObject<AnimationViewMetadata | null>;
    speedRef: RefObject<PlaybackSpeed>;
    modeRef: RefObject<PlaybackMode>;
    tMsRef: RefObject<number>;
    clockRef: RefObject<PlaybackClock>;
    mountedRef: RefObject<boolean>;
    ensureBake: () => Promise<BakedTimeline | null>;
    applyBakedAt: (at: number) => void;
    syncKernelTo: (at: number) => void;
}

function usePlaybackEngine(opts: UseAnimationPlaybackOptions, state: PlaybackLoopState): PlaybackEngine {
    const {
        metadata,
        sessionToken,
        updateParam,
        applyPartTransform,
        setViewportDriverLock,
        bakeFetcher = fetchAnimationBake,
        staticBakeKey,
        clock = defaultClock,
        kernelEpoch = 0,
    } = opts;
    const {
        tMs, isPlaying, speed, mode, bakeState,
        setBakeState, setBakeFrames, setBakeError, setCollisions,
    } = state;

    const bakeSourceKey = sessionToken ?? staticBakeKey ?? null;

    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // --- Live-value mirrors for the rAF worker --------------------------------
    const metaRef = useRef(metadata);
    const speedRef = useRef(speed);
    const modeRef = useRef(mode);
    const tMsRef = useRef(tMs);
    const clockRef = useRef(clock);
    const applyRef = useRef(applyPartTransform);
    const updateRef = useRef(updateParam);
    useEffect(() => { metaRef.current = metadata; });
    useEffect(() => { speedRef.current = speed; });
    useEffect(() => { modeRef.current = mode; });
    useEffect(() => { tMsRef.current = tMs; });
    useEffect(() => { clockRef.current = clock; });
    useEffect(() => { applyRef.current = applyPartTransform; });
    useEffect(() => { updateRef.current = updateParam; });

    // Viewport-driver lock: hold it while this player is baking OR playing so
    // the GeometryContext SSE pose-only fast path won't replace the override
    // map out from under the baked pose (the bake emits a single trailing
    // relower after restoring the pre-bake pose; without the lock that relower
    // would yank the viewport back to the restored pose mid-playback). Scrub is
    // a momentary apply and intentionally NOT locked — it deliberately syncs
    // the kernel and lets the resulting relower reflect the scrubbed pose.
    const driverLockRef = useRef(setViewportDriverLock);
    useEffect(() => { driverLockRef.current = setViewportDriverLock; });
    useEffect(() => holdViewportDriverLock(driverLockRef, isPlaying || bakeState === 'baking'), [isPlaying, bakeState]);

    // --- Bake cache -----------------------------------------------------------
    // Keyed by record identity + token. A script edit produces a fresh
    // metadata object (new tracks array reference), so the key changes and the
    // bake is lazily re-fetched on the next play/scrub. An external relower
    // that's purely a pose edit doesn't change metadata — so the timeline key
    // survives — but a Params-tab edit changes a param's CURRENT value (kernel
    // state) WITHOUT touching metadata.tracks, leaving the baked transforms
    // stale. The kernel-state `epoch` (bumped by GeometryContext on every
    // relower) is folded in below so ANY kernel mutation invalidates the bake.
    const bakeRef = useRef<BakedTimeline | null>(null);
    const bakeKeyRef = useRef<string | null>(null);
    const epochRef = useRef(kernelEpoch);
    const bakeInFlightRef = useRef<Promise<BakedTimeline | null> | null>(null);
    const bakeFetcherRef = useRef(bakeFetcher);
    useEffect(() => { bakeFetcherRef.current = bakeFetcher; });

    // Number of player-caused relowers that have SETTLED (their write completed)
    // but whose matching epoch bump has not yet been observed. The player's own
    // writes — the bake's single trailing relower (after restoring the pre-bake
    // pose) and the pause/scrub/end-sync `updateParam` — each bump the epoch,
    // but those must NOT invalidate the bake (re-baking on a self-edit would
    // loop: bake → trailing relower → epoch bump → invalidate → re-bake …).
    //
    // INVARIANT (no stale serve): a self-credit is registered ONLY once its
    // write has settled — i.e. the server has provably processed the write and
    // therefore already emitted its relower onto the (ordered) SSE stream. A
    // FOREIGN edit's write is never issued by the player, so it never settles
    // here. Consequently a foreign relower that interleaves BEFORE a still-
    // pending self-write settles finds NO outstanding credit and invalidates
    // (bias-to-rebake). The only failure mode is a redundant re-bake when a
    // self-write's settlement and its epoch bump momentarily disagree — never a
    // stale bake being served. Credits are NOT pre-registered at write-issue
    // time (the old, fungible count scheme), which is what let a foreign bump be
    // mis-credited as self. See the I3-race test.
    const settledSelfCreditsRef = useRef(0);

    const bakeKey = useMemo(() => bakeTimelineKey(metadata, bakeSourceKey), [metadata, bakeSourceKey]);

    const invalidateBake = useCallback(() => resetBakeCache(bakeRef, bakeInFlightRef, setBakeState, setBakeFrames, setBakeError, setCollisions), [setBakeState, setBakeFrames, setBakeError, setCollisions]);

    // Invalidate the cached bake when the timeline identity changes (script
    // edit, new token).
    useEffect(() => trackBakeKey(bakeKeyRef, bakeKey, invalidateBake), [bakeKey, invalidateBake]);

    // Invalidate the cached bake when the kernel-state epoch advances — UNLESS
    // the advance is fully covered by player-caused relowers that have already
    // SETTLED (tracked by `settledSelfCreditsRef`). A foreign edit (Params-tab
    // change that re-poses a non-animated mate or changes geometry) leaves the
    // timeline key unchanged but makes the baked transforms stale; this picks it
    // up. The re-bake happens lazily on the next play/scrub, never mid-loop.
    //
    // BIAS-TO-REBAKE: each observed bump is matched against ONE settled credit
    // in arrival order. The instant a bump arrives with no settled credit
    // available, it is treated as foreign and the bake is invalidated — and ALL
    // remaining credits are discarded, so a late-settling self bump can never
    // "un-invalidate" a bake the foreign edit already poisoned. Because foreign
    // writes never settle here, a foreign bump that interleaves before a pending
    // self-write settles always lands in the no-credit branch. The worst case is
    // a redundant re-bake (when a credit settles a beat after its bump); a stale
    // serve is impossible.
    useEffect(() => {
        applyKernelEpochBump(kernelEpoch, epochRef, settledSelfCreditsRef, invalidateBake);
    }, [kernelEpoch, invalidateBake]);

    // Fetch (or reuse) the bake for the current key. Single-flight: a second
    // caller while a fetch is pending awaits the same promise.
    // Live session token, or the gallery static-bake key. The injected
    // bakeFetcher interprets it (session POST vs static-file GET).
    const ensureBake = useCallback((): Promise<BakedTimeline | null> => ensureBakedTimeline({
        token: sessionToken ?? staticBakeKey ?? null, bakeFetcherRef, bakeRef, bakeInFlightRef,
        settledSelfCreditsRef, mountedRef, applyRef, metaRef,
        setBakeState, setBakeError, setBakeFrames, setCollisions,
    }), [sessionToken, staticBakeKey, setBakeState, setBakeError, setBakeFrames, setCollisions]);

    // Sample every track at `at` → one param-edit batch (for the pause-sync
    // and the readout). Pure; no I/O.
    const sampleBatch = useCallback((at: number) => sampleTrackBatch(metaRef, at), []);

    // Apply the baked pose at `at` directly to the viewport part groups. No
    // kernel round-trip. No-op when no bake/apply path is available.
    const applyBakedAt = useCallback((at: number) => {
        applyBakedPose(bakeRef, applyRef, at);
    }, []);

    // State coherence: push ONE param batch so the kernel/session pose matches
    // the displayed frame. Called on pause/stop and scrub — NOT per tick.
    const syncKernelTo = useCallback((at: number) => {
        syncKernelPose(updateRef, settledSelfCreditsRef, sampleBatch, at);
    }, [sampleBatch]);

    return { metaRef, speedRef, modeRef, tMsRef, clockRef, mountedRef, ensureBake, applyBakedAt, syncKernelTo };
}

interface PlaybackTransportOptions {
    state: PlaybackLoopState;
    engine: PlaybackEngine;
    clearPartTransforms?: () => void;
}

function usePlaybackTransport({
    state,
    engine,
    clearPartTransforms,
}: PlaybackTransportOptions): Pick<AnimationPlaybackState, 'play' | 'pause' | 'toggle' | 'scrubTo'> {
    const { isPlaying, speed, mode, setTMs, setIsPlaying } = state;
    const {
        metaRef, speedRef, modeRef, tMsRef, mountedRef, clockRef,
        ensureBake, applyBakedAt, syncKernelTo,
    } = engine;

    // --- rAF clock (absolute wall-time anchoring) -----------------------------
    // The displayed time is a PURE FUNCTION of (now - anchorWall) — never a
    // running sum of per-frame deltas. This makes playback oscillation-proof by
    // construction: if two rAF chains ever fire in the same frame (the dev
    // StrictMode mount/cleanup/mount race orphans a chain whose committed frame
    // outran its cancel), both compute the SAME tMs from the SAME anchor for the
    // same `now`, so the result is idempotent — no leapfrogging, no backward
    // step. `maxElapsedRef` additionally clamps elapsed to be non-decreasing so
    // an out-of-order (earlier) `now` delivered by an orphaned chain can never
    // drag the timeline backward within a segment.
    const rafRef = useRef<number | null>(null);
    // Generation token: every (re)start bumps it; only callbacks carrying the
    // current generation may run or reschedule. Stale orphan chains bail.
    const genRef = useRef(0);
    const anchorWallRef = useRef(0);   // clock.now() at the anchor
    const anchorTMsRef = useRef(0);    // displayed timeline pos at the anchor
    const maxElapsedRef = useRef(0);   // monotonic forward distance from anchor

    // Re-anchor the clock to the current displayed pose at the current wall
    // time. Called on play, speed change, mode change, and scrub. After this,
    // tMs = map(anchorTMs + (now - anchorWall) * speed).
    const reanchor = useCallback(() => {
        anchorPlaybackClock(clockRef, tMsRef, anchorWallRef, anchorTMsRef, maxElapsedRef);
    }, [clockRef, tMsRef]);

    const stopRaf = useCallback(() => {
        stopPlaybackRaf(clockRef, rafRef, genRef);
    }, [clockRef]);

    const tickRef = useRef<(nowMs: number) => void>(() => {});
    useEffect(() => {
        tickRef.current = (nowMs: number) => runPlaybackTick(nowMs, {
            mountedRef, metaRef, speedRef, modeRef, tMsRef, clockRef, rafRef,
            genRef, anchorWallRef, anchorTMsRef, maxElapsedRef, tickRef,
            setTMs, setIsPlaying, stopRaf, applyBakedAt, syncKernelTo,
        });
    }, [stopRaf, applyBakedAt, syncKernelTo, mountedRef, metaRef, speedRef, modeRef, tMsRef, clockRef, setTMs, setIsPlaying]);

    const play = useCallback(() => {
        startPlayback(metaRef, modeRef, tMsRef, mountedRef, setTMs, setIsPlaying, ensureBake, applyBakedAt);
    }, [ensureBake, applyBakedAt, metaRef, modeRef, tMsRef, mountedRef, setTMs, setIsPlaying]);

    const pause = useCallback(() => {
        setIsPlaying(false);
        // State coherence: on pause, sync the kernel to the displayed pose so
        // Export/Validate agree with the viewport.
        syncKernelTo(tMsRef.current);
    }, [syncKernelTo, setIsPlaying, tMsRef]);

    const toggle = useCallback(() => {
        if (isPlaying) pause();
        else play();
    }, [isPlaying, play, pause]);

    // Drive the loop off `isPlaying`. `stopRaf` bumps the generation and cancels
    // any in-flight frame BEFORE scheduling a new chain, so even the StrictMode
    // mount/cleanup/mount cycle can never leave two live chains: the orphaned
    // chain carries a stale generation and bails on its next tick.
    useEffect(() => {
        drivePlaybackLoop(isPlaying, stopRaf, reanchor, clockRef, rafRef, tickRef);
    }, [isPlaying, stopRaf, reanchor, clockRef]);

    // Re-anchor on speed or mode change so the displayed time stays continuous
    // (no jump) and the new rate/mode applies from the current pose forward.
    useEffect(() => {
        if (!isPlaying) return;
        reanchor();
    }, [speed, mode, isPlaying, reanchor]);

    // Unmount: stop rAF and drop viewport overrides so the next session starts
    // from the kernel's solved pose, not a left-over baked frame.
    // clearPartTransforms is stable (useCallback in GeometryContext); listed
    // to satisfy exhaustive-deps without re-running on every render.
    useEffect(
        () => releasePlayback(stopRaf, clearPartTransforms),
        [stopRaf, clearPartTransforms],
    );

    const scrubTo = useCallback((to: number) => {
        scrubPlaybackTo(to, metaRef, tMsRef, mountedRef, setTMs, setIsPlaying, stopRaf, reanchor, ensureBake, applyBakedAt, syncKernelTo);
    }, [ensureBake, applyBakedAt, syncKernelTo, stopRaf, reanchor, metaRef, tMsRef, mountedRef, setTMs, setIsPlaying]);

    return { play, pause, toggle, scrubTo };
}

/**
 * Headless playback engine for Studio's Animation tab — BAKED client-side
 * playback.
 *
 * The old design sent one `POST /__kernelcad/params` per rAF tick: every
 * visible pose was a full kernel re-solve → SSE relower → client re-fetch of
 * ALL feature meshes → scene rebuild (200-400ms/pose; jerky). But a pose-only
 * timeline (mate-pose params on a solvedAssembly) never changes per-part
 * GEOMETRY — only per-part WORLD TRANSFORMS — so re-transferring identical
 * meshes every frame was the bug.
 *
 * New design:
 *   1. On first play/scrub, request the server bake ONCE
 *      (`POST /__kernelcad/animation-bake`) — per-part world matrices at every
 *      scheduled frame, no geometry. Cached by record identity + token.
 *   2. Playback runs rAF at full rate; each tick interpolates (slerp rotation,
 *      lerp position/scale) between bracketing baked frames and applies the
 *      result DIRECTLY to the existing viewport part groups via
 *      `applyPartTransform` — no kernel round-trip, smooth 60fps.
 *   3. Scrub takes the same path (instant).
 *
 * STATE COHERENCE: while animating client-side we do NOT touch the kernel
 * session. On PAUSE/STOP (and scrub) we send ONE final `updateParam` batch so
 * the kernel/session pose matches what the viewport displays — otherwise
 * Export / Validate would read the session's stale pre-playback pose and
 * disagree with the visible mechanism. This single trailing edit is the only
 * param write the player makes.
 *
 * Sampling of track READOUT values still goes through the shared
 * `sampleTrackAt` so the numbers match the offline MP4 capture bit-for-bit.
 */
export function useAnimationPlayback(
    opts: UseAnimationPlaybackOptions,
): AnimationPlaybackState {
    const {
        metadata,
        sessionToken,
        applyPartTransform,
        clearPartTransforms,
        staticBakeKey,
    } = opts;

    // The bake source is the live session OR a gallery static-bake key.
    const bakeSourceKey = sessionToken ?? staticBakeKey ?? null;

    const durationMs = metadata?.durationMs ?? 0;
    const fps = metadata?.fps ?? 30;
    const name = metadata?.name ?? 'animation';
    // Driving the viewport needs a bake source (live session OR gallery static
    // bake) AND an apply path.
    const canDrive = Boolean(bakeSourceKey) && applyPartTransform != null;

    const [tMs, setTMs] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [mode, setMode] = useState<PlaybackMode>('loop');
    const [speed, setSpeed] = useState<PlaybackSpeed>(1);
    const [bakeState, setBakeState] = useState<BakeState>('idle');
    const [bakeFrames, setBakeFrames] = useState(0);
    const [bakeError, setBakeError] = useState<string | null>(null);
    const [collisions, setCollisions] = useState<readonly BakedCollision[]>([]);

    const loopState: PlaybackLoopState = {
        tMs, isPlaying, speed, mode, bakeState,
        setBakeState, setBakeFrames, setBakeError, setCollisions,
        setTMs, setIsPlaying,
    };
    const engine = usePlaybackEngine(opts, loopState);
    const { play, pause, toggle, scrubTo } = usePlaybackTransport({
        state: loopState,
        engine,
        clearPartTransforms,
    });

    const trackValues = useMemo<TrackReadout[]>(() => trackReadouts(metadata, tMs), [metadata, tMs]);

    return {
        durationMs,
        fps,
        name,
        tMs,
        isPlaying,
        mode,
        speed,
        trackValues,
        canDrive,
        bakeState,
        bakeFrames,
        bakeError,
        collisions,
        setMode,
        setSpeed,
        scrubTo,
        play,
        pause,
        toggle,
    };
}
