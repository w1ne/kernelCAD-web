// src/kernel/naming/resolveTopoRef.ts
//
// Unified topology-ref dispatcher. Compose-layer over the existing identity
// machinery — name-propagation primary (`findLineageMatches`), snapshot fallback
// (`findByGeometrySnapshot`). No new resolution algorithms.
//
// F-foundation Task 5 scope: handles `face`, `edge`, `vertex` against the
// historyMap. For `connector`, `part`, `solid`, `sketch`, returns a graceful
// `not-resolvable` — sibling slices (Assembly / Sketch / Connector context)
// dispatch their own kind-specific resolution.
//
// Diagnostic surfacing through `KernelError.hint` waits for F-surface Task F2;
// for now this returns a structured `TopoResolveResult` tagged with the
// diagnostic-code id from `shared/diagnostics/registry`.

import type { OcctBackend } from '../backends/occt/occtBackend';
import type { FaceHash, FaceLineage, HistoryMap } from './evolutionRecord';
import type { TopoRef } from './topoRef';
import {
  findLineageMatches,
  findFallbackSnapshot,
  FEATURE_KINDS,
  type ParsedSelector,
} from './selectorParser';
import { findByGeometrySnapshot } from './geometrySnapshotFallback';
import { DEFAULT_SNAPSHOT_TOLERANCE } from '../backends/occt/createdRefs';
import type { DiagnosticCode } from '../../shared/diagnostics/registry';
import type { FaceLabelsMap, FeatureRecord } from '../../shared/intent/featureRecord';

export interface TopoResolveContext {
  /** The shape on which we're resolving the ref. */
  readonly currentShape: OcctBackend;
  /** The feature ID requesting the resolution — used for diagnostic context
   *  when surfacing through `KernelError.hint` (F-surface Task F2). */
  readonly featureId: string;
  /** Optional record table — when supplied, the resolver also walks each
   *  upstream record's `metadata.faceLabels` so a user-applied label (e.g.
   *  `box(...).faceLabels({ lid: 'top' })`) resolves the same way it appears
   *  in `list_faces` output. Mirrors the `canonicalToLabel` projection in
   *  `agent/mcp/tools/listFaces.ts`. Without records the resolver falls back
   *  to lineage.labelName / lineage.canonicalName only. */
  readonly records?: readonly FeatureRecord[];
}

export interface TopoResolveWarning {
  readonly code: DiagnosticCode;
  readonly message: string;
}

export type TopoResolveResult =
  | {
      readonly kind: 'ok';
      /** For `face` kind: the hash of the resolved face. For `edge`/`vertex`
       *  kinds: the hash of the FACE whose boundary contains the entity
       *  (mirrors the `faceHashForBoundaryEdges` convention in
       *  `resolveEdgeRef.ts`, but kind-neutral). */
      readonly entityHash: FaceHash;
      /** Which path resolved the ref: `lineage` (name-propagation primary) or
       *  `snapshot` (geometry fallback). `snapshot` carries a warning with the
       *  `feature.face-ref.snapshot-fallback-used` code. */
      readonly path: 'lineage' | 'snapshot';
      readonly warnings?: readonly TopoResolveWarning[];
    }
  | {
      readonly kind: 'ambiguous';
      readonly code: 'feature.face-ref.ambiguous-after-split';
      readonly candidates: readonly FaceHash[];
      readonly message: string;
    }
  | {
      readonly kind: 'not-resolvable';
      readonly code: 'feature.face-ref.not-resolvable';
      readonly message: string;
    };

const DEFERRED_KINDS: ReadonlySet<TopoRef['kind']> = new Set([
  'connector',
  'part',
  'solid',
  'sketch',
]);

/** Decompose the topo-ref owner into either an ordinal selector (`hole1`),
 *  a named selector (`mountingBolt`), or null when the segment list is empty.
 *  Mirrors `parseFaceSelector` from `selectorParser.ts` but takes the
 *  structured TopoRef shape instead of a string. */
function topoRefToParsedSelector(ref: TopoRef): ParsedSelector | null {
  if (ref.segments.length === 0) return null;
  const refName = ref.segments[ref.segments.length - 1];
  const owner = ref.owner;

  // Ordinal form: owner is `<kind><N>` (e.g. `hole1`).
  for (const kind of FEATURE_KINDS) {
    if (owner.startsWith(kind)) {
      const tail = owner.slice(kind.length);
      if (/^\d+$/.test(tail)) {
        return { kind: 'ordinal', featureKind: kind, n: parseInt(tail, 10), refName };
      }
    }
  }
  // Named form: owner is a feature name (e.g. `mountingBolt`). Conventional
  // "primitive" owners like `base` collapse to collective via tryCollective().
  return { kind: 'named', featureName: owner, refName };
}

/** When the named/ordinal form returns zero hits, retry as a bare collective
 *  selector (`labelName` or `canonicalName` only). This covers the `base/face/top`
 *  and `base/face/lid` cases where the owner is the shape root, not a feature. */
function tryCollective(ref: TopoRef): ParsedSelector | null {
  if (ref.segments.length === 0) return null;
  const refName = ref.segments[ref.segments.length - 1];
  return { kind: 'collective', refName };
}

/** Build the inverse of the upstream `metadata.faceLabels` projection: given
 *  a user-applied label name (e.g. `lid`), return the canonical-face names it
 *  aliases (e.g. `top`). Mirrors the `canonicalToLabel` map in
 *  `agent/mcp/tools/listFaces.ts:117-127`, but inverted: the resolver receives
 *  the label and needs to find the canonical name(s) the lineage actually
 *  carries. Only canonical-string aliases are inverted (FaceQuery values are
 *  consumer-side and don't surface as lineage canonical names). */
function labelToCanonicalNames(
  records: readonly FeatureRecord[],
  label: string,
): string[] {
  const out: string[] = [];
  for (const rec of records) {
    const fl = (rec.metadata as { faceLabels?: FaceLabelsMap } | undefined)?.faceLabels;
    if (!fl) continue;
    const value = fl[label];
    if (typeof value === 'string' && !out.includes(value)) {
      out.push(value);
    }
  }
  return out;
}

/** Wrap `findLineageMatches` with an extra canonicalName check on collective
 *  refs, then filter to live entries only. A lineage with `snapshot ===
 *  undefined` is an orphan record of a face that an upstream op removed —
 *  it should not count as a live hit (mirrors the `resolveFaceRef.resolveCreated`
 *  policy). The snapshot fallback re-uses these orphans as fingerprint sources.
 *
 *  When `records` is supplied, also augments the collective match with any
 *  lineage whose canonicalName matches a `metadata.faceLabels[refName]` alias
 *  declared on an upstream record. This is the inverse of the projection
 *  `list_faces` uses to emit `@kc[<owner>/face/<label>]` refs; the two MUST
 *  stay in sync, otherwise the agent-visible ref round-trip breaks. */
function lineageMatches(
  map: HistoryMap,
  parsed: ParsedSelector,
  records?: readonly FeatureRecord[],
): FaceHash[] {
  const candidates = findLineageMatches(map, parsed);
  const augmented: FaceHash[] = candidates.slice();
  if (parsed.kind === 'collective') {
    for (const [hash, lineage] of map.entries()) {
      if (lineage.canonicalName === parsed.refName && !augmented.includes(hash)) {
        augmented.push(hash);
      }
    }
    // metadata.faceLabels round-trip: when `list_faces` emits
    // `@kc[<owner>/face/lid]` (because an upstream record declared
    // `faceLabels: { lid: 'top' }`), the lineage entry only carries
    // `canonicalName: 'top'`. Invert the metadata map so `lid` resolves
    // through to the `top` lineage.
    if (records !== undefined && records.length > 0) {
      const canonicalAliases = labelToCanonicalNames(records, parsed.refName);
      if (canonicalAliases.length > 0) {
        for (const [hash, lineage] of map.entries()) {
          if (
            lineage.canonicalName !== undefined &&
            canonicalAliases.includes(lineage.canonicalName) &&
            !augmented.includes(hash)
          ) {
            augmented.push(hash);
          }
        }
      }
    }
  }
  // Keep only entries with a live snapshot (face is still on the result shape).
  return augmented.filter((hash) => {
    const lineage = map.get(hash);
    return lineage !== undefined && lineage.snapshot !== undefined;
  });
}

/** Locate the surfaceType for the lineage that produced the fallback snapshot.
 *  `findFallbackSnapshot` returns only the FaceSnapshot; we need the surfaceType
 *  as a 4th discriminator for `findByGeometrySnapshot`. Scans the map for the
 *  lineage entry that owns this snapshot reference. */
function findSurfaceTypeForFallback(
  map: HistoryMap,
  parsed: ParsedSelector,
): FaceLineage['surfaceType'] | undefined {
  if (parsed.kind === 'named') {
    for (const lineage of map.values()) {
      if (lineage.featureName === parsed.featureName && lineage.snapshot) {
        return lineage.surfaceType;
      }
    }
  }
  if (parsed.kind === 'ordinal') {
    for (const lineage of map.values()) {
      if (
        lineage.featureKind === parsed.featureKind &&
        lineage.featureOrdinal === parsed.n &&
        lineage.snapshot
      ) {
        return lineage.surfaceType;
      }
    }
  }
  return undefined;
}

/** Unified topology-ref resolver. */
export function resolveTopoRef(ref: TopoRef, ctx: TopoResolveContext): TopoResolveResult {
  const map = ctx.currentShape.historyMap;

  // 1. No history → not-resolvable.
  if (map === undefined) {
    return {
      kind: 'not-resolvable',
      code: 'feature.face-ref.not-resolvable',
      message: `historyMap not initialized on shape kind '${ctx.currentShape.kind ?? 'unknown'}'; cannot resolve '${ref.raw}'.`,
    };
  }

  // 2. Bare-owner ref (e.g. `@kc[base]`) → no segment to resolve at this layer.
  if (ref.segments.length === 0) {
    return {
      kind: 'not-resolvable',
      code: 'feature.face-ref.not-resolvable',
      message: `bare-owner ref '${ref.raw}' has no entity segment to resolve; supply a kind/segment (e.g. '@kc[${ref.owner}/face/top]').`,
    };
  }

  // 3. Non-face/edge/vertex kinds → graceful not-resolvable; sibling slices
  //    (Assembly / Sketch / Connector context) dispatch their own resolution.
  if (DEFERRED_KINDS.has(ref.kind)) {
    return {
      kind: 'not-resolvable',
      code: 'feature.face-ref.not-resolvable',
      message: `topology kind '${ref.kind}' is resolved by a sibling slice (Assembly / Sketch context), not by the face/edge resolver.`,
    };
  }

  // 4. Name-propagation primary path. Try ordinal/named first; if zero, retry
  //    collective so `base/face/top` still resolves against shape-root lineages.
  let parsed = topoRefToParsedSelector(ref);
  if (parsed === null) {
    return {
      kind: 'not-resolvable',
      code: 'feature.face-ref.not-resolvable',
      message: `unable to derive a selector from '${ref.raw}'.`,
    };
  }

  let lineageHits = lineageMatches(map, parsed, ctx.records);
  if (lineageHits.length === 0) {
    const collective = tryCollective(ref);
    if (collective !== null) {
      const altHits = lineageMatches(map, collective, ctx.records);
      if (altHits.length > 0) {
        parsed = collective;
        lineageHits = altHits;
      }
    }
  }

  if (lineageHits.length === 1) {
    return { kind: 'ok', entityHash: lineageHits[0], path: 'lineage' };
  }
  if (lineageHits.length >= 2) {
    return {
      kind: 'ambiguous',
      code: 'feature.face-ref.ambiguous-after-split',
      candidates: lineageHits,
      message: `topology ref '${ref.raw}' matches ${lineageHits.length} surviving lineage descendants; an upstream split made it ambiguous.`,
    };
  }

  // 5. Snapshot fallback. Look for a fingerprint via the original parsed form
  //    (ordinal/named only — collective has no fallback path by design).
  //    After step 4, `parsed` is guaranteed to be the original (non-collective)
  //    form — collective only takes effect via an early return above.
  const fallbackSelector = parsed;
  const fingerprint = findFallbackSnapshot(map, fallbackSelector);
  if (fingerprint === null) {
    return {
      kind: 'not-resolvable',
      code: 'feature.face-ref.not-resolvable',
      message: `topology ref '${ref.raw}' produced no lineage hits and no fallback snapshot is available.`,
    };
  }
  const surfaceType = findSurfaceTypeForFallback(map, fallbackSelector);
  if (surfaceType === undefined) {
    return {
      kind: 'not-resolvable',
      code: 'feature.face-ref.not-resolvable',
      message: `topology ref '${ref.raw}' produced a fallback snapshot but no surfaceType is available to discriminate matches.`,
    };
  }

  const { matches } = findByGeometrySnapshot(
    map,
    fingerprint,
    surfaceType,
    DEFAULT_SNAPSHOT_TOLERANCE,
  );

  if (matches.length === 1) {
    return {
      kind: 'ok',
      entityHash: matches[0],
      path: 'snapshot',
      warnings: [
        {
          code: 'feature.face-ref.snapshot-fallback-used',
          message: `topology ref '${ref.raw}' resolved via geometry-snapshot fallback after lineage returned zero hits.`,
        },
      ],
    };
  }
  if (matches.length >= 2) {
    return {
      kind: 'ambiguous',
      code: 'feature.face-ref.ambiguous-after-split',
      candidates: matches,
      message: `topology ref '${ref.raw}' matched ${matches.length} faces by snapshot fingerprint; the snapshot fallback is ambiguous.`,
    };
  }
  return {
    kind: 'not-resolvable',
    code: 'feature.face-ref.not-resolvable',
    message: `topology ref '${ref.raw}' produced no lineage hits and no snapshot match within tolerance.`,
  };
}
