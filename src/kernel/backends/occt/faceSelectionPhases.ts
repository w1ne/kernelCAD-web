// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/faceSelectionPhases.ts
//
// Phase helpers for `pickFace` plus the face-resolution leaf helpers shared
// with the edge paths. Extracted verbatim so the per-ref-kind dispatch
// branches stay under the complexity ratchet and `edgeSelection.ts` — which
// trips the file-length ratchet — does not grow.

import type { Face } from 'replicad';
import type { FeatureRecord, FaceLabelsMap } from '../../../shared/intent/featureRecord';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import type { CanonicalFace, FaceRef } from '../../../shared/intent/types';
import { findFaceLabelInMetadata, labelToEdgeQuery, type MetadataLabelHit } from './edgeSelectionLabels';
import { resolveFaceQuery, type FaceQuery } from './edgeQueries';
import type { OcctBackend } from './occtBackend';
import { resolveFaceRef } from '../../naming/resolveFaceRef';
import { resolveCanonicalByGeometry } from './canonicalFaceGeometry';
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
export function faceByHash(base: OcctBackend, faceHash: string): Face {
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
 * Resolve a canonical face name to the matching Replicad `Face` instance on `base`.
 *
 * Returns `null` when the face name is not applicable to the primitive kind
 * (e.g. 'left' on a cylinder) or when no face centroid matches the expected
 * bounding-box plane within TOL.
 *
 * Private to this module — callers use `pickEdges` or `pickFace`.
 */
export function findCanonicalFace(base: OcctBackend, face: CanonicalFace): Face | null {
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
export function canonicalFaceOnSweptSolid(
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

export function resolveFaceQueryDslRef(
  record: FeatureRecord,
  base: OcctBackend,
  ref: QueryDslFaceRef,
  records: readonly FeatureRecord[] | undefined,
): Face | { error: CompilerDiagnostic } {
  const r = resolveQueryDslFace(record, base, ref, records);
  if ('error' in r) return r;
  return r.face;
}

export function resolveFaceQueryRef(
  record: FeatureRecord,
  base: OcctBackend,
  ref: Extract<FaceRef, { kind: 'query' }>,
): Face | { error: CompilerDiagnostic } {
  const faces = resolveFaceQuery(base, ref.query);
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

export function resolveFaceLabelRef(
  record: FeatureRecord,
  base: OcctBackend,
  labelName: string,
  records: readonly FeatureRecord[] | undefined,
): Face | { error: CompilerDiagnostic } {
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

export function resolveFaceCanonicalRef(
  record: FeatureRecord,
  base: OcctBackend,
  ref: Extract<FaceRef, { kind: 'canonical' | 'created' }>,
): Face | { error: CompilerDiagnostic } {
  if (base.historyMap !== undefined) {
    const resolved = resolveFaceRef(ref, {
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

  if (ref.kind === 'created') {
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
  const face = ref.face as CanonicalFace;
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

/**
 * Resolve a metadata label hit to the matching `Face` on the consumer's
 * current lowered shape (`base`).
 *
 * - Canonical alias: route through `resolveFaceRef` (historyMap) or the
 *   centroid heuristic (`findCanonicalFace`) when no history is present.
 * - FaceQuery: call `resolveFaceQuery`; error on zero matches.
 */
export function resolveFromMetadataHit(
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

/**
 * Public re-export of label→Face resolution. Used by featureMeshing.ts for
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

export type QueryDslFaceRef = Extract<
  import('../../../shared/intent/types').FaceRef,
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
export function resolveQueryDslFace(
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

/** Map a thrown Query evaluator KernelError (query.*) into the lowerer's
 *  CompilerDiagnostic envelope so the rest of the lowering pipeline
 *  surfaces it through the same channel as feature.* errors. */
export function queryDiagnosticToCompilerError(
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
