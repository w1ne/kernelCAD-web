// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Which features a parameter edit must re-lower. The old rule re-lowered
// every feature from the first reader to the end of the chain, so a width
// edit rebuilt an unrelated solid captured later. This follows the same
// predecessor edges the recompute engine uses: a feature re-lowers when it
// reads the parameter, or when it consumes a feature that re-lowers.

import type { FeatureRecord } from '../shared/intent/featureRecord';
import type { FeatureId } from '../shared/intent/types';
import { predecessorsByRecord } from './compute/recomputeEngine';

function readsEditedParam(record: FeatureRecord, editedNames: ReadonlySet<string>): boolean {
  const refs = (record.metadata as { paramRefs?: string[] } | undefined)?.paramRefs ?? [];
  return refs.some((name) => editedNames.has(name));
}

/** Feature ids that must re-lower, in record order. */
export function affectedFeatureIds(
  records: readonly FeatureRecord[],
  editedNames: ReadonlySet<string>,
): Set<FeatureId> {
  const direct = records.filter((record) => readsEditedParam(record, editedNames));
  const reachable = new Set<FeatureId>(direct.map((record) => record.id));
  if (reachable.size === 0) return reachable;

  const successors = new Map<FeatureId, FeatureId[]>();
  for (const record of records) successors.set(record.id, []);
  for (const [id, preds] of predecessorsByRecord(records)) {
    for (const pred of preds) successors.get(pred)?.push(id);
  }

  const queue = [...reachable];
  for (let i = 0; i < queue.length; i++) {
    for (const next of successors.get(queue[i]) ?? []) {
      if (reachable.has(next)) continue;
      reachable.add(next);
      queue.push(next);
    }
  }

  const ordered = new Set<FeatureId>();
  for (const record of records) {
    if (reachable.has(record.id)) ordered.add(record.id);
  }
  return ordered;
}
