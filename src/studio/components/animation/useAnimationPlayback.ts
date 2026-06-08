import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AnimationViewMetadata } from '../../../shared/intent/animationViewRecord';
import { sampleTrackAt } from '../../../agent/render/animationSampler';
import type { ParamEdit, UpdateParamFn } from '../../hooks/useParamUpdate';
import type { BakedTimeline } from './bakeInterpolation';
import { sampleBakedTransforms } from './bakeInterpolation';
import { fetchAnimationBake, type BakeFetcher } from './fetchAnimationBake';

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
    /** Injected clock for deterministic tests; defaults to real rAF. */
    clock?: PlaybackClock;
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
    setMode: (mode: PlaybackMode) => void;
    setSpeed: (speed: PlaybackSpeed) => void;
    /** Scrub to an absolute timeline position (pauses playback). */
    scrubTo: (tMs: number) => void;
    play: () => void;
    pause: () => void;
    toggle: () => void;
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
        updateParam,
        applyPartTransform,
        clearPartTransforms,
        setViewportDriverLock,
        bakeFetcher = fetchAnimationBake,
        clock = defaultClock,
    } = opts;

    const durationMs = metadata?.durationMs ?? 0;
    const fps = metadata?.fps ?? 30;
    const name = metadata?.name ?? 'animation';
    // Driving the viewport needs a session (bake source) AND an apply path.
    const canDrive = Boolean(sessionToken) && applyPartTransform != null;

    const [tMs, setTMs] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [mode, setMode] = useState<PlaybackMode>('loop');
    const [speed, setSpeed] = useState<PlaybackSpeed>(1);
    const [bakeState, setBakeState] = useState<BakeState>('idle');
    const [bakeFrames, setBakeFrames] = useState(0);
    const [bakeError, setBakeError] = useState<string | null>(null);

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
    useEffect(() => {
        const lock = driverLockRef.current;
        if (!lock) return;
        const driving = isPlaying || bakeState === 'baking';
        lock(driving);
        return () => { driverLockRef.current?.(false); };
    }, [isPlaying, bakeState]);

    // --- Bake cache -----------------------------------------------------------
    // Keyed by record identity + token. A script edit produces a fresh
    // metadata object (new tracks array reference), so the key changes and the
    // bake is lazily re-fetched on the next play/scrub. An external relower
    // that's purely a pose edit doesn't change metadata, so the cache survives.
    const bakeRef = useRef<BakedTimeline | null>(null);
    const bakeKeyRef = useRef<string | null>(null);
    const bakeInFlightRef = useRef<Promise<BakedTimeline | null> | null>(null);
    const bakeFetcherRef = useRef(bakeFetcher);
    useEffect(() => { bakeFetcherRef.current = bakeFetcher; });

    const bakeKey = useMemo(() => {
        if (!metadata || !sessionToken) return null;
        // Identity of the timeline that matters for the baked poses: token +
        // per-track keyframes (param/atMs/value/ease) + fps. Stable across
        // re-renders that don't change the timeline.
        return JSON.stringify({
            token: sessionToken,
            fps: metadata.fps,
            tracks: metadata.tracks.map((t) => ({
                p: t.param,
                k: t.keys.map((k) => [k.atMs, k.value, k.ease]),
            })),
        });
    }, [metadata, sessionToken]);

    // Invalidate the cached bake when the key changes (script edit, new token).
    useEffect(() => {
        if (bakeKeyRef.current !== null && bakeKeyRef.current !== bakeKey) {
            bakeRef.current = null;
            bakeInFlightRef.current = null;
            setBakeState('idle');
            setBakeFrames(0);
            setBakeError(null);
        }
        bakeKeyRef.current = bakeKey;
    }, [bakeKey]);

    // Fetch (or reuse) the bake for the current key. Single-flight: a second
    // caller while a fetch is pending awaits the same promise.
    const ensureBake = useCallback(async (): Promise<BakedTimeline | null> => {
        const token = sessionToken;
        if (!token || !applyRef.current || !metaRef.current) return null;
        if (bakeRef.current) return bakeRef.current;
        if (bakeInFlightRef.current) return bakeInFlightRef.current;
        setBakeState('baking');
        setBakeError(null);
        const promise = (async () => {
            try {
                const baked = await bakeFetcherRef.current(token);
                if (!mountedRef.current) return null;
                bakeRef.current = baked;
                setBakeFrames(baked.frames);
                setBakeState('ready');
                return baked;
            } catch (err) {
                if (!mountedRef.current) return null;
                setBakeState('error');
                setBakeError(err instanceof Error ? err.message : String(err));
                return null;
            } finally {
                bakeInFlightRef.current = null;
            }
        })();
        bakeInFlightRef.current = promise;
        return promise;
    }, [sessionToken]);

    // Sample every track at `at` → one param-edit batch (for the pause-sync
    // and the readout). Pure; no I/O.
    const sampleBatch = useCallback((at: number): ParamEdit[] => {
        const meta = metaRef.current;
        if (!meta) return [];
        return meta.tracks.map((track) => ({ name: track.param, value: sampleTrackAt(track, at) }));
    }, []);

    // Apply the baked pose at `at` directly to the viewport part groups. No
    // kernel round-trip. No-op when no bake/apply path is available.
    const applyBakedAt = useCallback((at: number) => {
        const baked = bakeRef.current;
        const apply = applyRef.current;
        if (!baked || !apply) return;
        const transforms = sampleBakedTransforms(baked, at);
        for (const [partName, matrix] of Object.entries(transforms)) {
            apply(partName, matrix);
        }
    }, []);

    // State coherence: push ONE param batch so the kernel/session pose matches
    // the displayed frame. Called on pause/stop and scrub — NOT per tick.
    const syncKernelTo = useCallback((at: number) => {
        const fn = updateRef.current;
        if (!fn) return;
        const batch = sampleBatch(at);
        if (batch.length === 0) return;
        fn(batch).catch((err: unknown) => {
            console.warn('[AnimationTab] pause-sync updateParam failed', err, batch);
        });
    }, [sampleBatch]);

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
        anchorWallRef.current = clockRef.current.now();
        anchorTMsRef.current = tMsRef.current;
        maxElapsedRef.current = 0;
    }, []);

    const stopRaf = useCallback(() => {
        // Invalidate any in-flight chain (single-flight guard) and cancel the
        // scheduled frame.
        genRef.current += 1;
        if (rafRef.current !== null) {
            clockRef.current.cancel(rafRef.current);
            rafRef.current = null;
        }
    }, []);

    const tickRef = useRef<(nowMs: number) => void>(() => {});
    useEffect(() => {
        tickRef.current = (nowMs: number) => {
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
        };
    }, [stopRaf, applyBakedAt, syncKernelTo]);

    const play = useCallback(() => {
        const meta = metaRef.current;
        if (meta == null || (meta.durationMs ?? 0) <= 0) return;
        // `once` parked at the end restarts from 0.
        if (modeRef.current === 'once' && tMsRef.current >= (meta.durationMs ?? 0)) {
            tMsRef.current = 0;
            setTMs(0);
        }
        // Kick the bake if not ready; playback starts moving once it resolves
        // (the rAF loop applies transforms only when a bake is present).
        void ensureBake().then((baked) => {
            if (baked && mountedRef.current) applyBakedAt(tMsRef.current);
        });
        setIsPlaying(true);
    }, [ensureBake, applyBakedAt]);

    const pause = useCallback(() => {
        setIsPlaying(false);
        // State coherence: on pause, sync the kernel to the displayed pose so
        // Export/Validate agree with the viewport.
        syncKernelTo(tMsRef.current);
    }, [syncKernelTo]);

    const toggle = useCallback(() => {
        if (isPlaying) pause();
        else play();
    }, [isPlaying, play, pause]);

    // Drive the loop off `isPlaying`. `stopRaf` bumps the generation and cancels
    // any in-flight frame BEFORE scheduling a new chain, so even the StrictMode
    // mount/cleanup/mount cycle can never leave two live chains: the orphaned
    // chain carries a stale generation and bails on its next tick.
    useEffect(() => {
        if (!isPlaying) {
            stopRaf();
            return;
        }
        stopRaf();         // single-flight: kill any prior chain first
        reanchor();        // absolute anchor at the current pose + wall time
        rafRef.current = clockRef.current.request((n) => tickRef.current(n));
        return () => { stopRaf(); };
    }, [isPlaying, stopRaf, reanchor]);

    // Re-anchor on speed or mode change so the displayed time stays continuous
    // (no jump) and the new rate/mode applies from the current pose forward.
    useEffect(() => {
        if (!isPlaying) return;
        reanchor();
    }, [speed, mode, isPlaying, reanchor]);

    // Unmount: stop rAF and drop viewport overrides so the next session starts
    // from the kernel's solved pose, not a left-over baked frame.
    useEffect(() => {
        return () => {
            stopRaf();
            clearPartTransforms?.();
        };
        // clearPartTransforms is stable (useCallback in GeometryContext); listed
        // to satisfy exhaustive-deps without re-running on every render.
    }, [stopRaf, clearPartTransforms]);

    const scrubTo = useCallback((to: number) => {
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
    }, [ensureBake, applyBakedAt, syncKernelTo, stopRaf, reanchor]);

    const trackValues = useMemo<TrackReadout[]>(() => {
        if (!metadata) return [];
        return metadata.tracks.map((track) => ({
            param: track.param,
            value: sampleTrackAt(track, tMs),
        }));
    }, [metadata, tMs]);

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
        setMode,
        setSpeed,
        scrubTo,
        play,
        pause,
        toggle,
    };
}
