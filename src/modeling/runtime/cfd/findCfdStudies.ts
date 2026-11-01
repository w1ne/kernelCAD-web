// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/cfd/findCfdStudies.ts
//
// Locates `cfdStudy` declarations in a record list and the shape each is
// bound to (same rules as findFeaStudies).

import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { CfdStudyMetadata } from '../../../shared/intent/cfdStudyRecord';

export interface FoundCfdStudy {
  recordId: string;
  shapeId: string;
  metadata: CfdStudyMetadata;
}

export function findCfdStudies(records: readonly FeatureRecord[]): FoundCfdStudy[] {
  const out: FoundCfdStudy[] = [];
  for (const r of records) {
    if (r.kind !== 'cfdStudy') continue;
    const shapeRef = r.inputs?.shape;
    if (shapeRef === undefined || shapeRef.kind !== 'feature') continue;
    out.push({ recordId: r.id, shapeId: shapeRef.id, metadata: r.metadata as unknown as CfdStudyMetadata });
  }
  return out;
}

/** The named study, or the last declared one; undefined when the name matches nothing. */
export function selectCfdStudy(studies: readonly FoundCfdStudy[], name: string | undefined): FoundCfdStudy | undefined {
  if (studies.length === 0) return undefined;
  if (name === undefined) return studies[studies.length - 1];
  return studies.find(s => s.metadata.name === name);
}
