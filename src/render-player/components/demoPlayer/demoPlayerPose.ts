// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/render-player/components/demoPlayer/demoPlayerPose.ts
//
// Transform-only re-pose for already-loaded feature groups. Animation frames
// whose mesh buffers did not change call this instead of re-sending geometry.

import * as THREE from 'three';
import { KCAD_FEATURE_GROUP_KEY, fitCameraToBounds } from './demoPlayerGeometry';

interface PoseScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
}

/** Transform-only re-pose: replace each loaded group's matrix and recentre it
 *  the same way `loadFeatureMeshes` does (centroid offset premultiplied, camera
 *  refit to the supplied bounds). Geometry is not re-sent. Unknown feature ids
 *  are skipped; the return value is the number of groups actually updated. */
export function updateFeatureTransforms(
  ctx: PoseScene,
  centroidOffsetRef: { current: [number, number, number] },
  transforms: Array<{ featureId: string; transform: number[] }>,
  bounds: { min: [number, number, number]; max: [number, number, number] },
): { updated: number } {
  const groups = new Map<string, THREE.Group>();
  for (const child of ctx.scene.children) {
    if (child instanceof THREE.Group && child.userData[KCAD_FEATURE_GROUP_KEY]) {
      groups.set(String(child.userData.featureId), child);
    }
  }
  const [minX, minY, minZ] = bounds.min;
  const [maxX, maxY, maxZ] = bounds.max;
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
  const centroidOffset = new THREE.Matrix4().makeTranslation(-cx, -cy, -cz);
  let updated = 0;
  for (const { featureId, transform } of transforms) {
    const group = groups.get(featureId);
    // Features without a 16-value transform (non-geometry records) keep the
    // group they were loaded with.
    if (!group || transform.length !== 16) continue;
    group.matrixAutoUpdate = false;
    group.matrix.fromArray(transform);
    group.matrix.premultiply(centroidOffset);
    group.matrixWorldNeedsUpdate = true;
    updated += 1;
  }
  centroidOffsetRef.current = [cx, cy, cz];
  fitCameraToBounds(ctx.camera, {
    min: [minX - cx, minY - cy, minZ - cz],
    max: [maxX - cx, maxY - cy, maxZ - cz],
  });
  return { updated };
}

