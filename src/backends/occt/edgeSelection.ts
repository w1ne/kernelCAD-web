// src/backends/occt/edgeSelection.ts
import type { Edge, Face } from 'replicad';
import type { FeatureRecord } from '../../intent/featureRecord';
import type { CompilerDiagnostic } from '../../diagnostics/diagnostic';
import { OcctBackend } from './occtBackend';

// Bounding-box face matching tolerance (mm). base.boundingBox() returns gap-corrected values, so this can be tight.
const TOL = 1e-4;

type CanonicalFace = 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';

// EdgeList holds replicad Edge wrappers, which EdgeFinder.inList() accepts.
export type EdgeList = Edge[];

export type PickEdgesResult =
  | EdgeList
  | { error: CompilerDiagnostic };

export function pickEdges(record: FeatureRecord, base: OcctBackend): PickEdgesResult {
  const faceRef = record.inputs.face;

  // No face filter → all edges of the underlying shape.
  if (!faceRef) {
    return allEdgesOf(base);
  }

  if (faceRef.kind !== 'face' || faceRef.ref.kind !== 'canonical') {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.edge-feature.face-ref-not-supported',
        featureId: record.id,
        severity: 'error',
        message: `Only canonical face refs are supported in v0.2-alpha; got '${faceRef.kind === 'face' ? faceRef.ref.kind : faceRef.kind}'.`,
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

  const face = faceRef.ref.face as CanonicalFace;
  const edges = canonicalFaceEdges(base, face);
  if (edges === null) {
    return {
      error: {
        target: 'export-occt',
        code: 'feature.edge-feature.face-ref-not-applicable',
        featureId: record.id,
        severity: 'error',
        message: `Canonical face '${face}' is not applicable to ${base.kind}.`,
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
