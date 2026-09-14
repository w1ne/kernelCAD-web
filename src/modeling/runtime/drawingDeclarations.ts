// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/drawingDeclarations.ts
//
// Collects the GD&T a script declared with `shape.datum()` / `shape.tolerance()`
// for one exported target. A declaration counts when the shape it was made on
// is the exported feature or feeds it (any upstream input, transitively), so
// `plate.datum('A', ...)` followed by more booleans on `plate` still lands on
// the drawing of the final body, while a declaration on an unrelated body that
// never reaches the export does not.

import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type {
  DrawingDatumMetadata,
  DrawingDeclarations,
  DrawingToleranceMetadata,
} from '../../shared/intent/drawingGdtRecord';

function upstreamIds(records: readonly FeatureRecord[], targetId: string): Set<string> {
  const byId = new Map(records.map(r => [r.id, r]));
  const seen = new Set<string>();
  const stack = [targetId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const r = byId.get(id);
    if (!r) continue;
    for (const ref of Object.values(r.inputs ?? {})) {
      if (ref.kind === 'feature') stack.push(ref.id);
      else if (ref.kind !== 'surface') stack.push(ref.featureId);
    }
  }
  return seen;
}

/** Declarations bound to `targetId` or anything upstream of it, in capture order. */
export function collectDrawingDeclarations(
  records: readonly FeatureRecord[],
  targetId: string,
): DrawingDeclarations {
  const upstream = upstreamIds(records, targetId);
  const out: DrawingDeclarations = { datums: [], tolerances: [] };
  for (const r of records) {
    if (r.kind !== 'drawingDatum' && r.kind !== 'drawingTolerance') continue;
    const ref = r.inputs?.shape;
    if (ref === undefined || ref.kind !== 'feature' || !upstream.has(ref.id)) continue;
    if (r.kind === 'drawingDatum') {
      const m = r.metadata as unknown as DrawingDatumMetadata;
      out.datums.push({ label: m.label, face: m.face });
    } else {
      const m = r.metadata as unknown as DrawingToleranceMetadata;
      out.tolerances.push({
        type: m.type,
        value: m.value,
        ...(m.face !== undefined ? { face: m.face } : {}),
        ...(m.edge !== undefined ? { edge: m.edge } : {}),
        datums: [...m.datums],
        ...(m.modifier !== undefined ? { modifier: m.modifier } : {}),
      });
    }
  }
  return out;
}
