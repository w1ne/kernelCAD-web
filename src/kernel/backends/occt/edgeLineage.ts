// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Edge lineage through a history-aware boolean. A kept edge keeps its hash, a
// split edge hands its lineage to each child, a deleted edge drops out. Every
// result edge no input explains is born on the operation, so `createdBy` and
// `withLabel` edge queries keep working after a hole, cutout or subtract.

import type { EdgeHistoryMap } from '../../naming/evolutionRecord';
import { stampLineageMap } from '../../naming/operationLineage';
import type { BooleanHistoryResult } from './historyAwareBooleans';
import type { OcctBackend } from './occtBackend';

export function mergeEdges(
  inputMaps: readonly (EdgeHistoryMap | undefined)[],
  result: Pick<BooleanHistoryResult, 'edgeHistory' | 'deletedEdges'>,
): EdgeHistoryMap {
  const out: EdgeHistoryMap = new Map();
  for (const inputMap of inputMaps) {
    if (!inputMap) continue;
    for (const [hash, lineage] of inputMap) {
      if (result.deletedEdges.has(hash)) continue;
      const children = result.edgeHistory.get(hash);
      if (children && children.length > 0) {
        for (const child of children) if (!out.has(child)) out.set(child, lineage);
      } else if (!out.has(hash)) out.set(hash, lineage);
    }
  }
  return out;
}

/** Edge lineage of `body` cut by a tool that carries none, stamped with `featureId`. */
export function edgeLineageAfterCut(
  body: OcctBackend,
  result: Pick<BooleanHistoryResult, 'edgeHistory' | 'deletedEdges'>,
  resultBackend: OcctBackend,
  featureId: string,
): EdgeHistoryMap {
  return stampLineageMap(mergeEdges([body.edgeHistoryMap], result), resultBackend.edgeHashes(), featureId);
}
