// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/backends/occt/edgeSelection.ts
//
// Lowerer-side selector dispatch. Every feature lowerer (fillet / chamfer /
// shell / hole / cutout / bend) reaches this module through `pickFace` and
// `pickEdges`. The two entry-points share one dispatch convention on the
// input ref's `kind`:
//
//   FaceRef.kind === 'queryDsl' / EdgeRef.kind === 'queryDsl'
//     → Q8 path: reconstruct a Query<T> value from the serialized AST and
//       route through the Q3 evaluator (`evaluate` / `evaluateUnique`).
//       The resolver returns the entity's OCCT face/edge handle directly;
//       no fallback to the legacy lineage / canonical / label paths.
//
//   FaceRef.kind === 'canonical' | 'label' | 'query' | 'created' | ...
//     → Legacy path: existing resolveFaceRef / sketch-segment / metadata
//       lookups (see findFaceLabelInMetadata + labelToEdgeQuery below).
//       Untouched by Q8 — strings-as-sugar (kc.box(...).hole('top', ...))
//       still routes through the canonical/label branches exactly as
//       before, byte-for-byte.
//
// Both surface syntaxes (Query value and @kc/@kcq strings) bottom out on
// the same OCCT entity through different but parallel paths; the
// strings-as-sugar contract in spec §D0.1 (c) is preserved.

import type { Edge, Face } from 'replicad';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import type { CanonicalFace, EdgeRef } from '../../../shared/intent/types';
import {
  findFaceLabelInMetadata,
  labelToEdgeQuery,
} from './edgeSelectionLabels';
import { OcctBackend } from './occtBackend';
import { resolveEdgeQuery, resolveFaceQuery, computeDihedralPublic } from './edgeQueries';
import type { FaceQuery } from './edgeQueries';
import { EDGE_QUERY_KEYS } from '../../../shared/intent/queryKeys';
import { resolveFaceRef } from '../../naming/resolveFaceRef';
import { resolveEdgeRef } from '../../naming/resolveEdgeRef';
import {
  parseFaceSelector,
  findLineageMatches,
  findFallbackSnapshot,
  resolveBySnapshot,
} from '../../naming/selectorParser';
import { evaluate } from '../../naming/queryEvaluator';
import { makeQuery } from '../../naming/query';
import {
  canonicalFaceOnSweptSolid,
  faceByHash,
  findCanonicalFace,
  queryDiagnosticToCompilerError,
  resolveFaceCanonicalRef,
  resolveFaceLabelRef,
  resolveFaceQueryDslRef,
  resolveFaceQueryRef,
  resolveFromMetadataHit,
  resolveQueryDslFace,
} from './faceSelectionPhases';
import type { QueryDslFaceRef } from './faceSelectionPhases';

export { resolveFaceLabelToFace } from './faceSelectionPhases';

const KNOWN_EDGE_QUERY_KEYS = new Set<string>(EDGE_QUERY_KEYS);

// EdgeList holds replicad Edge wrappers, which EdgeFinder.inList() accepts.
export type EdgeList = Edge[];

export type PickEdgesResult =
  | EdgeList
  | { error: CompilerDiagnostic };

export function pickEdges(
  record: FeatureRecord,
  base: OcctBackend,
  records: readonly FeatureRecord[] | undefined,
): PickEdgesResult {
  // Q8 — Edge selector is a Query DSL value: dispatch to the evaluator.
  const edgesRef = record.inputs.edges;
  if (edgesRef && edgesRef.kind === 'edge' && edgesRef.ref.kind === 'queryDsl') {
    return resolveQueryDslEdges(record, base, edgesRef.ref, records);
  }
  // Q8 — Face-bound edge selector via Query DSL ({ face: kc.q.face(...) }
  // wrapper or bare kc.q.face(...) handed to .fillet({face})).
  const faceRefForEdges = record.inputs.face;
  if (faceRefForEdges && faceRefForEdges.kind === 'face' && faceRefForEdges.ref.kind === 'queryDsl') {
    return pickEdgesForQueryDslFace(record, base, faceRefForEdges.ref, records);
  }
  // 1. Edges by query / segment(s) — resolve via edgeQueries.ts
  if (edgesRef && edgesRef.kind === 'edge') {
    return pickEdgesFromEdgeRef(record, base, edgesRef.ref);
  }

  const faceRef = record.inputs.face;

  // 2. No face filter and no edges filter → all sharp edges of the underlying shape.
  if (!faceRef) {
    return allEdgesOf(base);
  }

  // 3. Face by query → resolve to faces, then collect their edges.
  if (faceRef.kind === 'face' && faceRef.ref.kind === 'query') {
    return pickEdgesForFaceQuery(record, base, faceRef.ref.query);
  }

  // 4. Face by label → check upstream metadata first (Task 4), then fall back
  //    to the sketch-segment probe-query path.
  if (faceRef.kind === 'face' && faceRef.ref.kind === 'label') {
    return pickEdgesForFaceLabel(record, base, faceRef.ref.name, records);
  }

  // 5. Existing canonical face dispatch + v0.3 created-ref branch.
  return pickEdgesForCanonicalOrCreated(record, base, faceRef);
}

function pickEdgesForQueryDslFace(
  record: FeatureRecord,
  base: OcctBackend,
  ref: QueryDslFaceRef,
  records: readonly FeatureRecord[] | undefined,
): PickEdgesResult {
  const faceResult = resolveQueryDslFace(record, base, ref, records);
  if ('error' in faceResult) return faceResult;
  const faceEdges = collectFaceEdges([faceResult.face]);
  if (faceEdges.length === 0) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.selection.no-match',
        featureId: record.id,
        severity: 'error',
        message: `Query DSL face ref resolved to a face with no edges.`,
        hint: 'Inspect available faces with list_faces, or relax the Query.',
      },
    };
  }
  return faceEdges;
}

function pickEdgesFromEdgeRef(
  record: FeatureRecord,
  base: OcctBackend,
  ref: EdgeRef,
): PickEdgesResult {
  const result = resolveEdgesRef(record, base, ref);
  if ('error' in result) return result;
  if (result.length === 0) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.selection.no-match',
        featureId: record.id,
        severity: 'error',
        message: `Edge query / segment selector matched zero edges on the input shape.`,
        hint: 'Inspect available edges with list_edges, or relax the query.',
      },
    };
  }
  return result;
}

function pickEdgesForFaceQuery(
  record: FeatureRecord,
  base: OcctBackend,
  query: FaceQuery,
): PickEdgesResult {
  const faces = resolveFaceQuery(base, query);
  if (faces.length === 0) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.selection.no-match',
        featureId: record.id,
        severity: 'error',
        message: `Face query matched zero faces.`,
        hint: 'Inspect available faces with list_faces, or relax the FaceQuery.',
      },
    };
  }
  return collectFaceEdges(faces);
}

function pickEdgesForFaceLabel(
  record: FeatureRecord,
  base: OcctBackend,
  labelName: string,
  records: readonly FeatureRecord[] | undefined,
): PickEdgesResult {
  // (4a-pre) v0.3 slice 1+2: created-face refs declared by hole/holes/cutout
  // attach labelName + (slice-2) featureName/featureOrdinal/snapshot to the
  // result HistoryMap. Created refs win over upstream metadata.faceLabels.
  const historyResult = pickEdgesFromLabelHistoryMap(record, base, labelName);
  if (historyResult !== null) return historyResult;

  // (4a) New: metadata.faceLabels lookup.
  if (records) {
    const metaResult = pickEdgesFromLabelMetadata(record, base, labelName, records);
    if (metaResult !== null) return metaResult;
    // 'miss' falls through to the sketch-segment path.
  }

  // (4b) Existing: sketch-segment probe-query path.
  return pickEdgesFromLabelProbe(record, base, labelName, records);
}

function pickEdgesFromLabelHistoryMap(
  record: FeatureRecord,
  base: OcctBackend,
  labelName: string,
): PickEdgesResult | null {
  if (base.historyMap === undefined) return null;
  const parsed = parseFaceSelector(labelName);
  const matchingHashes = findLineageMatches(base.historyMap, parsed);
  if (matchingHashes.length > 0) {
    const faces: Face[] = [];
    for (const h of matchingHashes) {
      try { faces.push(faceByHash(base, h)); } catch { /* skip stale hashes */ }
    }
    if (faces.length > 0) return collectFaceEdges(faces);
  }
  // Slice-2 snapshot fallback for named/ordinal selectors.
  if (parsed.kind === 'named' || parsed.kind === 'ordinal') {
    const fallbackSnap = findFallbackSnapshot(base.historyMap, parsed);
    if (fallbackSnap) {
      const snapMatches = resolveBySnapshot(base.historyMap, fallbackSnap);
      if (snapMatches.length === 1) {
        try {
          const faces = [faceByHash(base, snapMatches[0])];
          return collectFaceEdges(faces);
        } catch { /* fallthrough */ }
      }
      if (snapMatches.length > 1) {
        return {
          error: {
            target: 'export-occt',
            code: 'feature.face-ref.ambiguous-after-split',
            featureId: record.id,
            severity: 'error',
            message: `'${labelName}' resolved to 0 faces by lineage; geometry snapshot matched ${snapMatches.length} faces.`,
            hint: `'${labelName}' resolved to 0 faces by lineage; geometry snapshot matched ${snapMatches.length} faces. Tighten the snapshot query or pick by a downstream feature ref.`,
          },
        };
      }
    }
    return {
      error: {
        target: 'export-occt',
        code: 'feature.face-ref.not-resolvable',
        featureId: record.id,
        severity: 'error',
        message: `'${labelName}' did not resolve.`,
        hint: `'${labelName}' did not resolve. The face may have been consumed by an upstream op, or the snapshot drifted by transform/scale.`,
      },
    };
  }
  return null;
}

function pickEdgesFromLabelMetadata(
  record: FeatureRecord,
  base: OcctBackend,
  labelName: string,
  records: readonly FeatureRecord[],
): PickEdgesResult | null {
  const meta = findFaceLabelInMetadata(records, record, labelName);
  if ('collision' in meta) return { error: meta.collision };
  if ('hit' in meta) {
    const faceResult = resolveFromMetadataHit(record, base, meta.hit);
    if ('error' in faceResult) return faceResult;
    const faceEdges = collectFaceEdges([faceResult.face]);
    if (faceEdges.length === 0) {
      return {
        error: {
          target: 'export-occt',
          code: 'feature.selection.no-match',
          featureId: record.id,
          severity: 'error',
          message: `Label '${labelName}' resolved to a face with no edges.`,
          hint: 'Inspect available labels with list_face_labels, or use a different label.',
        },
      };
    }
    return faceEdges;
  }
  // 'miss' falls through to the sketch-segment path.
  return null;
}

function pickEdgesFromLabelProbe(
  record: FeatureRecord,
  base: OcctBackend,
  labelName: string,
  records: readonly FeatureRecord[] | undefined,
): PickEdgesResult {
  const probeQuery = labelToEdgeQuery(record, base, labelName, records);
  if ('error' in probeQuery) return probeQuery;
  const edges = resolveEdgeQuery(base, probeQuery.query);
  if (edges.length === 0) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.label.unknown-name',
        featureId: record.id,
        severity: 'error',
        message: `Label '${labelName}' resolved to a probe query that matched no edges.`,
        hint: 'Call list_face_labels to see available labels on this shape.',
      },
    };
  }
  // Mixed-convexity guard (I6): if the matched edge set has both convex
  // and concave members, fillet/chamfer will fail with a generic OCCT error.
  // Surface a specific code so the agent can refine the query.
  const shape = (base.getReplicadShape() as unknown as { faces: import('replicad').Face[] });
  let hasConvex = false, hasConcave = false;
  for (const e of edges) {
    const d = computeDihedralPublic(shape, e);
    if (d?.convex === true) hasConvex = true;
    if (d?.convex === false) hasConcave = true;
  }
  if (hasConvex && hasConcave) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.label.mixed-convexity',
        featureId: record.id,
        severity: 'error',
        message: `Label '${labelName}': probe matched ${edges.length} edges with mixed convexity (both convex and concave). Filleting mixed selections fails inside the kernel; either split the label upstream, or refine with a more specific query like {atZ: ...}.`,
        hint: 'Split the label across smaller segments, or refine with an EdgeQuery filtering by convexity (e.g. { convex: true }).',
      },
    };
  }
  return edges;
}

function pickEdgesForCanonicalOrCreated(
  record: FeatureRecord,
  base: OcctBackend,
  faceRef: NonNullable<FeatureRecord['inputs']['face']>,
): PickEdgesResult {
  if (faceRef.kind !== 'face' || (faceRef.ref.kind !== 'canonical' && faceRef.ref.kind !== 'created')) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.face-ref.not-supported',
        featureId: record.id,
        severity: 'error',
        message: `Only canonical face refs, created refs, queries, and labels are supported; got '${faceRef.kind === 'face' ? faceRef.ref.kind : faceRef.kind}'.`,
        hint: 'Use a canonical face name, a label, or an inline FaceQuery / EdgeQuery.',
      },
    };
  }

  // Canonical / created face filter — use resolveFaceRef for shapes with a
  // historyMap (seeded on primitives, propagated through transforms and
  // booleans), or fall back to the centroid heuristic for shapes without
  // lineage data (sphere, legacy).
  // NOTE: an empty historyMap (size === 0) still enters this path so that
  //       face-ref-removed is emitted when all faces were deleted by a boolean.
  if (base.historyMap !== undefined) {
    const resolved = resolveFaceRef(faceRef.ref, {
      currentShape: base,
      featureId: record.id,
      surface: 'edge-feature',
    });
    if (!resolved.ok) {
      return { error: resolved.diagnostic };
    }
    if (resolved.warnings) {
      // Route fallback warnings to the record's diagnostics slot so the
      // lowerer surfaces them upstream. Lowerers concat these into their
      // own diagnostics array.
      (record as { _resolvedWarnings?: CompilerDiagnostic[] })._resolvedWarnings = [
        ...((record as { _resolvedWarnings?: CompilerDiagnostic[] })._resolvedWarnings ?? []),
        ...resolved.warnings,
      ];
    }
    return edgesOfFaceByHash(base, resolved.faceHash);
  }

  // No historyMap → either an un-transformed primitive (kind tag set), or a
  // swept/lofted/revolved solid (no kind tag). For the latter, resolve
  // canonical top/bottom by geometry on cylinder-topology solids, else emit an
  // actionable diagnostic instead of the misleading "apply transforms" message.
  if (!base.kind && faceRef.ref.kind === 'canonical') {
    const f = canonicalFaceOnSweptSolid(record, base, faceRef.ref.face);
    if ('error' in f) return f;
    return f.edges;
  }
  if (!base.kind) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.face-ref.not-resolvable',
        featureId: record.id,
        severity: 'error',
        message: `Canonical face refs require an un-transformed primitive (box, cylinder, or sphere). Apply transforms after fillet/chamfer instead of before.`,
        hint: 'Apply edge/face features before any transform, or fillet/chamfer the primitive first then translate.',
      },
    };
  }

  // Created refs have no canonical-face fallback path; they require lineage.
  if (faceRef.ref.kind === 'created') {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.face-ref.not-resolvable',
        featureId: record.id,
        severity: 'error',
        message: `Created face refs require a historyMap on the input shape; got none on '${base.kind}'.`,
        hint: 'Apply the feature that creates the ref before any transform that drops lineage.',
      },
    };
  }

  return canonicalFaceEdgesOrError(record, base, faceRef.ref.face);
}

function resolveEdgesRef(
  record: FeatureRecord,
  base: OcctBackend,
  ref: EdgeRef,
): EdgeList | { error: CompilerDiagnostic } {
  if (ref.kind === 'created') return resolveCreatedEdgesRef(record, base, ref);
  if (ref.kind === 'query') return resolveQueryEdgesRef(record, base, ref);
  if (ref.kind === 'segment') return resolveSingleSegmentEdgeRef(record, base, ref);
  if (ref.kind === 'segments') return resolveMultiSegmentEdgeRef(record, base, ref);
  return {
    error: {
      target: 'export-occt',
      code: 'feature.face-ref.not-supported',
      featureId: record.id,
      severity: 'error',
      message: `Edge ref kind '${(ref as { kind: string }).kind}' not supported.`,
      hint: 'Use a query, segment, or segments edge ref.',
    },
  };
}

function resolveCreatedEdgesRef(
  record: FeatureRecord,
  base: OcctBackend,
  ref: Extract<EdgeRef, { kind: 'created' }>,
): EdgeList | { error: CompilerDiagnostic } {
  const result = resolveEdgeRef(ref, {
    currentShape: base,
    featureId: record.id,
    surface: 'edge-feature',
  });
  if (!result.ok) return { error: result.diagnostic };
  if (result.warnings) {
    (record as { _resolvedWarnings?: CompilerDiagnostic[] })._resolvedWarnings = [
      ...((record as { _resolvedWarnings?: CompilerDiagnostic[] })._resolvedWarnings ?? []),
      ...result.warnings,
    ];
  }
  return edgesOfFaceByHash(base, result.faceHashForBoundaryEdges);
}

function resolveQueryEdgesRef(
  record: FeatureRecord,
  base: OcctBackend,
  ref: Extract<EdgeRef, { kind: 'query' }>,
): EdgeList | { error: CompilerDiagnostic } {
  const unknownKeys = Object.keys(ref.query).filter(k => !KNOWN_EDGE_QUERY_KEYS.has(k));
  if (unknownKeys.length > 0) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.invalid-args',
        featureId: record.id,
        severity: 'error',
        message: `EdgeQuery has unknown keys: ${unknownKeys.join(', ')}. Valid keys: ${Array.from(KNOWN_EDGE_QUERY_KEYS).join(', ')}.`,
        hint: 'Drop unknown keys from the EdgeQuery; check the EdgeQuery type for the valid key set.',
      },
    };
  }
  return resolveEdgeQuery(base, ref.query);
}

function resolveSingleSegmentEdgeRef(
  record: FeatureRecord,
  base: OcctBackend,
  ref: Extract<EdgeRef, { kind: 'segment' }>,
): EdgeList | { error: CompilerDiagnostic } {
  // segmentId encodes index into the lowered shape's edges array (`e0`, `e1`, ...).
  const idx = parseInt(ref.segmentId.replace(/^e/, ''), 10);
  const all = (base.getReplicadShape() as unknown as { edges: Edge[] }).edges;
  if (Number.isNaN(idx) || idx < 0 || idx >= all.length) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.invalid-args',
        featureId: record.id,
        severity: 'error',
        message: `Invalid segment id '${ref.segmentId}' — segment IDs are stable only within one shape lowering.`,
        hint: 'Re-derive segment IDs from the current shape; segment IDs from earlier lowerings are not stable.',
      },
    };
  }
  return [all[idx]];
}

function resolveMultiSegmentEdgeRef(
  record: FeatureRecord,
  base: OcctBackend,
  ref: Extract<EdgeRef, { kind: 'segments' }>,
): EdgeList | { error: CompilerDiagnostic } {
  const all = (base.getReplicadShape() as unknown as { edges: Edge[] }).edges;
  const out: Edge[] = [];
  for (const sid of ref.segmentIds) {
    const idx = parseInt(sid.replace(/^e/, ''), 10);
    if (Number.isNaN(idx) || idx < 0 || idx >= all.length) {
      return {
        error: {
          target: 'export-occt',
          code: 'feature.invalid-args',
          featureId: record.id,
          severity: 'error',
          message: `Invalid segment id '${sid}'.`,
          hint: 'Re-derive segment IDs from the current shape.',
        },
      };
    }
    out.push(all[idx]);
  }
  return out;
}

function collectFaceEdges(faces: Face[]): EdgeList {
  const out: Edge[] = [];
  for (const face of faces) {
    // face.edges contains the edges bounding this face. Use the same accessor
    // pattern Task 1 uses elsewhere (avoids the wire-GC issue).
    const faceEdges = (face as unknown as { edges?: Edge[] }).edges ?? [];
    out.push(...faceEdges);
  }
  return out;
}

/**
 * Find the boundary edges of the face identified by `faceHash`.
 *
 * Finds the replicad `Face` via `faceByHash`, then returns its `.edges`.
 */
function edgesOfFaceByHash(base: OcctBackend, faceHash: string): EdgeList {
  const face = faceByHash(base, faceHash);
  return (face as unknown as { edges?: Edge[] }).edges ?? [];
}

function canonicalFaceEdgesOrError(
  record: FeatureRecord,
  base: OcctBackend,
  face: CanonicalFace,
): EdgeList | { error: CompilerDiagnostic } {
  const edges = canonicalFaceEdges(base, face);
  if (edges === null) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.face-ref.not-applicable',
        featureId: record.id,
        severity: 'error',
        message: `Canonical face '${face}' is not applicable to '${base.kind}' primitive.`,
        hint: "That canonical face doesn't exist on this primitive (sphere has no canonical faces; cylinder has only top/bottom).",
      },
    };
  }
  return edges;
}

function allEdgesOf(base: OcctBackend): EdgeList {
  const shape = base.getReplicadShape();
  // shape.edges returns Edge[] (replicad wrappers)
  return shape.edges;
}

function canonicalFaceEdges(base: OcctBackend, face: CanonicalFace): EdgeList | null {
  if (base.kind === 'box') {
    return canonicalBoxFaceEdges(base, face);
  }
  if (base.kind === 'cylinder') {
    if (face === 'top' || face === 'bottom') {
      return canonicalCylinderEndCapEdges(base, face);
    }
    return null; // left/right/front/back not applicable to cylinder
  }
  // sphere: no canonical faces in any direction
  return null;
}

function canonicalBoxFaceEdges(base: OcctBackend, face: CanonicalFace): EdgeList | null {
  const f = findCanonicalFace(base, face);
  return f ? f.edges : null;
}

function canonicalCylinderEndCapEdges(base: OcctBackend, face: 'top'|'bottom'): EdgeList | null {
  const f = findCanonicalFace(base, face);
  return f ? f.edges : null;
}

/**
 * Resolve a canonical face filter to a Replicad `Face` instance.
 *
 * For face features (shell) the face IS the operand, not just a hint
 * for edge selection. Mirrors `pickEdges` but returns the face itself.
 *
 * Rules:
 *   - `inputs.face` must be present (face features cannot operate without one).
 *   - Canonical refs: resolved via historyMap on transformed/boolean shapes,
 *     or via centroid heuristic on raw un-transformed primitives.
 *   - The canonical face name must be applicable to the primitive kind.
 */
export function pickFace(
  record: FeatureRecord,
  base: OcctBackend,
  records: readonly FeatureRecord[] | undefined,
): Face | { error: CompilerDiagnostic } {
  const faceRef = record.inputs.face;

  if (!faceRef) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.invalid-args',
        featureId: record.id,
        severity: 'error',
        message: `${record.kind} requires a 'face' input.`,
        hint: "Pass { face: 'top' } (or another canonical face name / label / FaceQuery).",
      },
    };
  }

  if (faceRef.kind !== 'face') {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.face-ref.not-supported',
        featureId: record.id,
        severity: 'error',
        message: `Face ref kind '${faceRef.kind}' not supported.`,
        hint: 'Use a face-typed ref (canonical, label, or query).',
      },
    };
  }

  // Q8 — Query DSL face ref. Reconstruct the Query value from the serialized
  // AST and route through the Q3 evaluator. The evaluator throws structured
  // query.* diagnostics on miss (query.empty / query.unknown-label / ...) —
  // wrap them in CompilerDiagnostic so the lowerer's normal error pipeline
  // surfaces them.
  if (faceRef.ref.kind === 'queryDsl') {
    return resolveFaceQueryDslRef(record, base, faceRef.ref, records);
  }

  // 1. FaceRef.query → resolve via resolveFaceQuery, take first match.
  if (faceRef.ref.kind === 'query') {
    return resolveFaceQueryRef(record, base, faceRef.ref);
  }

  // 2. FaceRef.label → parse via slice-2 selector parser; check created refs
  //    (v0.3 slice 1 + slice 2's named/ordinal/snapshot paths), then walk
  //    upstream sketch.
  if (faceRef.ref.kind === 'label') {
    return resolveFaceLabelRef(record, base, faceRef.ref.name, records);
  }

  // 3. FaceRef.canonical / FaceRef.created → use resolveFaceRef for shapes
  // with a historyMap (seeded on primitives, propagated through transforms
  // and booleans), or fall back to the centroid heuristic for shapes without
  // lineage data (sphere, legacy).
  // NOTE: an empty historyMap (size === 0) still enters this path so that
  //       face-ref-removed is emitted when all faces were deleted by a boolean.
  if (faceRef.ref.kind === 'canonical' || faceRef.ref.kind === 'created') {
    return resolveFaceCanonicalRef(record, base, faceRef.ref);
  }

  // Catch-all for any other ref kinds (tracked, created, propagated).
  return {
    error: {
      target: 'export-occt',
      code: 'feature.face-ref.not-supported',
      featureId: record.id,
      severity: 'error',
      message: `Face ref kind '${(faceRef.ref as { kind: string }).kind}' not supported.`,
      hint: 'Use a canonical face name, a label, or an inline FaceQuery.',
    },
  };
}

// ─── Q8: Query DSL dispatchers ────────────────────────────────────────────────

type QueryDslEdgeRef = Extract<
  import('../../../shared/intent/types').EdgeRef,
  { kind: 'queryDsl' }
>;

/** Q8 — resolve a Query DSL edge ref against the lowered backend. Returns
 *  the matched replicad Edge wrappers (one per resolved entity) or a
 *  CompilerDiagnostic on miss. Edge-branch of the Query evaluator currently
 *  surfaces `query.unsupported-entity-type` (per Finding #33); this
 *  dispatcher passes that through unchanged so the agent gets the
 *  canonical "edge branch not yet wired" diagnostic. */
function resolveQueryDslEdges(
  record: FeatureRecord,
  base: OcctBackend,
  ref: QueryDslEdgeRef,
  records: readonly FeatureRecord[] | undefined,
): PickEdgesResult {
  const query = makeQuery<unknown>(
    ref.queryTarget,
    ref.queryAst,
    ref.lenient,
  );
  try {
    const entities = evaluate(query, { backend: base, featureId: record.id, records });
    if (entities.length === 0) {
      return {
        error: {
          target: 'export-occt',
          code: 'query.empty',
          featureId: record.id,
          severity: 'error',
          message: `Query DSL edge ref resolved to zero edges on the input shape.`,
          hint: 'Inspect available edges with list_edges / evaluate_query, or relax the Query.',
        },
      };
    }
    // Edge entities carry the OCCT edge hash on `handle`; look up the
    // matching replicad Edge wrapper. Edge-branch wiring is the v2
    // expansion (Finding #33); for now we surface a not-yet-wired
    // diagnostic if the entity kind isn't face (face-of-edges is handled
    // by the {face: Query} wrapper path in pickEdges).
    const allEdges = (base.getReplicadShape() as unknown as { edges: Edge[] }).edges;
    const out: Edge[] = [];
    for (const e of entities) {
      if (e.kind === 'edge') {
        const matchByHash = allEdges.find((edge) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const h = ((edge as any).wrapped ?? edge as any).HashCode(2147483647).toString(16);
          return h === e.handle;
        });
        if (matchByHash) out.push(matchByHash);
      }
    }
    if (out.length === 0) {
      return {
        error: {
          target: 'export-occt',
          code: 'query.unsupported-entity-type',
          featureId: record.id,
          severity: 'error',
          message: `Query DSL edge ref resolved to ${entities.length} entities but none are edge-kind on the lowered backend.`,
          hint: 'The Query evaluator face-branch is fully wired; edge-branch wiring lands once the per-lowerer feature-stamp records edge lineage (cumulative finding #33). Use kc.q.face(...) plus { face: query } on .fillet for now.',
        },
      };
    }
    return out;
  } catch (e) {
    const diag = queryDiagnosticToCompilerError(record, e, 'edge');
    if ('error' in diag) return diag;
    // Shouldn't reach here — queryDiagnosticToCompilerError always returns error.
    return { error: diag as unknown as CompilerDiagnostic };
  }
}



