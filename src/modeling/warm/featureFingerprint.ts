// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Per-feature input fingerprint: the record's resolved lowering fields plus
// the fingerprints of the features it consumes. Capture order is a valid
// topological order, so a feature's inputs are already fingerprinted.

import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { ParamTable } from '../../shared/runtime/paramTable';
import { structuralHashRecord } from '../compute/prefixReuse';

function inputIds(record: FeatureRecord): string[] {
  const ids: string[] = [];
  for (const ref of Object.values(record.inputs)) {
    if (ref.kind === 'feature') ids.push(ref.id);
    else if (ref.kind === 'face' || ref.kind === 'edge' || ref.kind === 'vertex') ids.push(ref.featureId);
  }
  return ids;
}

/** One fingerprint per record id, in record order. */
export function featureFingerprints(
  records: readonly FeatureRecord[],
  paramTable: ParamTable,
): Map<string, string> {
  const out = new Map<string, string>();
  for (const record of records) {
    const upstream = inputIds(record).map((id) => out.get(id) ?? '?').join(',');
    out.set(record.id, `${structuralHashRecord(record, paramTable)}|${upstream}`);
  }
  return out;
}
