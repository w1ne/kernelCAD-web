// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Compact Play / scrub chrome for ChatGPT embed / FunnelViewer.
 * Drives part transforms from a CDN anim-artifacts bake (no live session).
 */
import { useEffect, useState, type JSX } from 'react';
import { useRecomputeResult } from '../../studio/hooks/useRecomputeResult';
import { useAnimationPlayback } from '../../studio/components/animation/useAnimationPlayback';
import {
  AnimationNotes,
  AnimationScrubber,
  AnimationTransport,
} from '../../studio/components/animation/AnimationTabParts';
import {
  fetchCdnAnimArtifact,
  fetchCdnAnimBake,
} from '../../studio/components/animation/fetchCdnAnimBake';
import type { AnimationViewMetadata } from '../../shared/intent/animationViewRecord';

export interface EmbedAnimationOverlayProps {
  animUrl: string;
}

export function EmbedAnimationOverlay({ animUrl }: EmbedAnimationOverlayProps): JSX.Element | null {
  const {
    setGeometryTransformOverride,
    clearGeometryTransformOverrides,
  } = useRecomputeResult();

  const [metadata, setMetadata] = useState<AnimationViewMetadata | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  // Parent remounts with key={animUrl}; do not reset state synchronously here
  // (react-hooks/set-state-in-effect). Only setState from the fetch callbacks.
  useEffect(() => {
    let cancelled = false;
    void fetchCdnAnimArtifact(animUrl)
      .then((artifact) => {
        if (cancelled) return;
        if (artifact.metadata && Array.isArray(artifact.metadata.tracks)) {
          setMetadata(artifact.metadata);
          return;
        }
        setMetadata({
          name: 'animation',
          tracks: [],
          fps: artifact.fps,
          durationMs: artifact.durationMs,
          virtual: true,
        });
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true);
      });
    return () => {
      cancelled = true;
    };
  }, [animUrl]);

  const playback = useAnimationPlayback({
    metadata,
    sessionToken: null,
    staticBakeKey: metadata ? animUrl : null,
    bakeFetcher: fetchCdnAnimBake,
    updateParam: undefined,
    applyPartTransform: setGeometryTransformOverride,
    clearPartTransforms: clearGeometryTransformOverrides,
  });

  if (unavailable || !metadata) return null;

  const {
    durationMs, name, tMs, isPlaying, mode, speed, canDrive,
    bakeState, bakeError,
  } = playback;

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-10 pointer-events-none"
      data-testid="embed-animation-overlay"
    >
      <div className="pointer-events-auto mx-auto mb-3 max-w-md rounded-lg border border-white/10 bg-black/70 backdrop-blur px-2 pt-2 pb-1 shadow-lg">
        <div className="flex items-baseline justify-between px-1 pb-1">
          <span className="text-[11px] text-white/90 truncate" title={name}>{name}</span>
          <span className="text-[10px] text-white/50">
            {(durationMs / 1000).toFixed(1)}s
          </span>
        </div>
        <AnimationNotes canDrive={canDrive} bakeState={bakeState} bakeError={bakeError} />
        <AnimationTransport
          isPlaying={isPlaying}
          mode={mode}
          speed={speed}
          onToggle={playback.toggle}
          onMode={playback.setMode}
          onSpeed={playback.setSpeed}
        />
        <AnimationScrubber
          durationMs={durationMs}
          tMs={tMs}
          onPause={playback.pause}
          onScrubTo={playback.scrubTo}
        />
      </div>
    </div>
  );
}
