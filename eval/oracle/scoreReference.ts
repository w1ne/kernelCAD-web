// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/oracle/scoreReference.ts
//
// Wraps src/lib/imageSimilarity/score.ts for per-task harnesses that score
// a rendered model against a reference photograph.
//
// The underlying scorer normalises both images to grayscale, segments the
// silhouette via corner-background subtraction, crops both masks to their
// bbox, then computes per-gate scores (silhouette IoU / SSIM / pHash) plus
// diagnostics with hints naming the worst-mismatch quadrant.

import { readFileSync, existsSync } from 'node:fs';
import { scoreRenderVsReference, type ImageSimilarityScore } from '../../src/lib/imageSimilarity/score';

export type { ImageSimilarityScore };

export async function scoreAgainstReference(
  renderPath: string,
  referencePath: string,
): Promise<ImageSimilarityScore> {
  if (!existsSync(renderPath)) {
    throw new Error(`scoreAgainstReference: render not found at ${renderPath}`);
  }
  if (!existsSync(referencePath)) {
    throw new Error(`scoreAgainstReference: reference not found at ${referencePath}`);
  }
  return await scoreRenderVsReference(
    readFileSync(renderPath),
    readFileSync(referencePath),
  );
}
