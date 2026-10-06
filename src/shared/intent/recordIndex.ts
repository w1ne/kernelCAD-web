// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// id -> FeatureRecord index shared by capture, lowering and review code.
// Capture and assembly lowering used to call `records.find(r => r.id === x)`
// once per part, which is O(n²) for plant-scale assemblies. Records arrays
// are append-only (CaptureSession pushes; reset/import assign a new array),
// so the index is cached per array object and extended on growth.

import type { FeatureRecord } from './featureRecord';
import type { FeatureId } from './types';

interface IndexEntry {
  readonly map: Map<FeatureId, FeatureRecord>;
  size: number;
  first: FeatureRecord | undefined;
}

const indexByArray = new WeakMap<readonly FeatureRecord[], IndexEntry>();
let builds = 0;

export function getRecordIndex(records: readonly FeatureRecord[]): ReadonlyMap<FeatureId, FeatureRecord> {
  let entry = indexByArray.get(records);
  if (entry === undefined || records.length < entry.size || records[0] !== entry.first) {
    entry = { map: new Map(), size: 0, first: records[0] };
    indexByArray.set(records, entry);
    builds += 1;
  }
  for (let i = entry.size; i < records.length; i++) {
    const r = records[i];
    if (!entry.map.has(r.id)) entry.map.set(r.id, r);
  }
  entry.size = records.length;
  entry.first = records[0];
  return entry.map;
}

export function recordById(records: readonly FeatureRecord[], id: FeatureId): FeatureRecord | undefined {
  return getRecordIndex(records).get(id);
}

/** Test-only: number of full index builds since process start. */
export function __recordIndexBuildsForTests(): number {
  return builds;
}
