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
import type { FeatureRecord, FaceLabelsMap } from '../../../shared/intent/featureRecord';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import type { CanonicalFace, EdgeRef } from '../../../shared/intent/types';
import { OcctBackend } from './occtBackend';
import { resolveEdgeQuery, resolveFaceQuery, computeDihedralPublic } from './edgeQueries';
import type { FaceQuery } from './edgeQueries';
import { EDGE_QUERY_KEYS } from '../../../shared/intent/queryKeys';
import { resolveFaceRef } from '../../naming/resolveFaceRef';
import { resolveCanonicalByGeometry } from './canonicalFaceGeometry';
import { resolveEdgeRef } from '../../naming/resolveEdgeRef';
import {
  parseFaceSelector,
  findLineageMatches,
  findFallbackSnapshot,
  resolveBySnapshot,
} from '../../naming/selectorParser';
import { evaluate } from '../../naming/queryEvaluator';
import { makeQuery } from '../../naming/query';
import { isKernelError } from '../../../shared/intent/kernelError';

// Bounding-box face matching tolerance (mm). base.boundingBox() returns gap-corrected values, so this can be tight.
const TOL = 1e-4;

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
    const faceResult = resolveQueryDslFace(record, base, faceRefForEdges.ref, records);
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
  // 1. Edges by query / segment(s) — resolve via edgeQueries.ts
  if (edgesRef && edgesRef.kind === 'edge') {
    const result = resolveEdgesRef(record, base, edgesRef.ref);
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

  const faceRef = record.inputs.face;

  // 2. No face filter and no edges filter → all sharp edges of the underlying shape.
  if (!faceRef) {
    return allEdgesOf(base);
  }

  // 3. Face by query → resolve to faces, then collect their edges.
  if (faceRef.kind === 'face' && faceRef.ref.kind === 'query') {
    const faces = resolveFaceQuery(base, faceRef.ref.query);
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

  // 4. Face by label → check upstream metadata first (Task 4), then fall back
  //    to the sketch-segment probe-query path.
  if (faceRef.kind === 'face' && faceRef.ref.kind === 'label') {
    const labelName = faceRef.ref.name;

    // (4a-pre) v0.3 slice 1+2: created-face refs declared by hole/holes/cutout
    // attach labelName + (slice-2) featureName/featureOrdinal/snapshot to the
    // result HistoryMap. Created refs win over upstream metadata.faceLabels.
    if (base.historyMap !== undefined) {
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
    }

    // (4a) New: metadata.faceLabels lookup.
    if (records) {
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
    }

    // (4b) Existing: sketch-segment probe-query path.
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

  // 5. Existing canonical face dispatch + v0.3 created-ref branch.
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
  if (ref.kind === 'created') {
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
  if (ref.kind === 'query') {
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
  if (ref.kind === 'segment') {
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
  if (ref.kind === 'segments') {
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
 * Find the replicad `Face` wrapper whose OCCT hash equals `faceHash`.
 *
 * Uses `TopExp_Explorer_2` to enumerate faces in the same order as
 * `shape.faces`, then returns the replicad wrapper at the matching index.
 * WASM handles are `.delete()`-ed via try/finally.
 *
 * @throws {Error} If no face with the given hash is found (should not happen
 *   when the caller holds a resolver-guaranteed hash).
 */
function faceByHash(base: OcctBackend, faceHash: string): Face {
  // Iterate replicad's own .faces array and match by OCCT HashCode.
  // Using replicad's .faces (which deduplicates by hash) ensures the returned
  // Face wrapper has the same iteration origin as any caller that enumerates
  // faces via shape.faces — avoiding index skew caused by hash collisions in
  // the raw TopExp_Explorer.
  const replicadFaces = base.getReplicadShape().faces;
  for (const face of replicadFaces) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const h = ((face as any).wrapped as any).HashCode(2147483647).toString(16);
    if (h === faceHash) {
      return face;
    }
  }
  throw new Error(`edgeSelection.faceByHash: face hash '${faceHash}' not found on shape`);
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

/**
 * Resolve a canonical face name to the matching Replicad `Face` instance on `base`.
 *
 * Returns `null` when the face name is not applicable to the primitive kind
 * (e.g. 'left' on a cylinder) or when no face centroid matches the expected
 * bounding-box plane within TOL.
 *
 * Private to this module — callers use `pickEdges` or `pickFace`.
 */
function findCanonicalFace(base: OcctBackend, face: CanonicalFace): Face | null {
  if (base.kind === 'box') {
    const target = pickFacePlane(base.boundingBox(), face);
    return findFaceByPlane(base.getReplicadShape(), target.axisIndex, target.value);
  }
  if (base.kind === 'cylinder') {
    if (face !== 'top' && face !== 'bottom') return null;
    const bb = base.boundingBox();
    const value = face === 'top' ? bb.max[2] : bb.min[2];
    return findFaceByPlane(base.getReplicadShape(), 2, value);
  }
  return null; // sphere has no canonical faces
}

/**
 * Resolve a canonical face name on a solid that carries NO primitive `kind`
 * and NO lineage `historyMap` — i.e. a swept / lofted / revolved solid.
 *
 * Such solids have no STORED canonical face names. For the common
 * cylinder-topology case (an agent's wheel: a swept/lofted circle or a
 * revolved rectangle) we resolve 'top'/'bottom' purely from geometry. When the
 * geometry can't back the requested name, we emit a clear, actionable
 * diagnostic — NOT the legacy "requires an un-transformed primitive — apply
 * transforms after the feature" message, which sent agents chasing a phantom
 * transform they never applied.
 */
function canonicalFaceOnSweptSolid(
  record: FeatureRecord,
  base: OcctBackend,
  face: CanonicalFace,
): Face | { error: CompilerDiagnostic } {
  const shape = base.getReplicadShape();
  const res = resolveCanonicalByGeometry(shape, face);
  if (res.kind === 'resolved') {
    return res.face;
  }
  if (res.kind === 'not-a-cap') {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.face-ref.not-applicable',
        featureId: record.id,
        severity: 'error',
        message: `Canonical face '${face}' is not applicable to this swept/lofted/revolved solid; its only canonical faces are the '${res.capAxisLabel}' end caps.`,
        hint: `Use '${res.capAxisLabel.replace('/', "' or '")}' for the end caps, or select the side wall with a query like kc.q.face({ ofSurfaceType: 'CYLINDER' }) — run list_faces to see all faces on this solid.`,
      },
    };
  }
  // no-canonical-faces
  return {
    error: {
      target: 'export-occt',
      code: 'feature.face-ref.not-applicable',
      featureId: record.id,
      severity: 'error',
      message: `This swept/lofted/revolved solid has no canonical face names; canonical names ('top'/'bottom'/...) exist only on primitives and cylinder-topology solids. It has ${res.faceCount} face${res.faceCount === 1 ? '' : 's'}.`,
      hint: `Select faces by query instead, e.g. kc.q.face({ byNormal: 'Z' }) for an upward-facing face or kc.q.face({ atZ: <height> }) for a face at a known height, or run list_faces to enumerate all ${res.faceCount} faces on this solid.`,
    },
  };
}

function findFaceByPlane(
  shape: import('replicad').Shape3D,
  axisIndex: 0 | 1 | 2,
  value: number,
): Face | null {
  for (const f of shape.faces) {
    const c = f.center;
    const cv = axisIndex === 0 ? c.x : axisIndex === 1 ? c.y : c.z;
    if (Math.abs(cv - value) < TOL) {
      return f;
    }
  }
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

interface FacePlane { axisIndex: 0 | 1 | 2; value: number; }

function pickFacePlane(
  bb: { min: [number, number, number]; max: [number, number, number] },
  face: CanonicalFace,
): FacePlane {
  switch (face) {
    case 'top':    return { axisIndex: 2, value: bb.max[2] };
    case 'bottom': return { axisIndex: 2, value: bb.min[2] };
    case 'right':  return { axisIndex: 0, value: bb.max[0] };
    case 'left':   return { axisIndex: 0, value: bb.min[0] };
    case 'back':   return { axisIndex: 1, value: bb.max[1] };
    case 'front':  return { axisIndex: 1, value: bb.min[1] };
  }
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
    const r = resolveQueryDslFace(record, base, faceRef.ref, records);
    if ('error' in r) return r;
    return r.face;
  }

  // 1. FaceRef.query → resolve via resolveFaceQuery, take first match.
  if (faceRef.ref.kind === 'query') {
    const faces = resolveFaceQuery(base, faceRef.ref.query);
    if (faces.length === 0) {
      return {
        error: {
          target: 'export-occt',
          code: 'feature.selection.no-match',
          featureId: record.id,
          severity: 'error',
          message: `Face query matched zero faces on the input shape.`,
          hint: 'Inspect available faces with list_faces, or relax the FaceQuery.',
        },
      };
    }
    return faces[0];
  }

  // 2. FaceRef.label → parse via slice-2 selector parser; check created refs
  //    (v0.3 slice 1 + slice 2's named/ordinal/snapshot paths), then walk
  //    upstream sketch.
  if (faceRef.ref.kind === 'label') {
    const labelName = faceRef.ref.name;
    if (base.historyMap !== undefined) {
      const parsed = parseFaceSelector(labelName);
      const matches = findLineageMatches(base.historyMap, parsed);
      if (matches.length > 0) {
        try { return faceByHash(base, matches[0]); } catch { /* fallthrough */ }
      }
      // Slice-2 snapshot fallback: only when topology returned 0 AND the
      // selector references a named/ordinal feature whose lineage stored a
      // snapshot at creation time.
      if (parsed.kind === 'named' || parsed.kind === 'ordinal') {
        const fallbackSnap = findFallbackSnapshot(base.historyMap, parsed);
        if (fallbackSnap) {
          const snapMatches = resolveBySnapshot(base.historyMap, fallbackSnap);
          if (snapMatches.length === 1) {
            try { return faceByHash(base, snapMatches[0]); } catch { /* fallthrough */ }
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
    }
    const result = resolveLabeledFace(record, base, labelName, records);
    if ('error' in result) return result;
    return result.face;
  }

  // 3. FaceRef.canonical / FaceRef.created → use resolveFaceRef for shapes
  // with a historyMap (seeded on primitives, propagated through transforms
  // and booleans), or fall back to the centroid heuristic for shapes without
  // lineage data (sphere, legacy).
  // NOTE: an empty historyMap (size === 0) still enters this path so that
  //       face-ref-removed is emitted when all faces were deleted by a boolean.
  if (faceRef.ref.kind === 'canonical' || faceRef.ref.kind === 'created') {
    if (base.historyMap !== undefined) {
      const resolved = resolveFaceRef(faceRef.ref, {
        currentShape: base,
        featureId: record.id,
        surface: 'face-feature',
      });
      if (!resolved.ok) {
        return { error: resolved.diagnostic };
      }
      if (resolved.warnings) {
        (record as { _resolvedWarnings?: CompilerDiagnostic[] })._resolvedWarnings = [
          ...((record as { _resolvedWarnings?: CompilerDiagnostic[] })._resolvedWarnings ?? []),
          ...resolved.warnings,
        ];
      }
      return faceByHash(base, resolved.faceHash);
    }

    if (faceRef.ref.kind === 'created') {
      return {
        error: {
          target: 'export-occt',
          code: 'feature.face-ref.not-resolvable',
          featureId: record.id,
          severity: 'error',
          message: `Created face refs require a historyMap on the input shape; got none on '${base.kind ?? 'unknown'}'.`,
          hint: 'Apply the feature that creates the ref before any transform that drops lineage.',
        },
      };
    }

    // No historyMap → either an un-transformed primitive (kind tag set), or a
    // swept/lofted/revolved solid (no kind tag). The latter has no stored
    // canonical names; resolve top/bottom by geometry for cylinder-topology
    // solids, else emit an actionable diagnostic (NOT the misleading
    // "apply transforms after" message).
    const face = faceRef.ref.face as CanonicalFace;
    if (!base.kind) {
      return canonicalFaceOnSweptSolid(record, base, face);
    }
    const f = findCanonicalFace(base, face);
    if (f === null) {
      return {
        error: {
          target: 'export-occt',
          code: 'feature.face-ref.not-applicable',
          featureId: record.id,
          severity: 'error',
          message: `Canonical face '${face}' is not applicable to ${base.kind}.`,
          hint: "That canonical face doesn't exist on this primitive (sphere has no canonical faces; cylinder has only top/bottom).",
        },
      };
    }
    return f;
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

// ─── Task 4: faceLabels metadata resolution helpers ───────────────────────────

interface MetadataLabelHit {
  /** The originating feature whose metadata.faceLabels declared this label. */
  origin: FeatureRecord;
  /** The resolved value: a canonical face name or a FaceQuery descriptor. */
  resolved: CanonicalFace | FaceQuery;
}

/**
 * Walk upstream records and look for any `metadata.faceLabels` entry that
 * declares `label`. Returns a three-way discriminated union:
 *   - `{ hit }` — exactly one upstream source found.
 *   - `{ collision }` — two or more upstream sources conflict (fatal).
 *   - `{ miss }` — no upstream source found (fall through to sketch path).
 */
function findFaceLabelInMetadata(
  records: readonly FeatureRecord[],
  consumer: FeatureRecord,
  label: string,
): { hit: MetadataLabelHit } | { collision: CompilerDiagnostic } | { miss: true } {
  const hits: MetadataLabelHit[] = [];
  for (const rec of records) {
    if (rec.id === consumer.id) break; // only upstream
    const fl = (rec.metadata as { faceLabels?: FaceLabelsMap } | undefined)?.faceLabels;
    if (fl && Object.prototype.hasOwnProperty.call(fl, label)) {
      const resolved = fl[label];
      hits.push({ origin: rec, resolved: resolved as CanonicalFace | FaceQuery });
    }
  }
  if (hits.length === 0) return { miss: true };
  if (hits.length > 1) {
    return {
      collision: {
        target: 'export-occt',
        code: 'feature.label.collision',
        featureId: consumer.id,
        severity: 'error',
        message: `Label '${label}' is declared by multiple upstream features: ${hits.map(h => h.origin.id).join(', ')}. Each label must be unique within the scope a consumer sees.`,
        hint: 'Rename one of the conflicting faceLabels entries upstream so the consumer sees a unique name.',
      },
    };
  }
  return { hit: hits[0] };
}

/**
 * Resolve a metadata label hit to the matching `Face` on the consumer's
 * current lowered shape (`base`).
 *
 * - Canonical alias: route through `resolveFaceRef` (historyMap) or the
 *   centroid heuristic (`findCanonicalFace`) when no history is present.
 * - FaceQuery: call `resolveFaceQuery`; error on zero matches.
 */
function resolveFromMetadataHit(
  consumer: FeatureRecord,
  base: OcctBackend,
  hit: MetadataLabelHit,
): { face: Face } | { error: CompilerDiagnostic } {
  const { resolved } = hit;

  if (typeof resolved === 'string') {
    // Canonical alias — same resolution machinery as the canonical FaceRef path.
    const face = resolved as CanonicalFace;
    if (base.historyMap !== undefined) {
      const result = resolveFaceRef(
        { kind: 'canonical', face },
        { currentShape: base, featureId: consumer.id, surface: 'face-feature' },
      );
      if (!result.ok) return { error: result.diagnostic };
      return { face: faceByHash(base, result.faceHash) };
    }
    // No historyMap — fall back to centroid heuristic (un-transformed primitive).
    if (!base.kind) {
      return {
        error: {
          target: 'export-occt',
          code: 'feature.face-ref.not-resolvable',
          featureId: consumer.id,
          severity: 'error',
          message: `Label '${face}' (canonical alias): the shape has no lineage data. Apply transforms after the face feature, not before.`,
          hint: 'Apply this feature before any transform, or use a label / FaceQuery instead of a canonical alias.',
        },
      };
    }
    const found = findCanonicalFace(base, face);
    if (found === null) {
      return {
        error: {
          target: 'export-occt',
          code: 'feature.face-ref.not-applicable',
          featureId: consumer.id,
          severity: 'error',
          message: `Canonical face '${face}' is not applicable to ${base.kind}.`,
          hint: "That canonical face doesn't exist on this primitive (sphere has no canonical faces; cylinder has only top/bottom).",
        },
      };
    }
    return { face: found };
  }

  // FaceQuery — resolve against the consumer's current shape.
  const matched = resolveFaceQuery(base, resolved as FaceQuery);
  if (matched.length === 0) {
    const allFaces = (base.getReplicadShape() as unknown as { faces: Face[] }).faces;
    return {
      error: {
        target: 'export-occt',
        code: 'feature.selection.no-match',
        featureId: consumer.id,
        severity: 'error',
        message: `Label declared on '${hit.origin.id}.faceLabels' matched zero faces at the consumer (${allFaces.length} faces available on the consumer shape). Query: ${JSON.stringify(resolved)}. Use list_face_labels or list_faces to inspect candidates.`,
        hint: 'Inspect candidates with list_face_labels or list_faces, then refine the FaceQuery.',
      },
    };
  }
  return { face: matched[0] };
}

// ─── End Task 4 helpers ────────────────────────────────────────────────────────

/** Public re-export of label→Face resolution. Used by featureMeshing.ts for
 *  per-face material assignment (`Shape.material({ face: '<label>', ... })`).
 *  Wraps the file-private `resolveLabeledFace` so callers outside this module
 *  can reuse the same metadata/sketch-segment resolution machinery the
 *  edge-feature lowerers use, instead of re-implementing it.
 *
 *  Difference from `resolveLabeledFace`: edge/face features are downstream
 *  consumers (e.g. fillet on rim), so `findFaceLabelInMetadata` walks only
 *  strictly upstream records. `Shape.material({face})` mutates the SAME
 *  record that declared the label (a primitive declares its own
 *  `faceLabels` and applies `.material({face})` to itself), so we also
 *  check the consumer's own metadata before falling through to the
 *  upstream-only path. */
export function resolveFaceLabelToFace(
  consumer: FeatureRecord,
  base: OcctBackend,
  label: string,
  records: readonly FeatureRecord[] | undefined,
): { face: Face } | { error: CompilerDiagnostic } {
  // Self-declared label path: primitive (box/cylinder/extrude/...) carries
  // both the `faceLabels` map and the `.material({face})` call. The
  // upstream-only walk inside `resolveLabeledFace` skips its own record, so
  // we have to handle this case explicitly here.
  const ownLabels =
    (consumer.metadata as { faceLabels?: FaceLabelsMap } | undefined)?.faceLabels;
  if (ownLabels && Object.prototype.hasOwnProperty.call(ownLabels, label)) {
    const hit: MetadataLabelHit = {
      origin: consumer,
      resolved: ownLabels[label] as CanonicalFace | FaceQuery,
    };
    return resolveFromMetadataHit(consumer, base, hit);
  }
  return resolveLabeledFace(consumer, base, label, records);
}

function resolveLabeledFace(
  record: FeatureRecord,
  base: OcctBackend,
  label: string,
  records: readonly FeatureRecord[] | undefined,
): { face: Face } | { error: CompilerDiagnostic } {
  // (1) New: check upstream feature metadata.faceLabels first.
  if (records) {
    const meta = findFaceLabelInMetadata(records, record, label);
    if ('hit' in meta) {
      return resolveFromMetadataHit(record, base, meta.hit);
    }
    if ('collision' in meta) {
      return { error: meta.collision };
    }
    // 'miss' falls through to the existing sketch-segment path below.
  }

  // (2) Existing: sketch-segment path via labelToEdgeQuery.
  // Reuse labelToEdgeQuery to compute the probe bbox. Then find the matching
  // face on the lowered shape: a face whose centroid sits in or near the bbox.
  const probe = labelToEdgeQuery(record, base, label, records);
  if ('error' in probe) return probe;

  const w = probe.query.within;
  if (!w) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.label.no-upstream-sketch',
        featureId: record.id,
        severity: 'error',
        message: `Label '${label}': cannot derive face probe (no within bbox).`,
        hint: 'Labels work on shapes built from a path() sketch (extrude). Use an inline FaceQuery for primitives or imported shapes.',
      },
    };
  }

  const allFaces = (base.getReplicadShape() as unknown as { faces: Face[] }).faces;
  const matched = allFaces.filter(f => {
    const c = f.center;
    return (w.xMin === undefined || c.x >= w.xMin) &&
           (w.xMax === undefined || c.x <= w.xMax) &&
           (w.yMin === undefined || c.y >= w.yMin) &&
           (w.yMax === undefined || c.y <= w.yMax) &&
           (w.zMin === undefined || c.z >= w.zMin) &&
           (w.zMax === undefined || c.z <= w.zMax);
  });

  if (matched.length === 0) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.label.unknown-name',
        featureId: record.id,
        severity: 'error',
        message: `Label '${label}' resolved to a probe bbox that contained no face centroid.`,
        hint: 'Call list_face_labels to see available labels on this shape.',
      },
    };
  }

  return { face: matched[0] };
}

function labelToEdgeQuery(
  record: FeatureRecord,
  _base: OcctBackend,
  label: string,
  records: readonly FeatureRecord[] | undefined,
): { query: import('./edgeQueries').EdgeQuery } | { error: CompilerDiagnostic } {
  if (!records) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.label.no-upstream-sketch',
        featureId: record.id,
        severity: 'error',
        message: `Label '${label}' lookup requires record context (internal: records not threaded).`,
        hint: 'Internal error — record context was not threaded into the lowerer.',
      },
    };
  }

  const upstreamSketch = findUpstreamSketch(records, record);
  if (!upstreamSketch) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.label.no-upstream-sketch',
        featureId: record.id,
        severity: 'error',
        message: `Label '${label}': base shape isn't sketch-derived. Labels work on shapes built from a path() sketch (extrude); apply the label upstream on the sketch.`,
        hint: 'Apply the label on the sketch, or use an inline FaceQuery (e.g. { atZ: ... }) for primitives.',
      },
    };
  }

  const commands = (upstreamSketch.metadata as { commands?: Array<{ kind: string; x?: { evaluated: number }; y?: { evaluated: number }; label?: string }> } | undefined)?.commands;
  if (!commands) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.label.unknown-name',
        featureId: record.id,
        severity: 'error',
        message: `Label '${label}': upstream sketch has no commands metadata.`,
        hint: 'Construct sketches via path().moveTo(...).lineTo(...).label(...).close() so the commands are persisted.',
      },
    };
  }

  let labeledIdx = -1;
  for (let i = 0; i < commands.length; i++) {
    if (commands[i].label === label) { labeledIdx = i; break; }
  }
  if (labeledIdx < 0) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.label.unknown-name',
        featureId: record.id,
        severity: 'error',
        message: `Label '${label}' not found on the upstream sketch's segments. Use the list_face_labels MCP tool to see available labels.`,
        hint: 'Call list_face_labels to see available labels on this shape.',
      },
    };
  }

  const segment = commands[labeledIdx];
  const prev = commands[labeledIdx - 1];
  if (!prev || prev.x === undefined || prev.y === undefined || segment.x === undefined || segment.y === undefined) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.label.unknown-name',
        featureId: record.id,
        severity: 'error',
        message: `Label '${label}': can't determine segment chord (prior command has no endpoint).`,
        hint: 'Place .label(...) immediately after a lineTo or arc segment with an endpoint.',
      },
    };
  }
  const prevX = prev.x.evaluated;
  const prevY = prev.y.evaluated;
  const segX = segment.x.evaluated;
  const segY = segment.y.evaluated;

  const depth = extractExtrudeDepth(records, record);
  if (depth === null) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.label.unsupported-base',
        featureId: record.id,
        severity: 'error',
        message: `Label '${label}': labels currently support extrude only. Revolve labels are deferred; use an inline query against the geometry as a workaround: {face: {atZ: ...}}.`,
        hint: 'Use an inline FaceQuery (e.g. { atZ: ... }) as a workaround for non-extrude bases.',
      },
    };
  }

  // The labeled segment maps to one side face of the extruded solid. That side
  // face has 4 outer-wire edges: two horizontal (at z=0 and z=depth, running
  // along the segment chord) and two vertical (at the segment's endpoints, both
  // running 0..depth). Build a `within` bounding region that brackets exactly
  // these four edges' midpoints — collapsed in any axis where the segment is
  // axis-parallel, expanded by `tol` to absorb floating-point noise.
  const tol = 1e-3;
  const xMin = Math.min(prevX, segX) - tol;
  const xMax = Math.max(prevX, segX) + tol;
  const yMin = Math.min(prevY, segY) - tol;
  const yMax = Math.max(prevY, segY) + tol;
  return {
    query: {
      within: {
        xMin, xMax,
        yMin, yMax,
        zMin: -tol,
        zMax: depth + tol,
      },
    },
  };
}

function findUpstreamSketch(records: readonly FeatureRecord[], record: FeatureRecord): FeatureRecord | null {
  // Walk from this record's `base` input → if the base is an extrude/revolve,
  // follow its `sketch` input → return the sketch record.
  const baseRef = record.inputs.base;
  if (!baseRef || baseRef.kind !== 'feature') return null;
  const base = records.find(r => r.id === baseRef.id);
  if (!base) return null;
  if (base.kind === 'sketch') return base;
  if (base.kind === 'extrude' || base.kind === 'revolve') {
    const sketchRef = base.inputs.sketch;
    if (sketchRef && sketchRef.kind === 'feature') {
      return records.find(r => r.id === sketchRef.id) ?? null;
    }
  }
  return null;
}

function extractExtrudeDepth(records: readonly FeatureRecord[], record: FeatureRecord): number | null {
  const baseRef = record.inputs.base;
  if (!baseRef || baseRef.kind !== 'feature') return null;
  const base = records.find(r => r.id === baseRef.id);
  if (!base || base.kind !== 'extrude') return null;
  return base.params.depth?.evaluated ?? null;
}

// ─── Q8: Query DSL dispatchers ────────────────────────────────────────────────

type QueryDslFaceRef = Extract<
  import('../../../shared/intent/types').FaceRef,
  { kind: 'queryDsl' }
>;

type QueryDslEdgeRef = Extract<
  import('../../../shared/intent/types').EdgeRef,
  { kind: 'queryDsl' }
>;

/** Q8 — resolve a Query DSL face ref against the lowered backend by
 *  evaluating its AST through the Q3 evaluator. Returns the matched
 *  replicad Face wrapper or a CompilerDiagnostic on miss.
 *
 *  Convention: face-features (shell / hole / cutout) consume exactly one
 *  face, so the dispatcher resolves to the first matched entity when
 *  multiple match. The Query evaluator emits canonical-ordered results
 *  (D0.5 (a)) so the choice is deterministic across runs. Multi-face
 *  consumers (future `holes`, multi-face shell) will resolve through a
 *  list-shaped sibling. */
function resolveQueryDslFace(
  record: FeatureRecord,
  base: OcctBackend,
  ref: QueryDslFaceRef,
  records: readonly FeatureRecord[] | undefined,
): { face: Face } | { error: CompilerDiagnostic } {
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
          message: `Query DSL face ref resolved to zero faces on the input shape.`,
          hint: 'Inspect available faces with list_faces / evaluate_query, or relax the Query (remove a filter, or annotate with .asLenient()).',
        },
      };
    }
    // Resolve the first canonical-ordered entity to its replicad Face.
    const e = entities[0];
    try {
      return { face: faceByHash(base, e.handle) };
    } catch {
      return {
        error: {
          target: 'export-occt',
          code: 'feature.face-ref.not-resolvable',
          featureId: record.id,
          severity: 'error',
          message: `Query DSL face ref resolved to entity '${e.ref}' but the underlying face hash '${e.handle}' is not present on the lowered backend.`,
          hint: 'The Query targeted a face that survived lineage but not topology — try a tighter Query (.and(closestTo(...))) or rebuild against the current scene.',
        },
      };
    }
  } catch (e) {
    return queryDiagnosticToCompilerError(record, e, 'face');
  }
}

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

/** Map a thrown Query evaluator KernelError (query.*) into the lowerer's
 *  CompilerDiagnostic envelope so the rest of the lowering pipeline
 *  surfaces it through the same channel as feature.* errors. */
function queryDiagnosticToCompilerError(
  record: FeatureRecord,
  err: unknown,
  consumerKind: 'face' | 'edge',
): { error: CompilerDiagnostic } {
  const code = isKernelError(err)
    ? (err.code as string)
    : 'query.empty';
  const message = err instanceof Error ? err.message : String(err);
  const hint = isKernelError(err) && err.hint
    ? err.hint
    : `The Query DSL ${consumerKind} ref failed to resolve. Inspect available entities with list_${consumerKind === 'face' ? 'faces' : 'edges'} / evaluate_query.`;
  return {
    error: {
      target: 'export-occt',
      // Cast to a known CompilerDiagnostic code shape. The registry covers
      // every query.* and feature.* code (DIAGNOSTIC_CODES gate); the cast
      // here keeps the helper agnostic to the precise union.
      code: code as CompilerDiagnostic['code'],
      featureId: record.id,
      severity: 'error',
      message,
      hint,
    },
  };
}

