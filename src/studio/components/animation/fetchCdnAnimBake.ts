// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Fetches a publish-time CDN animation bake (anim-artifacts/<slug>/vN.json).
// Used by the ChatGPT / embed FunnelViewer Play UI in sessionless static-bake
// mode — same shape as gallery `/_anim/<sha>.json`, plus optional `metadata`.
import type { BakedTimeline } from './bakeInterpolation';
import type { BakeFetcher } from './fetchAnimationBake';
import type { AnimationViewMetadata } from '../../../shared/intent/animationViewRecord';

export interface CdnAnimArtifact extends BakedTimeline {
  revision?: number;
  metadata?: AnimationViewMetadata;
}

export async function fetchCdnAnimArtifact(animUrl: string): Promise<CdnAnimArtifact> {
  const res = await fetch(animUrl);
  if (!res.ok) {
    throw new Error(`animation bake unavailable (${res.status})`);
  }
  return (await res.json()) as CdnAnimArtifact;
}

/** BakeFetcher for useAnimationPlayback staticBakeKey=animUrl. */
export const fetchCdnAnimBake: BakeFetcher = async (animUrl) => {
  const artifact = await fetchCdnAnimArtifact(animUrl);
  const { frames, durationMs, fps, times, parts, collisions } = artifact;
  return { frames, durationMs, fps, times, parts, collisions };
};
