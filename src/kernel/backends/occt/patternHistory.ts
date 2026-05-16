// src/backends/occt/patternHistory.ts
//
// W2.1 — virtual pattern-instance id minter. Rewrites historyMap lineage
// entries whose featureId matches the source FeatureId to tag them with
// `<sourceId>_pattern_<i>`. This is the sole mint site for the virtual
// instance ids that resolveFaceRef / resolveEdgeRef match against on the
// pattern feature's lineage map.
//
// Why a separate file: keeps the pattern lowerer's `case 'pattern':` arm
// readable; isolates the retag rule for unit testing.

import type { HistoryMap } from '../../naming/evolutionRecord';
import type { FeatureId } from '../../../shared/intent/types';

/** Return a new HistoryMap whose lineage entries with `featureId === sourceId`
 *  are tagged `featureId = '<sourceId>_pattern_<i>'`. All other lineage fields
 *  (rootHash, canonicalName, labelName, snapshot, snapshotAtCreate,
 *  surfaceType, featureKind, featureName, featureOrdinal) are preserved
 *  verbatim. Entries whose featureId does NOT match sourceId are passed
 *  through unmodified (they belong to upstream features that the pattern
 *  doesn't re-author — e.g. the box's canonical `top` face). */
export function retagInstance(
  map: HistoryMap,
  sourceId: FeatureId,
  instanceIndex: number,
): HistoryMap {
  const tagged = `${sourceId}_pattern_${instanceIndex}`;
  const out: HistoryMap = new Map();
  for (const [hash, lineage] of map.entries()) {
    if (lineage.featureId === sourceId) {
      out.set(hash, { ...lineage, featureId: tagged });
    } else {
      out.set(hash, lineage);
    }
  }
  return out;
}
