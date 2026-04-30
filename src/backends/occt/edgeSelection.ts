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

function canonicalBoxFaceEdges(base: OcctBackend, face: CanonicalFace): EdgeList | null {
  // Match face by axis-aligned plane. We use the gap-corrected bounding box to identify which
  // OCCT face has the appropriate normal + offset, then collect that face's edges.
  const bb = base.boundingBox();
  const target = pickFacePlane(bb, face);
  // Iterate shape.faces; pick the one whose centroid aligns with the target plane.
  // Face.center returns a Vector with .x, .y, .z properties.
  const faces: Face[] = base.getReplicadShape().faces;
  for (const f of faces) {
    const c = f.center; // Vector with .x, .y, .z
    const coord = target.axisIndex === 0 ? c.x : target.axisIndex === 1 ? c.y : c.z;
    if (Math.abs(coord - target.value) < TOL) {
      // Found the matching face. Return its edges.
      return f.edges;
    }
  }
  return null;
}

function canonicalCylinderEndCapEdges(base: OcctBackend, face: 'top'|'bottom'): EdgeList | null {
  const bb = base.boundingBox();
  const targetZ = face === 'top' ? bb.max[2] : bb.min[2];
  const faces: Face[] = base.getReplicadShape().faces;
  for (const f of faces) {
    if (Math.abs(f.center.z - targetZ) < TOL) {
      return f.edges;
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
