// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Compact Play / scrub chrome for ChatGPT embed / FunnelViewer.
 * Drives part transforms from a CDN anim-artifacts bake (no live session).
 * Intentionally minimal vs Studio Animation tab: Play/Pause + scrubber + label.
 */
import { useEffect, useState, type JSX } from 'react';
import { Pause, Play } from 'lucide-react';
import { useRecomputeResult } from '../../studio/hooks/useRecomputeResult';
import { useAnimationPlayback } from '../../studio/components/animation/useAnimationPlayback';
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

  const { durationMs, name, tMs, isPlaying, bakeState, bakeError } = playback;
  const durationLabel = durationMs >= 1000
    ? `${(durationMs / 1000).toFixed(durationMs % 1000 === 0 ? 0 : 1)}s`
    : `${Math.round(durationMs)}ms`;

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-10 pointer-events-none"
      data-testid="embed-animation-overlay"
    >
      <div className="pointer-events-auto mx-auto mb-3 max-w-sm rounded-lg border border-white/10 bg-black/70 backdrop-blur px-2 py-1.5 shadow-lg">
        {bakeState === 'error' ? (
          <p className="px-1 pb-1 text-[10px] text-red-300/90 truncate" title={bakeError ?? undefined}>
            Animation unavailable
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={playback.toggle}
            className="flex shrink-0 items-center justify-center w-7 h-7 rounded bg-white/10 hover:bg-white/20 text-white border border-white/10"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            data-testid="animation-play-pause"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2 px-0.5 pb-0.5">
              <span className="text-[11px] text-white/90 truncate" title={name}>
                {name}
              </span>
              <span className="shrink-0 text-[10px] text-white/50 tabular-nums">
                {(tMs / 1000).toFixed(2)}s · {durationLabel}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={durationMs}
              step={1}
              value={Math.round(tMs)}
              onPointerDown={playback.pause}
              onChange={(e) => playback.scrubTo(Number(e.target.value))}
              aria-label="Timeline position"
              data-testid="animation-scrubber"
              className="w-full accent-[#4a9eff]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
