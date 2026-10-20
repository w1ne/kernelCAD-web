// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Patch a param drag into the meshes already on screen. The server sends only
// the features it re-lowered; everything else stays as the viewer has it.

import type { GeometryResult } from '../../../shared/worker/geometryEngine';

export function mergeFeatureGeometries(
  previous: readonly GeometryResult[],
  incoming: readonly GeometryResult[],
  changedFeatureIds: readonly string[],
): GeometryResult[] {
  const changed = new Set(changedFeatureIds);
  const incomingById = new Map<string, GeometryResult>();
  for (const geo of incoming) {
    if (geo.featureId) incomingById.set(geo.featureId, geo);
  }
  const seen = new Set<string>();
  const merged: GeometryResult[] = [];
  for (const geo of previous) {
    const id = geo.featureId;
    if (id && changed.has(id)) {
      const next = incomingById.get(id);
      if (next) merged.push(next);
      if (id) seen.add(id);
      continue;
    }
    merged.push(geo);
    if (id) seen.add(id);
  }
  for (const geo of incoming) {
    if (geo.featureId && !seen.has(geo.featureId)) merged.push(geo);
  }
  return merged;
}
