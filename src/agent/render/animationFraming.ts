// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/render/animationFraming.ts
//
// One camera for a whole timeline. Per-frame bbox fit zooms and slides as a
// mechanism reaches; locking to the union of those boxes keeps the base
// planted so the joint motion is what the eye follows.

import type { Bounds } from '../../modeling/capture/featureMeshing';

/** The union box is looser than the silhouette (a reach leaves empty
 *  corners), so this pulls the camera in. The viewer's own fit margin
 *  still keeps the mesh off the frame edge. */
export const FRAME_LOCK_PAD = 0.8;

export function unionBounds(boxes: readonly Bounds[]): Bounds | undefined {
  if (boxes.length === 0) return undefined;
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const box of boxes) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], box.min[axis]);
      max[axis] = Math.max(max[axis], box.max[axis]);
    }
  }
  return { min, max };
}

/** Grow `box` about its centre. `factor` 1 leaves it unchanged. */
export function padBounds(box: Bounds, factor: number): Bounds {
  const min: [number, number, number] = [0, 0, 0];
  const max: [number, number, number] = [0, 0, 0];
  for (let axis = 0; axis < 3; axis += 1) {
    const centre = (box.min[axis] + box.max[axis]) / 2;
    const half = ((box.max[axis] - box.min[axis]) / 2) * factor;
    min[axis] = centre - half;
    max[axis] = centre + half;
  }
  return { min, max };
}
