// src/naming/geometrySnapshotFallback.ts
//
// Geometry-snapshot fallback resolver. Used by `resolveFaceRef` when the
// topology-route lookup (lineage.featureId + lineage.labelName) loses the
// face — typically after an upstream operation rewrote enough topology that
// the slot lookup returns zero hits. Compares each live `lineage.snapshot`
// against a create-time fingerprint via centroid + normal-dot + area, with
// surfaceType as an exact discriminator.

import type { FaceHash, HistoryMap, FaceLineage } from './evolutionRecord';
import type { FaceSnapshot } from '../backends/occt/createdRefs';

export interface SnapshotTolerance {
  centroidMm: number;
  normalDot: number;
  areaRelative: number;
}

export interface SnapshotMatchResult {
  matches: FaceHash[];
}

function centroidDist(a: readonly number[], b: readonly number[]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
function dot(a: readonly number[], b: readonly number[]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** Scan the historyMap for face lineages whose live `snapshot` matches
 *  `target` within `tol`, filtered by exact `surfaceType` match. Returns
 *  every matching hash. The resolver decides single-vs-multi handling. */
export function findByGeometrySnapshot(
  map: HistoryMap,
  target: FaceSnapshot,
  targetSurfaceType: FaceLineage['surfaceType'],
  tol: SnapshotTolerance,
): SnapshotMatchResult {
  const matches: FaceHash[] = [];
  for (const [hash, lineage] of map.entries()) {
    const snap = lineage.snapshot;
    if (!snap) continue;
    if (lineage.surfaceType !== targetSurfaceType) continue;
    if (centroidDist(snap.centroid, target.centroid) > tol.centroidMm) continue;
    if (dot(snap.normal, target.normal) < tol.normalDot) continue;
    const ratio = target.area === 0 ? 1 : Math.abs(snap.area - target.area) / target.area;
    if (ratio > tol.areaRelative) continue;
    matches.push(hash);
  }
  return { matches };
}
