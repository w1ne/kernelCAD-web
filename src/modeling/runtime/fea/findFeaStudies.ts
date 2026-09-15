// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/fea/findFeaStudies.ts
//
// Locates `feaStudy` declarations in a record list and the shape each one is
// bound to. Shared by the MCP tool and the evaluate-time gate so both agree
// on which study a script means — the alternative (each caller scanning the
// records its own way) is how a gate ends up enforcing a different study from
// the one the tool reported on.

import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { FeaStudyMetadata } from '../../../shared/intent/feaStudyRecord';

export interface FoundFeaStudy {
  /** Id of the feaStudy record itself. */
  recordId: string;
  /** Id of the shape feature the study analyses. */
  shapeId: string;
  metadata: FeaStudyMetadata;
}

/** Every feaStudy declared by the script, in declaration order. */
export function findFeaStudies(records: readonly FeatureRecord[]): FoundFeaStudy[] {
  const out: FoundFeaStudy[] = [];
  for (const r of records) {
    if (r.kind !== 'feaStudy') continue;
    const shapeRef = r.inputs?.shape;
    // The study's shape is always captured as a plain feature ref (see
    // `Shape.feaStudy`); any other ref kind means a hand-built record, which
    // this scan deliberately ignores rather than guessing at.
    if (shapeRef === undefined || shapeRef.kind !== 'feature') continue;
    out.push({
      recordId: r.id,
      shapeId: shapeRef.id,
      metadata: r.metadata as unknown as FeaStudyMetadata,
    });
  }
  return out;
}

/** Pick the study a caller asked for by name, or the last declared one.
 *  Returns undefined when the name matches nothing, so the caller can say so
 *  rather than silently analysing a different study. */
export function selectFeaStudy(
  studies: readonly FoundFeaStudy[],
  name: string | undefined,
): FoundFeaStudy | undefined {
  if (studies.length === 0) return undefined;
  if (name === undefined) return studies[studies.length - 1];
  return studies.find(s => s.metadata.name === name);
}
