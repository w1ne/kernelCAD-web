// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Model envelope from the existing bounding-box path. Scenes use the same
// world-frame parts the exporters already clone.

import type { ShapeBackend } from '../../../kernel/backends/backend';
import { isSceneBackend, type SceneBackend } from '../../../kernel/backends/sceneBackend';
import { sceneToWorldFrameParts } from '../../../kernel/backends/occt/sceneToWorldFrame';
import type { ScanBBox, Vec3 } from '../../../shared/scan';

function copy3(values: ArrayLike<number>): Vec3 | undefined {
  const out: Vec3 = [values[0], values[1], values[2]];
  if (out.some(value => !Number.isFinite(value))) return undefined;
  return out;
}

function boxFromMinMax(min: ArrayLike<number>, max: ArrayLike<number>): ScanBBox | undefined {
  const low = copy3(min);
  const high = copy3(max);
  if (!low || !high) return undefined;
  return { min: low, max: high, size: [high[0] - low[0], high[1] - low[1], high[2] - low[2]] };
}

function sceneEnvelope(root: SceneBackend): ScanBBox | undefined {
  const parts = sceneToWorldFrameParts(root);
  try {
    if (parts.length === 0) return undefined;
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (const part of parts) {
      const box = part.shape.boundingBox();
      for (let axis = 0; axis < 3; axis++) {
        min[axis] = Math.min(min[axis], box.min[axis]);
        max[axis] = Math.max(max[axis], box.max[axis]);
      }
    }
    return boxFromMinMax(min, max);
  } finally {
    for (const part of parts) part.shape.dispose();
  }
}

/** Axis-aligned bbox of the script's returned solid, in millimetres. */
export function measuredModelBbox(root: ShapeBackend): ScanBBox | undefined {
  if (isSceneBackend(root)) return sceneEnvelope(root);
  const box = root.boundingBox();
  return boxFromMinMax(box.min, box.max);
}
