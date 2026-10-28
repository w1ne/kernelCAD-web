// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { EdgeLineage, FaceLineage } from './evolutionRecord';

type Lineage = FaceLineage | EdgeLineage;

/** Feature ids this entity descends from. A missing list is the birth stamp. */
export function descentOf(lineage: Lineage): readonly string[] {
  if (lineage.descendsFrom && lineage.descendsFrom.length > 0) return lineage.descendsFrom;
  const ids = [lineage.rootFeatureId];
  if (lineage.featureId && lineage.featureId !== lineage.rootFeatureId) ids.push(lineage.featureId);
  return ids;
}

export function descendsFromFeature(lineage: Lineage, featureId: string): boolean {
  return descentOf(lineage).includes(featureId);
}

/** Clone so a later operation can extend descent without mutating a shared ancestor entry. */
export function carryLineage<T extends Lineage>(lineage: T, featureId: string): T {
  const prev = descentOf(lineage);
  const descendsFrom = prev.includes(featureId) ? [...prev] : [...prev, featureId];
  return { ...lineage, descendsFrom };
}

function born(hash: string, featureId: string): FaceLineage {
  return { rootHash: hash, rootFeatureId: featureId, featureId, descendsFrom: [featureId] };
}

/**
 * Faces or edges that survived `featureId` keep their ancestry plus that id.
 * Anything on the result that no input lineage explains was made by the operation.
 */
export function stampLineageMap<T extends Lineage>(
  input: ReadonlyMap<string, T> | undefined,
  resultHashes: readonly string[],
  featureId: string,
): Map<string, T> {
  const out = new Map<string, T>();
  // No ancestry in, no ancestry out. Inventing a birth stamp for every face
  // would make STEP reconstruction reject an otherwise matching candidate.
  if (!input || input.size === 0) return out;
  for (const [hash, lineage] of input) out.set(hash, carryLineage(lineage, featureId));
  for (const hash of resultHashes) {
    if (!out.has(hash)) out.set(hash, born(hash, featureId) as T);
  }
  return out;
}

export function stampSolid(
  faces: ReadonlyMap<string, FaceLineage> | undefined,
  faceHashes: readonly string[],
  edges: ReadonlyMap<string, EdgeLineage> | undefined,
  edgeHashes: readonly string[],
  featureId: string,
): { historyMap: Map<string, FaceLineage>; edgeHistoryMap: Map<string, EdgeLineage> } {
  return {
    historyMap: stampLineageMap(faces, faceHashes, featureId),
    edgeHistoryMap: stampLineageMap(edges, edgeHashes, featureId),
  };
}
