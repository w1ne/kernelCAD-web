// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { AnimationViewMetadata } from '../../../shared/intent/animationViewRecord';
import { sampleTrackAt } from '../../../modeling/animation/animationSampler';
import type { ParamEdit, UpdateParamFn } from '../../hooks/useParamUpdate';
import type { BakedCollision, BakedTimeline } from './bakeInterpolation';
import { sampleBakedTransforms } from './bakeInterpolation';
import type { BakeFetcher } from './fetchAnimationBake';
import type { ApplyPartTransform, BakeState } from './useAnimationPlayback';

/** Identity of the timeline that matters for the baked poses: source key
 *  (session token or static gallery key) + per-track keyframes + fps.
 *  Stable across re-renders that don't change the timeline. */
export function bakeTimelineKey(
    metadata: AnimationViewMetadata | null,
    bakeSourceKey: string | null,
): string | null {
    if (!metadata || !bakeSourceKey) return null;
    return JSON.stringify({
        token: bakeSourceKey,
        fps: metadata.fps,
        tracks: metadata.tracks.map((t) => ({
            p: t.param,
            k: t.keys.map((k) => [k.atMs, k.value, k.ease]),
        })),
    });
}

/** Drop the cached bake and return the bake state cells to idle. */
export function resetBakeCache(
    bakeRef: MutableRefObject<BakedTimeline | null>,
    bakeInFlightRef: MutableRefObject<Promise<BakedTimeline | null> | null>,
    setBakeState: Dispatch<SetStateAction<BakeState>>,
    setBakeFrames: Dispatch<SetStateAction<number>>,
    setBakeError: Dispatch<SetStateAction<string | null>>,
    setCollisions: Dispatch<SetStateAction<readonly BakedCollision[]>>,
): void {
    bakeRef.current = null;
    bakeInFlightRef.current = null;
    setBakeState('idle');
    setBakeFrames(0);
    setBakeError(null);
    setCollisions([]);
}

/** Invalidate the cached bake when the kernel-state epoch advances — UNLESS
 *  the advance is fully covered by player-caused relowers that have already
 *  SETTLED (tracked by `settledSelfCreditsRef`). A foreign edit (Params-tab
 *  change that re-poses a non-animated mate or changes geometry) leaves the
 *  timeline key unchanged but makes the baked transforms stale; this picks it
 *  up. The re-bake happens lazily on the next play/scrub, never mid-loop.
 *
 *  BIAS-TO-REBAKE: each observed bump is matched against ONE settled credit
 *  in arrival order. The instant a bump arrives with no settled credit
 *  available, it is treated as foreign and the bake is invalidated — and ALL
 *  remaining credits are discarded, so a late-settling self bump can never
 *  "un-invalidate" a bake the foreign edit already poisoned. Because foreign
 *  writes never settle here, a foreign bump that interleaves before a pending
 *  self-write settles always lands in the no-credit branch. The worst case is
 *  a redundant re-bake (when a credit settles a beat after its bump); a stale
 *  serve is impossible. */
export function applyKernelEpochBump(
    kernelEpoch: number,
    epochRef: MutableRefObject<number>,
    settledSelfCreditsRef: MutableRefObject<number>,
    invalidateBake: () => void,
): void {
    if (kernelEpoch === epochRef.current) return;
    const delta = kernelEpoch - epochRef.current;
    epochRef.current = kernelEpoch;
    if (delta <= 0) return; // epoch is monotonic; ignore non-advances
    const credits = settledSelfCreditsRef.current;
    if (delta <= credits) {
        // Every bump in this advance is covered by a settled self-credit.
        settledSelfCreditsRef.current = credits - delta;
        return;
    }
    // At least one bump has no settled credit → a foreign edit is present.
    // Invalidate and discard ALL remaining credits (a foreign edit poisons
    // the whole bake; surviving credits would only risk a future false
    // cache-hit).
    settledSelfCreditsRef.current = 0;
    invalidateBake();
}

export interface EnsureBakeContext {
    /** Live session token, or the gallery static-bake key. The injected
     *  bakeFetcher interprets it (session POST vs static-file GET). */
    token: string | null;
    bakeFetcherRef: MutableRefObject<BakeFetcher>;
    bakeRef: MutableRefObject<BakedTimeline | null>;
    bakeInFlightRef: MutableRefObject<Promise<BakedTimeline | null> | null>;
    settledSelfCreditsRef: MutableRefObject<number>;
    mountedRef: MutableRefObject<boolean>;
    applyRef: MutableRefObject<ApplyPartTransform | undefined>;
    metaRef: MutableRefObject<AnimationViewMetadata | null>;
    setBakeState: Dispatch<SetStateAction<BakeState>>;
    setBakeError: Dispatch<SetStateAction<string | null>>;
    setBakeFrames: Dispatch<SetStateAction<number>>;
    setCollisions: Dispatch<SetStateAction<readonly BakedCollision[]>>;
}

/** Fetch (or reuse) the bake for the current key. Single-flight: a second
 *  caller while a fetch is pending awaits the same promise. */
export async function ensureBakedTimeline(ctx: EnsureBakeContext): Promise<BakedTimeline | null> {
    const {
        token,
        bakeFetcherRef,
        bakeRef,
        bakeInFlightRef,
        settledSelfCreditsRef,
        mountedRef,
        applyRef,
        metaRef,
        setBakeState,
        setBakeError,
        setBakeFrames,
        setCollisions,
    } = ctx;
    if (!token || !applyRef.current || !metaRef.current) return null;
    if (bakeRef.current) return bakeRef.current;
    if (bakeInFlightRef.current) return bakeInFlightRef.current;
    setBakeState('baking');
    setBakeError(null);
    const promise = (async () => {
        try {
            const baked = await bakeFetcherRef.current(token);
            // A completed bake restores the pre-bake pose with ONE trailing
            // (non-silent) relower — a self-edit that must not invalidate
            // this very bake. The fetch has resolved, so that relower has
            // already been emitted on the SSE stream: register a SETTLED
            // self-credit BEFORE storing the result so the epoch bump that
            // follows is matched, not acted on.
            settledSelfCreditsRef.current += 1;
            if (!mountedRef.current) return null;
            bakeRef.current = baked;
            setBakeFrames(baked.frames);
            setCollisions(baked.collisions ?? []);
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
}

/** Sample every track at `at` → one param-edit batch (for the pause-sync
 *  and the readout). Pure; no I/O. */
export function sampleTrackBatch(
    metaRef: MutableRefObject<AnimationViewMetadata | null>,
    at: number,
): ParamEdit[] {
    const meta = metaRef.current;
    if (!meta) return [];
    return meta.tracks.map((track) => ({ name: track.param, value: sampleTrackAt(track, at) }));
}

/** Apply the baked pose at `at` directly to the viewport part groups. No
 *  kernel round-trip. No-op when no bake/apply path is available. */
export function applyBakedPose(
    bakeRef: MutableRefObject<BakedTimeline | null>,
    applyRef: MutableRefObject<ApplyPartTransform | undefined>,
    at: number,
): void {
    const baked = bakeRef.current;
    const apply = applyRef.current;
    if (!baked || !apply) return;
    const transforms = sampleBakedTransforms(baked, at);
    for (const [partName, matrix] of Object.entries(transforms)) {
        apply(partName, matrix);
    }
}

/** State coherence: push ONE param batch so the kernel/session pose matches
 *  the displayed frame. Called on pause/stop and scrub — NOT per tick. */
export function syncKernelPose(
    updateRef: MutableRefObject<UpdateParamFn | undefined>,
    settledSelfCreditsRef: MutableRefObject<number>,
    sampleBatch: (at: number) => ParamEdit[],
    at: number,
): void {
    const fn = updateRef.current;
    if (!fn) return;
    const batch = sampleBatch(at);
    if (batch.length === 0) return;
    // This is a player-originated kernel write — it relowers ONE (the
    // displayed pose) and bumps the kernel epoch. Register the self-credit
    // ONLY once the write SETTLES (the promise resolves), never optimistically
    // at issue time: until the server has processed the write its relower has
    // not been emitted, so a FOREIGN relower interleaving in that window must
    // invalidate (bias-to-rebake) rather than be swallowed by a phantom
    // credit. On failure no relower fired, so no credit is registered.
    fn(batch).then(
        () => { settledSelfCreditsRef.current += 1; },
        (err: unknown) => {
            console.warn('[AnimationTab] pause-sync updateParam failed', err, batch);
        },
    );
}
