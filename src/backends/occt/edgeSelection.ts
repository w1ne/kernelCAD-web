// src/backends/occt/edgeSelection.ts
import type { Edge, Face } from 'replicad';
import type { FeatureRecord } from '../../intent/featureRecord';
import type { CompilerDiagnostic } from '../../diagnostics/diagnostic';
import type { EdgeRef } from '../../intent/types';
import { OcctBackend } from './occtBackend';
import { resolveEdgeQuery, resolveFaceQuery, computeDihedralPublic } from './edgeQueries';
import { EDGE_QUERY_KEYS } from './queryKeys';
import { resolveFaceRef } from '../../naming/resolveFaceRef';

// Bounding-box face matching tolerance (mm). base.boundingBox() returns gap-corrected values, so this can be tight.
const TOL = 1e-4;

const KNOWN_EDGE_QUERY_KEYS = new Set<string>(EDGE_QUERY_KEYS);

type CanonicalFace = 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';

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
  // 1. Edges by query / segment(s) — resolve via edgeQueries.ts
  const edgesRef = record.inputs.edges;
  if (edgesRef && edgesRef.kind === 'edge') {
    const result = resolveEdgesRef(record, base, edgesRef.ref);
    if ('error' in result) return result;
    if (result.length === 0) {
      return {
        error: {
          target: 'export-occt',
          code: 'feature.edge-feature.no-edges-match',
          featureId: record.id,
          severity: 'error',
          message: `Edge query / segment selector matched zero edges on the input shape.`,
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
          code: 'feature.edge-feature.no-edges-match',
          featureId: record.id,
          severity: 'error',
          message: `Face query matched zero faces.`,
        },
      };
    }
    return collectFaceEdges(faces);
  }

  // 4. Face by label → translate to a probe-point query against the upstream sketch.
  if (faceRef.kind === 'face' && faceRef.ref.kind === 'label') {
    const probeQuery = labelToEdgeQuery(record, base, faceRef.ref.name, records);
    if ('error' in probeQuery) return probeQuery;
    const edges = resolveEdgeQuery(base, probeQuery.query);
    if (edges.length === 0) {
      return {
        error: {
          target: 'export-occt',
          code: 'feature.label.unknown-name',
          featureId: record.id,
          severity: 'error',
          message: `Label '${faceRef.ref.name}' resolved to a probe query that matched no edges.`,
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
          message: `Label '${faceRef.ref.name}': probe matched ${edges.length} edges with mixed convexity (both convex and concave). Filleting mixed selections fails inside the kernel; either split the label upstream, or refine with a more specific query like {atZ: ...}.`,
        },
      };
    }
    return edges;
  }

  // 5. Existing canonical face dispatch (UNCHANGED behavior).
  if (faceRef.kind !== 'face' || faceRef.ref.kind !== 'canonical') {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.edge-feature.face-ref-not-supported',
        featureId: record.id,
        severity: 'error',
        message: `Only canonical face refs, queries, and labels are supported; got '${faceRef.kind === 'face' ? faceRef.ref.kind : faceRef.kind}'.`,
      },
    };
  }

  // Canonical face filter — use resolveFaceRef for shapes with a historyMap
  // (seeded on primitives, propagated through transforms and booleans), or fall
  // back to the centroid heuristic for shapes without lineage data (sphere, legacy).
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
    return edgesOfFaceByHash(base, resolved.faceHash);
  }

  // No historyMap → must be an un-transformed primitive (kind tag set).
  if (!base.kind) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.edge-feature.face-ref-not-resolvable',
        featureId: record.id,
        severity: 'error',
        message: `Canonical face refs require an un-transformed primitive (box, cylinder, or sphere). Apply transforms after fillet/chamfer instead of before.`,
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
  if (ref.kind === 'query') {
    const unknownKeys = Object.keys(ref.query).filter(k => !KNOWN_EDGE_QUERY_KEYS.has(k));
    if (unknownKeys.length > 0) {
      return {
        error: {
          target: 'export-occt',
          code: 'feature.edge-feature.invalid-query',
          featureId: record.id,
          severity: 'error',
          message: `EdgeQuery has unknown keys: ${unknownKeys.join(', ')}. Valid keys: ${Array.from(KNOWN_EDGE_QUERY_KEYS).join(', ')}.`,
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
          code: 'feature.edge-feature.invalid-query',
          featureId: record.id,
          severity: 'error',
          message: `Invalid segment id '${ref.segmentId}' — segment IDs are stable only within one shape lowering.`,
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
            code: 'feature.edge-feature.invalid-query',
            featureId: record.id,
            severity: 'error',
            message: `Invalid segment id '${sid}'.`,
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
      code: 'feature.edge-feature.face-ref-not-supported',
      featureId: record.id,
      severity: 'error',
      message: `Edge ref kind '${(ref as { kind: string }).kind}' not supported.`,
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
        code: 'feature.edge-feature.face-ref-not-applicable',
        featureId: record.id,
        severity: 'error',
        message: `Canonical face '${face}' is not applicable to '${base.kind}' primitive.`,
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
        code: 'feature.face-feature.face-required',
        featureId: record.id,
        severity: 'error',
        message: `${record.kind} requires a 'face' input.`,
      },
    };
  }

  if (faceRef.kind !== 'face') {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.face-feature.face-ref-not-supported',
        featureId: record.id,
        severity: 'error',
        message: `Face ref kind '${faceRef.kind}' not supported.`,
      },
    };
  }

  // 1. FaceRef.query → resolve via resolveFaceQuery, take first match.
  if (faceRef.ref.kind === 'query') {
    const faces = resolveFaceQuery(base, faceRef.ref.query);
    if (faces.length === 0) {
      return {
        error: {
          target: 'export-occt',
          code: 'feature.face-feature.no-match',
          featureId: record.id,
          severity: 'error',
          message: `Face query matched zero faces on the input shape.`,
        },
      };
    }
    return faces[0];
  }

  // 2. FaceRef.label → walk upstream sketch, build face-probe bbox, find face by centroid.
  if (faceRef.ref.kind === 'label') {
    const result = resolveLabeledFace(record, base, faceRef.ref.name, records);
    if ('error' in result) return result;
    return result.face;
  }

  // 3. FaceRef.canonical → use resolveFaceRef for shapes with a historyMap
  // (seeded on primitives, propagated through transforms and booleans), or fall
  // back to the centroid heuristic for shapes without lineage data (sphere, legacy).
  // NOTE: an empty historyMap (size === 0) still enters this path so that
  //       face-ref-removed is emitted when all faces were deleted by a boolean.
  if (faceRef.ref.kind === 'canonical') {
    if (base.historyMap !== undefined) {
      const resolved = resolveFaceRef(faceRef.ref, {
        currentShape: base,
        featureId: record.id,
        surface: 'face-feature',
      });
      if (!resolved.ok) {
        return { error: resolved.diagnostic };
      }
      return faceByHash(base, resolved.faceHash);
    }

    // No historyMap → must be an un-transformed primitive (kind tag set).
    if (!base.kind) {
      return {
        error: {
          target: 'export-occt',
          code: 'feature.face-feature.face-ref-not-resolvable',
          featureId: record.id,
          severity: 'error',
          message: `Canonical face refs require an un-transformed primitive (box, cylinder, or sphere). Apply transforms after the face feature instead of before.`,
        },
      };
    }
    const face = faceRef.ref.face as CanonicalFace;
    const f = findCanonicalFace(base, face);
    if (f === null) {
      return {
        error: {
          target: 'export-occt',
          code: 'feature.face-feature.face-ref-not-applicable',
          featureId: record.id,
          severity: 'error',
          message: `Canonical face '${face}' is not applicable to ${base.kind}.`,
        },
      };
    }
    return f;
  }

  // Catch-all for any other ref kinds (tracked, created, propagated).
  return {
    error: {
      target: 'export-occt',
      code: 'feature.face-feature.face-ref-not-supported',
      featureId: record.id,
      severity: 'error',
      message: `Face ref kind '${(faceRef.ref as { kind: string }).kind}' not supported in this rc.`,
    },
  };
}

function resolveLabeledFace(
  record: FeatureRecord,
  base: OcctBackend,
  label: string,
  records: readonly FeatureRecord[] | undefined,
): { face: Face } | { error: CompilerDiagnostic } {
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
      },
    };
  }

  const commands = (upstreamSketch.metadata as { commands?: Array<{ kind: string; x?: number; y?: number; label?: string }> } | undefined)?.commands;
  if (!commands) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.label.unknown-name',
        featureId: record.id,
        severity: 'error',
        message: `Label '${label}': upstream sketch has no commands metadata.`,
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
      },
    };
  }

  const depth = extractExtrudeDepth(records, record);
  if (depth === null) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.label.unsupported-base',
        featureId: record.id,
        severity: 'error',
        message: `Label '${label}': labels currently support extrude only. Revolve labels are deferred; use an inline query against the geometry as a workaround: {face: {atZ: ...}}.`,
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
  const xMin = Math.min(prev.x, segment.x) - tol;
  const xMax = Math.max(prev.x, segment.x) + tol;
  const yMin = Math.min(prev.y, segment.y) - tol;
  const yMax = Math.max(prev.y, segment.y) + tol;
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
