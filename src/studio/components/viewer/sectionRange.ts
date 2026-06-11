// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as THREE from 'three';
import type { GeometryResult } from '../../../shared/worker/geometryEngine';
import { applyGeometryTransform } from './entities/geometryTransform';

/** Axis-aligned bounds over all transformed face vertices, or null if empty. */
export function computeGeometryBox(geometries: GeometryResult[]): THREE.Box3 | null {
  const box = new THREE.Box3();
  let saw = false;
  const v = new THREE.Vector3();
  for (const g of geometries) {
    for (const face of g.faces) {
      const verts = face.vertices;
      for (let i = 0; i + 2 < verts.length; i += 3) {
        const x = verts[i], y = verts[i + 1], z = verts[i + 2];
        if (![x, y, z].every((n) => typeof n === 'number' && Number.isFinite(n))) continue;
        v.set(x, y, z);
        box.expandByPoint(applyGeometryTransform(v.clone(), g));
        saw = true;
      }
    }
  }
  return saw ? box : null;
}

/** Per-axis {min, max, center} from a Box3, for the position slider range. */
export function sectionRange(
  box: THREE.Box3,
  axis: 'x' | 'y' | 'z',
): { min: number; max: number; center: number } {
  const min = box.min[axis];
  const max = box.max[axis];
  return { min, max, center: (min + max) / 2 };
}
