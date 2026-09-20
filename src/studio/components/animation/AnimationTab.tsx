// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { JSX } from 'react';
import { useRecomputeResult } from '../../hooks/useRecomputeResult';
import { useWorkbench } from '../../context/WorkbenchContext';
import { selectAnimationMetadata } from '../../logic/animationRecord';
import { shouldUseHostedMesh } from '../../scriptSource';
import { fetchGalleryAnimBake } from './fetchGalleryAnimBake';
import { useAnimationPlayback } from './useAnimationPlayback';
import { AnimationNotes, AnimationScrubber, AnimationTrackList, AnimationTransport } from './AnimationTabParts';

/**
 * Inspector Animation tab — a review cockpit for the script's
 * `animationView(...)` timeline. The timeline is BAKED server-side once
 * (`POST /__kernelcad/animation-bake` → per-part world matrices at every
 * frame, no geometry), then played back smoothly on the client: each rAF tick
 * interpolates (slerp rotation, lerp position) between baked frames and applies
 * the result directly to the existing viewport part groups via
 * `setGeometryTransformOverride` — no kernel re-solve per frame. Scrub is the
 * same path (instant).
 *
 * State coherence: during playback the kernel session is untouched. On
 * pause/stop and scrub the player sends ONE `updateParam` batch so the
 * kernel/session pose matches the displayed frame (Export/Validate otherwise
 * read the stale pre-playback pose).
 *
 * Live drive needs the server-pool session (`?script=`) — the bake source. In
 * editor/local mode there is no session token, so the scrubber still reads
 * sampled values but the viewport does not move — an inline note says so.
 */
export function AnimationTab(): JSX.Element {
    const {
        features,
        updateParam,
        setGeometryTransformOverride,
        clearGeometryTransformOverrides,
        setViewportDriverLock,
    } = useRecomputeResult();
    const { sessionToken, kernelEpoch, code } = useWorkbench();
    const metadata = selectAnimationMetadata(features);

    // Gallery static-bake mode: on the hosted app with no live session, an
    // animated curated model plays from its build-time precomputed timeline
    // (`/gallery/_anim/<sha>.json`) — anonymous visitors can't open a session,
    // so this is how the gallery mechanism moves. Active only when hosted,
    // session-less, animated, and we have the source to key the static file.
    const galleryStatic = Boolean(!sessionToken && metadata && code && shouldUseHostedMesh());

    const playback = useAnimationPlayback({
        metadata,
        sessionToken,
        // Gallery static bake source: the source code, which fetchGalleryAnimBake
        // hashes to locate the static `_anim/<sha>.json`.
        staticBakeKey: galleryStatic ? code : undefined,
        bakeFetcher: galleryStatic ? fetchGalleryAnimBake : undefined,
        // updateParam is the pause-sync edit; needs a live session (no kernel to
        // sync in static mode), so session-only.
        updateParam: sessionToken ? updateParam : undefined,
        // Apply baked transforms to the viewport in BOTH live-session and
        // gallery-static mode (the gallery geometry is rendered and overridable).
        applyPartTransform: (sessionToken || galleryStatic) ? setGeometryTransformOverride : undefined,
        clearPartTransforms: clearGeometryTransformOverrides,
        // The viewport driver-lock guards against SSE relower races — only the
        // live session has those; static mode needs no lock.
        setViewportDriverLock: sessionToken ? setViewportDriverLock : undefined,
        // Any kernel relower (Params-tab edit, rebuild) bumps this; folded into
        // the bake cache key so a stale bake never survives a kernel mutation.
        kernelEpoch,
    });

    if (!metadata) {
        return (
            <div
                className="px-4 py-3 text-sm text-gray-500"
                data-testid="animation-empty-state"
            >
                No animationView() declared
            </div>
        );
    }

    const {
        durationMs, fps, name, tMs, isPlaying, mode, speed, trackValues, canDrive,
        bakeState, bakeError, collisions,
    } = playback;

    return (
        <div className="flex flex-col" data-testid="animation-tab">
            <div className="flex items-baseline justify-between px-3 pt-2 pb-1">
                <span className="text-xs text-gray-200 truncate" title={name}>{name}</span>
                <span className="text-[10px] text-gray-500">
                    {(durationMs / 1000).toFixed(2)}s · {fps} fps
                </span>
            </div>

            <AnimationNotes canDrive={canDrive} bakeState={bakeState} bakeError={bakeError} />

            {/* Transport */}
            <AnimationTransport
                isPlaying={isPlaying}
                mode={mode}
                speed={speed}
                onToggle={playback.toggle}
                onMode={playback.setMode}
                onSpeed={playback.setSpeed}
            />

            {/* Scrubber */}
            <AnimationScrubber
                durationMs={durationMs}
                tMs={tMs}
                onPause={playback.pause}
                onScrubTo={playback.scrubTo}
            />

            {/* Per-track readout */}
            <AnimationTrackList trackValues={trackValues} />

            {canDrive && collisions.length > 0 && (
                <div
                    className="mx-3 mt-2 px-2 py-1.5 text-[10px] leading-tight text-amber-200/90 bg-amber-950/30 border border-amber-900/60 rounded"
                    data-testid="animation-collision-warning"
                >
                    ⚠ {collisions.length} pose collision{collisions.length === 1 ? '' : 's'} in
                    this timeline — run `kernelcad animate` for the colliding
                    pairs and times.
                </div>
            )}

        </div>
    );
}
