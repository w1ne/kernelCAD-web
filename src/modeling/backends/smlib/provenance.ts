// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import type { HistoryMap } from '../../../kernel/naming/evolutionRecord';
import { GuardError } from './guards';

/** STEP has no kernelCAD lineage. Re-seed primitive names geometrically;
 * never pretend that old face hashes address the reconstructed solid.
 * Non-primitive lineage needs certified face correspondence, so fail closed. */
export function preserveProvenance(reference: OcctBackend, imported: OcctBackend): OcctBackend {
  const kind = reference.kind;
  const primitive = kind === 'box' || kind === 'cylinder' || kind === 'sphere';
  if (reference.historyMap?.size && !primitive) {
    throw new GuardError('NAMING_HISTORY', 'STEP reconstruction cannot preserve non-primitive face lineage');
  }
  const shape = imported.getReplicadShape();
  const placed = new OcctBackend(shape, primitive ? kind : undefined);
  if (!reference.historyMap?.size) return placed;
  const history: HistoryMap = new Map();
  for (const lineage of reference.historyMap.values()) {
    if (!lineage.canonicalName || lineage.featureId || lineage.labelName) {
      throw new GuardError('NAMING_HISTORY', 'Primitive carries additional lineage that STEP cannot preserve');
    }
    const hash = placed.findCanonicalFaceHash(lineage.canonicalName);
    if (history.has(hash)) throw new GuardError('NAMING_HISTORY', 'Primitive face correspondence is ambiguous');
    history.set(hash, { ...lineage, rootHash: hash });
  }
  return new OcctBackend(shape, kind, history);
}
