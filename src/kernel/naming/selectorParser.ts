// src/runtime/selectorParser.ts
//
// Slice-2 face-selector parser + resolver. Used by `pickFace` and `pickEdges`
// to turn a label string into a list of matching face hashes on a HistoryMap.
//
// Recognized forms (in resolution order — see spec §C.7):
//   1. canonical-or-label (slice-1; not parsed here, handled by caller)
//   2. <name>.<ref>          → matches lineage entries by featureName + labelName
//   3. <name>[i].<ref>        → indexed access into a batched named feature
//   4. <kind><N>.<ref>        → matches lineage entries by featureKind + featureOrdinal + labelName
//   5. snapshot fallback     → only when all topology paths return zero AND
//                              the parsed selector has stored snapshots to query
//
// The parser is purely syntactic — it does not validate that any feature
// exists. The resolver below handles non-existence with the spec §D.2 hints.

import type { HistoryMap, FaceHash } from './evolutionRecord';
import type { FaceSnapshot } from '../backends/occt/createdRefs';
import { DEFAULT_SNAPSHOT_TOLERANCE } from '../backends/occt/createdRefs';

export type ParsedSelector =
  | { kind: 'collective'; refName: string }
  | { kind: 'named'; featureName: string; refName: string; index?: number }
  | { kind: 'ordinal'; featureKind: string; n: number; refName: string };

const FEATURE_KINDS = ['hole', 'holes', 'cutout'] as const;

/** Parse a label-string selector into a ParsedSelector. The string never
 *  carries canonical-name or query info — those are dispatched by the caller
 *  before this parser runs. */
export function parseFaceSelector(s: string): ParsedSelector {
  // <name>[i].<ref> form
  const idxMatch = /^([a-zA-Z][a-zA-Z0-9_-]*)\[(\d+)\]\.(.+)$/.exec(s);
  if (idxMatch) {
    return {
      kind: 'named',
      featureName: idxMatch[1],
      refName: idxMatch[3],
      index: parseInt(idxMatch[2], 10),
    };
  }
  // <something>.<ref> form
  const dotMatch = /^([a-zA-Z][a-zA-Z0-9_-]*)\.(.+)$/.exec(s);
  if (dotMatch) {
    const prefix = dotMatch[1];
    const refName = dotMatch[2];
    // Check for ordinal form (<kind><N>): match each known kind + integer suffix.
    for (const kind of FEATURE_KINDS) {
      if (prefix.startsWith(kind)) {
        const tail = prefix.slice(kind.length);
        if (/^\d+$/.test(tail)) {
          return { kind: 'ordinal', featureKind: kind, n: parseInt(tail, 10), refName };
        }
      }
    }
    // Otherwise it's a named-feature form.
    return { kind: 'named', featureName: prefix, refName };
  }
  // Bare label (slice-1 collective).
  return { kind: 'collective', refName: s };
}

/** Walk the lineage map for entries matching a parsed selector. Returns face
 *  hashes; the caller turns those into Face objects. The result excludes
 *  any snapshot fallback — that's a separate path on `resolveBySnapshot`. */
export function findLineageMatches(
  historyMap: HistoryMap,
  parsed: ParsedSelector,
): FaceHash[] {
  const out: FaceHash[] = [];
  if (parsed.kind === 'collective') {
    for (const [hash, lineage] of historyMap.entries()) {
      if (lineage.labelName === parsed.refName) out.push(hash);
    }
    return out;
  }
  if (parsed.kind === 'named') {
    for (const [hash, lineage] of historyMap.entries()) {
      if (lineage.featureName === parsed.featureName && lineage.labelName === parsed.refName) {
        out.push(hash);
      }
    }
    // Apply [i] index if present (Phase-4 slice-2 limitation: indexing on
    // batched features requires the lowerer to attach a per-instance ordinal,
    // which holes() doesn't yet do — slice-2 v2 wires this. For now, [i] on
    // a non-batched feature errors at the caller.)
    if (parsed.index !== undefined) {
      // Slice-2 minimal: index ignored. Out-of-range indices error at caller.
      // Future: holes() classifier emits per-instance ordinals; index picks one.
    }
    return out;
  }
  if (parsed.kind === 'ordinal') {
    for (const [hash, lineage] of historyMap.entries()) {
      if (
        lineage.featureKind === parsed.featureKind &&
        lineage.featureOrdinal === parsed.n &&
        lineage.labelName === parsed.refName
      ) {
        out.push(hash);
      }
    }
    return out;
  }
  return out;
}

/** Geometry-snapshot fallback. Called only when topology resolution returned
 *  zero hits AND the parsed selector references a feature whose lineage
 *  entries have non-null snapshots (used as the reference). Returns matching
 *  face hashes on the *current* HistoryMap by computing distance between
 *  each lineage entry's snapshot and a query snapshot.
 *
 *  Per spec §C.6:
 *  - Single-match → success path.
 *  - Multi-match  → caller emits feature.face-ref.ambiguous-after-split.
 *  - Zero-match   → caller emits feature.face-ref.not-resolvable. */
export function resolveBySnapshot(
  historyMap: HistoryMap,
  query: FaceSnapshot,
  tolerance = DEFAULT_SNAPSHOT_TOLERANCE,
): FaceHash[] {
  const out: FaceHash[] = [];
  for (const [hash, lineage] of historyMap.entries()) {
    if (!lineage.snapshot) continue;
    const dCentroid = Math.hypot(
      lineage.snapshot.centroid[0] - query.centroid[0],
      lineage.snapshot.centroid[1] - query.centroid[1],
      lineage.snapshot.centroid[2] - query.centroid[2],
    );
    if (dCentroid > tolerance.centroidMm) continue;
    const dot =
      lineage.snapshot.normal[0] * query.normal[0] +
      lineage.snapshot.normal[1] * query.normal[1] +
      lineage.snapshot.normal[2] * query.normal[2];
    if (Math.abs(dot) < tolerance.normalDot) continue;
    const denom = Math.max(query.area, 1e-9);
    const areaRel = Math.abs(lineage.snapshot.area - query.area) / denom;
    if (areaRel > tolerance.areaRelative) continue;
    out.push(hash);
  }
  return out;
}

/** Find any lineage entry that *would* match the parsed selector if topology
 *  hadn't lost the labelName, and return the snapshot to use as a fallback
 *  query. Returns null when no such reference exists.
 *
 *  Used by the Phase-4 resolver: when topology returns zero hits, look for
 *  a lineage entry with the right featureName / featureKind+ordinal but
 *  without (or with) the labelName, and pull its snapshot as the query. */
export function findFallbackSnapshot(
  historyMap: HistoryMap,
  parsed: ParsedSelector,
): FaceSnapshot | null {
  if (parsed.kind === 'named') {
    for (const lineage of historyMap.values()) {
      if (lineage.featureName === parsed.featureName && lineage.snapshot) {
        return lineage.snapshot;
      }
    }
  }
  if (parsed.kind === 'ordinal') {
    for (const lineage of historyMap.values()) {
      if (
        lineage.featureKind === parsed.featureKind &&
        lineage.featureOrdinal === parsed.n &&
        lineage.snapshot
      ) {
        return lineage.snapshot;
      }
    }
  }
  return null;
}
