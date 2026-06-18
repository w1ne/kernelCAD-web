// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/vision/hybridBackend.ts
//
// Hybrid backend = opencv silhouette + LLM-labeled named points/bboxes. Used
// when the router sees a uniform-bg image AND any named-point/bbox feature
// in the request.
//
// Caveat: opencv has no way to distinguish multiple silhouette features in
// one image — every silhouette/curve feature is assigned the *same* polyline.
// That's documented in the kernelcad-trace-from-image SKILL.md so the agent
// doesn't naively request two independent silhouettes from the same photo.

import { extractSilhouettePolyline as defaultExtractSilhouettePolyline } from './opencvBackend';
import { extractFeaturesViaLLM, type VisionLlmClient } from './visionLlmBackend';
import type {
  TraceFeatureRequest,
  TraceFeatureResult,
  Vec2Normalized,
} from './types';
import type { VisionMediaType } from './anthropicVisionClient';

/** Dependency-injection seam — tests stub the opencv side without touching WASM. */
export interface HybridDeps {
  extractSilhouettePolyline?: (
    pngBytes: Buffer,
    maxWaypoints: number,
  ) => Promise<Vec2Normalized[]>;
}

/**
 * Trace a uniform-bg image using opencv for silhouettes/curves and the LLM
 * for named points/bboxes. Returns features in the same order as the input
 * `features` array.
 */
export async function traceHybrid(
  client: VisionLlmClient,
  imageBytes: Buffer,
  mediaType: VisionMediaType,
  features: TraceFeatureRequest[],
  hint: string | undefined,
  maxWaypointsPerFeature: number,
  deps: HybridDeps = {},
): Promise<TraceFeatureResult[]> {
  const extract = deps.extractSilhouettePolyline ?? defaultExtractSilhouettePolyline;

  const silhouetteFeatures = features.filter(
    (f) => f.kind === 'silhouette' || f.kind === 'curve',
  );
  const namedFeatures = features.filter(
    (f) => f.kind === 'point' || f.kind === 'bbox',
  );

  let sharedPolyline: Vec2Normalized[] | null = null;
  if (silhouetteFeatures.length > 0) {
    sharedPolyline = await extract(imageBytes, maxWaypointsPerFeature);
  }

  let namedResults: TraceFeatureResult[] = [];
  if (namedFeatures.length > 0) {
    const imageU8 = new Uint8Array(
      imageBytes.buffer,
      imageBytes.byteOffset,
      imageBytes.byteLength,
    );
    namedResults = await extractFeaturesViaLLM(
      client,
      imageU8,
      mediaType,
      namedFeatures,
      hint,
      maxWaypointsPerFeature,
    );
  }

  // Reassemble in original order.
  const byLabel = new Map<string, TraceFeatureResult>();
  for (const f of silhouetteFeatures) {
    byLabel.set(f.label, {
      label: f.label,
      kind: f.kind,
      waypoints: sharedPolyline ?? [],
      confidence: 1,
      backend: 'opencv',
    });
  }
  for (const r of namedResults) {
    byLabel.set(r.label, r);
  }
  return features.map((f) => {
    const r = byLabel.get(f.label);
    if (!r) {
      throw new Error(
        `hybridBackend: missing result for requested feature "${f.label}"`,
      );
    }
    return r;
  });
}
