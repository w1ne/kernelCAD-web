// src/backends/occt/edgeSelection.ts
import type { Edge, Face } from 'replicad';
import type { FeatureRecord } from '../../intent/featureRecord';
import type { CompilerDiagnostic } from '../../diagnostics/diagnostic';
import type { EdgeRef } from '../../intent/types';
import { OcctBackend } from './occtBackend';
import { resolveEdgeQuery, resolveFaceQuery } from './edgeQueries';

// Bounding-box face matching tolerance (mm). base.boundingBox() returns gap-corrected values, so this can be tight.
const TOL = 1e-4;

type CanonicalFace = 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';

// EdgeList holds replicad Edge wrappers, which EdgeFinder.inList() accepts.
export type EdgeList = Edge[];

export type PickEdgesResult =
  | EdgeList
  | { error: CompilerDiagnostic };

export function pickEdges(record: FeatureRecord, base: OcctBackend): PickEdgesResult {
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
    const probeQuery = labelToEdgeQuery(record, base, faceRef.ref.name);
    if ('error' in probeQuery) return probeQuery;
    const edges = resolveEdgeQuery(base, probeQuery.query);
    if (edges.length === 0) {
      return {
        error: {
          target: 'export-occt',
          code: 'feature.face-feature.label-not-resolvable',
          featureId: record.id,
          severity: 'error',
          message: `Label '${faceRef.ref.name}' resolved to a probe query that matched no edges.`,
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

  // Canonical face filter → must be on an un-transformed primitive (kind tag set).
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
 *   - `base.kind` must be set (un-transformed primitive) to be resolvable.
 *   - The canonical face name must be applicable to the primitive kind.
 */
export function pickFace(
  record: FeatureRecord,
  base: OcctBackend,
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

  if (faceRef.kind !== 'face' || faceRef.ref.kind !== 'canonical') {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.face-feature.face-ref-not-supported',
        featureId: record.id,
        severity: 'error',
        message: `Only canonical face refs are supported in v0.2-alpha.`,
      },
    };
  }

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

let loweringRecords: readonly FeatureRecord[] | null = null;
export function setLoweringRecords(records: readonly FeatureRecord[] | null): void {
  loweringRecords = records;
}

function labelToEdgeQuery(
  record: FeatureRecord,
  _base: OcctBackend,
  label: string,
): { query: import('./edgeQueries').EdgeQuery } | { error: CompilerDiagnostic } {
  if (!loweringRecords) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.face-feature.label-not-resolvable',
        featureId: record.id,
        severity: 'error',
        message: `Label '${label}' lookup requires lowering records context (internal: setLoweringRecords not called).`,
      },
    };
  }

  const upstreamSketch = findUpstreamSketch(loweringRecords, record);
  if (!upstreamSketch) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.face-feature.label-not-resolvable',
        featureId: record.id,
        severity: 'error',
        message: `Label '${label}': upstream sketch not found. Labels work on shapes built from a sketch (extrude/revolve).`,
      },
    };
  }

  const commands = (upstreamSketch.metadata as { commands?: Array<{ kind: string; x?: number; y?: number; label?: string }> } | undefined)?.commands;
  if (!commands) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.face-feature.label-not-resolvable',
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
        code: 'feature.face-feature.label-not-resolvable',
        featureId: record.id,
        severity: 'error',
        message: `Label '${label}' not found on the upstream sketch's segments.`,
      },
    };
  }

  const segment = commands[labeledIdx];
  const prev = commands[labeledIdx - 1];
  if (!prev || prev.x === undefined || prev.y === undefined || segment.x === undefined || segment.y === undefined) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.face-feature.label-not-resolvable',
        featureId: record.id,
        severity: 'error',
        message: `Label '${label}': can't determine segment chord (prior command has no endpoint).`,
      },
    };
  }

  const depth = extractExtrudeDepth(loweringRecords, record);
  if (depth === null) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.face-feature.label-not-resolvable',
        featureId: record.id,
        severity: 'error',
        message: `Label '${label}': labels currently support extrude only (revolve labels: rc.7).`,
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
