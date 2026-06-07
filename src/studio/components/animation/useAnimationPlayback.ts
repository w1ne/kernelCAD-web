import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AnimationViewMetadata } from '../../../shared/intent/animationViewRecord';
import { sampleTrackAt } from '../../../agent/render/animationSampler';
import type { ParamEdit, UpdateParamFn } from '../../hooks/useParamUpdate';

/** Playback loop behaviour at the end of the timeline. */
export type PlaybackMode = 'once' | 'loop' | 'reciprocate';

/** Playback speed multiplier applied to wall-clock delta. */
export type PlaybackSpeed = 0.25 | 0.5 | 1;

export const PLAYBACK_SPEEDS: readonly PlaybackSpeed[] = [0.25, 0.5, 1];
export const PLAYBACK_MODES: readonly PlaybackMode[] = ['once', 'loop', 'reciprocate'];

/**
 * Schedule a rAF-style tick. Injectable so the headless hook tests can drive
 * the clock with fake timers instead of a real animation frame. Returns a
 * handle the matching `cancel` understands.
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

export interface UseAnimationPlaybackOptions {
    /** The animation timeline to play (last-wins record metadata). `null`
     *  disables every control and emits nothing. */
    metadata: AnimationViewMetadata | null;
    /** The Params-pipeline batch sender. SAME mechanism the Params/Joints
     *  tabs use (POST /__kernelcad/params via GeometryContext.updateParam).
     *  `undefined` in editor/local mode where no session token exists — the
     *  hook samples values for the readout but emits nothing. */
    updateParam: UpdateParamFn | undefined;
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
    /** True when there is a live param pipeline to drive the viewport. When
     *  false the tab shows the editor-mode note (scrub/play sample values but
     *  the viewport does not move). */
    readonly canDrive: boolean;
    setMode: (mode: PlaybackMode) => void;
    setSpeed: (speed: PlaybackSpeed) => void;
    /** Scrub to an absolute timeline position (pauses playback). */
    scrubTo: (tMs: number) => void;
    play: () => void;
    pause: () => void;
    toggle: () => void;
}

/**
 * Headless playback engine for Studio's Animation tab.
 *
 * Sampling goes through the shared `sampleTrackAt` so scrub/playback agree
 * bit-for-bit with the offline MP4 capture (the easing formulas are the
 * product contract). Emission goes through the injected `updateParam` — the
 * SAME params pipeline the Params and Joints tabs drive (POST
 * /__kernelcad/params, server-side per-session coalescing, SSE relower →
 * mesh refetch). There is NO client-side mesh interpolation: every visible
 * pose is a real kernel re-solve, so playback rate is bounded by re-solve
 * speed.
 *
 * Trailing-edge coalescing: at most one batch is in flight at a time. While a
 * send is pending, the latest requested tMs is remembered and flushed once on
 * completion (latest-wins) — never an unbounded queue. This mirrors the
 * single-in-flight discipline of the Params slider's debounced commit, except
 * the trailing edge is keyed on send-completion rather than a timer so the
 * loop self-paces to the kernel.
 */
export function useAnimationPlayback(
    opts: UseAnimationPlaybackOptions,
): AnimationPlaybackState {
    const { metadata, updateParam, clock = defaultClock } = opts;

    const durationMs = metadata?.durationMs ?? 0;
    const fps = metadata?.fps ?? 30;
    const name = metadata?.name ?? 'animation';
    const canDrive = updateParam != null;

    const [tMs, setTMs] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [mode, setMode] = useState<PlaybackMode>('loop');
    const [speed, setSpeed] = useState<PlaybackSpeed>(1);

    // --- Emission: single in-flight batch, trailing latest-wins ------------
    // `inFlightRef` guards one concurrent send. `pendingTMsRef` holds the most
    // recent tMs requested while a send is in flight; on completion we flush
    // it (if it differs from what we last sent). `mountedRef` blocks any send
    // scheduled across an unmount so no fetch fires into a tearing-down
    // GeometryContext.
    const updateRef = useRef(updateParam);
    const metaRef = useRef(metadata);
    const inFlightRef = useRef(false);
    const pendingTMsRef = useRef<number | null>(null);
    const lastSentTMsRef = useRef<number | null>(null);
    const mountedRef = useRef(true);
    useEffect(() => { updateRef.current = updateParam; });
    useEffect(() => { metaRef.current = metadata; });
    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // Sample every track at `at` and build one param-edit batch.
    const sampleBatch = useCallback((at: number): ParamEdit[] => {
        const meta = metaRef.current;
        if (!meta) return [];
        return meta.tracks.map((track) => ({
            name: track.param,
            value: sampleTrackAt(track, at),
        }));
    }, []);

    // Single-in-flight sender with a trailing latest-wins edge. Held in a ref
    // (synced in an effect, never assigned during render) so its `.finally`
    // re-entry can recurse through `sendAtRef.current` without a forward
    // reference or a stale closure. `sendAt` is the stable public handle.
    const sendAtRef = useRef<(at: number) => void>(() => {});
    useEffect(() => {
        sendAtRef.current = (at: number) => {
            if (!mountedRef.current) return;
            const fn = updateRef.current;
            if (!fn) return; // editor mode — readout only, no viewport drive
            if (inFlightRef.current) {
                // Coalesce: remember only the latest target; never queue.
                pendingTMsRef.current = at;
                return;
            }
            const batch = sampleBatch(at);
            if (batch.length === 0) return;
            lastSentTMsRef.current = at;
            inFlightRef.current = true;
            fn(batch)
                .catch((err: unknown) => {
                    console.warn('[AnimationTab] updateParam failed', err, batch);
                })
                .finally(() => {
                    inFlightRef.current = false;
                    // Trailing edge: a scrub/tick arrived mid-flight — send the
                    // latest now (latest-wins), unless it duplicates what we
                    // just sent or we've unmounted.
                    const pending = pendingTMsRef.current;
                    pendingTMsRef.current = null;
                    if (
                        mountedRef.current
                        && pending !== null
                        && pending !== lastSentTMsRef.current
                    ) {
                        sendAtRef.current(pending);
                    }
                });
        };
    }, [sampleBatch]);

    const sendAt = useCallback((at: number) => {
        sendAtRef.current(at);
    }, []);

    // --- rAF clock ---------------------------------------------------------
    const rafRef = useRef<number | null>(null);
    const lastNowRef = useRef<number | null>(null);
    // Ping-pong direction for reciprocate (+1 forward, -1 backward).
    const dirRef = useRef<1 | -1>(1);
    // Mutable mirrors so the rAF callback reads fresh control values without
    // restarting the loop on every speed/mode change.
    const speedRef = useRef(speed);
    const modeRef = useRef(mode);
    const tMsRef = useRef(tMs);
    useEffect(() => { speedRef.current = speed; });
    useEffect(() => { modeRef.current = mode; });
    useEffect(() => { tMsRef.current = tMs; });

    // Hold the clock in a ref so the rAF worker and effect read a stable
    // reference without listing `clock` (a fresh default object each render)
    // as a hook dependency.
    const clockRef = useRef(clock);
    useEffect(() => { clockRef.current = clock; });

    const stopRaf = useCallback(() => {
        if (rafRef.current !== null) {
            clockRef.current.cancel(rafRef.current);
            rafRef.current = null;
        }
        lastNowRef.current = null;
    }, []);

    // rAF worker held in a ref (synced in an effect, never during render) so
    // its self-rescheduling (`request(tick)`) needs no forward reference.
    const tickRef = useRef<(nowMs: number) => void>(() => {});
    useEffect(() => {
        tickRef.current = (nowMs: number) => {
            if (!mountedRef.current) return;
            const dur = metaRef.current?.durationMs ?? 0;
            const prevNow = lastNowRef.current;
            lastNowRef.current = nowMs;
            if (prevNow === null) {
                // First frame after (re)start: establish the wall baseline.
                rafRef.current = clockRef.current.request((n) => tickRef.current(n));
                return;
            }
            const wallDelta = nowMs - prevNow;
            const advance = wallDelta * speedRef.current * dirRef.current;
            let next = tMsRef.current + advance;
            let keepGoing = true;

            if (dur <= 0) {
                next = 0;
                keepGoing = false;
            } else if (modeRef.current === 'once') {
                if (next >= dur) { next = dur; keepGoing = false; }
                else if (next < 0) { next = 0; keepGoing = false; }
            } else if (modeRef.current === 'loop') {
                if (next >= dur) next = next % dur;
                if (next < 0) next = ((next % dur) + dur) % dur;
            } else { // reciprocate — ping-pong at the boundaries
                if (next >= dur) {
                    next = dur - (next - dur);
                    if (next < 0) next = 0;
                    dirRef.current = -1;
                } else if (next <= 0) {
                    next = -next;
                    if (next > dur) next = dur;
                    dirRef.current = 1;
                }
            }

            tMsRef.current = next;
            setTMs(next);
            sendAtRef.current(next);

            if (keepGoing) {
                rafRef.current = clockRef.current.request((n) => tickRef.current(n));
            } else {
                setIsPlaying(false);
                stopRaf();
            }
        };
    }, [stopRaf]);

    const play = useCallback(() => {
        if (metaRef.current == null || (metaRef.current.durationMs ?? 0) <= 0) return;
        // once that's already parked at the end restarts from 0.
        if (modeRef.current === 'once' && tMsRef.current >= (metaRef.current.durationMs ?? 0)) {
            tMsRef.current = 0;
            dirRef.current = 1;
            setTMs(0);
        }
        setIsPlaying(true);
    }, []);

    const pause = useCallback(() => {
        setIsPlaying(false);
    }, []);

    const toggle = useCallback(() => {
        if (isPlaying) pause();
        else play();
    }, [isPlaying, play, pause]);

    // Drive the loop off `isPlaying`. Start/stop the rAF here so control
    // changes (speed/mode) don't tear it down mid-flight.
    useEffect(() => {
        if (!isPlaying) {
            stopRaf();
            return;
        }
        lastNowRef.current = null;
        rafRef.current = clockRef.current.request((n) => tickRef.current(n));
        return () => { stopRaf(); };
    }, [isPlaying, stopRaf]);

    // Stop cleanly on unmount: no orphan rAF, no post-unmount sends.
    useEffect(() => {
        return () => { stopRaf(); };
    }, [stopRaf]);

    const scrubTo = useCallback((to: number) => {
        const dur = metaRef.current?.durationMs ?? 0;
        const clamped = Math.max(0, Math.min(dur, to));
        // Pause on scrub-drag start (manual seek wins over playback).
        setIsPlaying(false);
        dirRef.current = 1;
        tMsRef.current = clamped;
        setTMs(clamped);
        sendAt(clamped);
    }, [sendAt]);

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
        setMode,
        setSpeed,
        scrubTo,
        play,
        pause,
        toggle,
    };
}
