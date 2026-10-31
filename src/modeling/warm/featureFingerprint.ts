// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Per-feature input fingerprint: the record's resolved lowering fields plus
// the fingerprints of the features it consumes. Capture order is a valid
// topological order, so a feature's inputs are already fingerprinted.

import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { SurfaceRecord } from '../../shared/intent/surfaceRecord';
import type { ParamTable } from '../../shared/runtime/paramTable';
import { stableStringify, structuralHashRecord } from '../compute/prefixReuse';

function inputIds(record: FeatureRecord): string[] {
  const ids: string[] = [];
  for (const ref of Object.values(record.inputs)) {
    if (ref.kind === 'feature') ids.push(ref.id);
    else if (ref.kind === 'face' || ref.kind === 'edge' || ref.kind === 'vertex') ids.push(ref.featureId);
    else if (ref.kind === 'surface') ids.push(ref.surfaceId);
  }
  return ids;
}

/** One fingerprint per record id, in record order. Surface payloads are
 *  entered first so a consumer hashes the surface it actually builds from. */
export function featureFingerprints(
  records: readonly FeatureRecord[],
  paramTable: ParamTable,
  surfaces: readonly SurfaceRecord[] = [],
): Map<string, string> {
  const out = new Map<string, string>();
  for (const surface of surfaces) {
    out.set(surface.id, stableStringify({ kind: surface.kind, params: surface.params, data: surface.data }));
  }
  for (const record of records) {
    const upstream = inputIds(record).map((id) => out.get(id) ?? '?').join(',');
    out.set(record.id, `${structuralHashRecord(record, paramTable)}|${upstream}`);
  }
  return out;
}
