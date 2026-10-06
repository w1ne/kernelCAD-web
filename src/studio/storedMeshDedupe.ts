// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureMeshSerialized } from '../modeling/capture/featureMeshSerialize';

/** Two solved assemblies sometimes land in one artifact at the same pose.
 *  Drawing both z-fights (faces flash solid black and white). Keep the later
 *  copy of a part that shares a name, transform, and first-face sample. */
export function dedupeCoincidentParts(
  features: readonly FeatureMeshSerialized[],
): FeatureMeshSerialized[] {
  const last = new Map<string, number>();
  features.forEach((feature, index) => {
    const name = feature.assemblyPartName;
    if (!name) return;
    last.set(coincidentPartKey(feature, name), index);
  });
  return features.filter((feature, index) => {
    const name = feature.assemblyPartName;
    if (!name) return true;
    return last.get(coincidentPartKey(feature, name)) === index;
  });
}

function coincidentPartKey(feature: FeatureMeshSerialized, name: string): string {
  const transform = (feature.transform ?? []).map((n) => Math.round(n * 1e3)).join(',');
  const sample = (feature.faces[0]?.vertices ?? []).slice(0, 9).map((n) => Math.round(n * 1e3)).join(',');
  return `${name}|${feature.faces.length}|${transform}|${sample}`;
}
