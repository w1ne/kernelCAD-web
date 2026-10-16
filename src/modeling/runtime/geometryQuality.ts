// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { getOC, measureArea } from 'replicad';
import { OcctBackend, meshShapeForExport } from '../../kernel/backends/occt/occtBackend';
import type { ShapeBackend } from '../../kernel/backends/backend';
import type { Vec3 } from '../../shared/intent/types';
import { checkMeshSymmetry } from './geometrySymmetry';
import { resolveGeometryQualityOptions, type GeometryQualityOptions, type GeometryQualityReport } from './geometryQualityTypes';

type FaceInfo = { id: string; index: number; areaMm2: number; location: Vec3 };
type EdgeInfo = { id: string; index: number; lengthMm: number; location: Vec3 };
type Brep = ReturnType<OcctBackend['getReplicadShape']>;

/** Count sub-shapes of `type` that are NOT nested inside a sub-shape of `avoid`. */
function countOutside(brep: Brep, type: string, avoid: string): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const e = new oc.TopExp_Explorer(brep.wrapped, oc.TopAbs_ShapeEnum[type], oc.TopAbs_ShapeEnum[avoid]);
  let n = 0;
  try {
    for (; e.More(); e.Next()) n++;
  } finally {
    e.delete();
  }
  return n;
}

/** The target must be exactly one solid and nothing else: a compound with one
 *  solid plus loose shells, faces, wires, edges or vertices is rejected rather
 *  than measured. Walks the real topology (each level outside its parent
 *  level), so loose geometry that happens to share or duplicate the solid's
 *  faces/edges is still found. */
function assertSingleSolid(brep: Brep): void {
  if (countOutside(brep, 'TopAbs_SOLID', 'TopAbs_SHAPE') !== 1) throw new Error('Geometry quality requires exactly one solid body.');
  const loose = [
    ['TopAbs_SHELL', 'TopAbs_SOLID'], ['TopAbs_FACE', 'TopAbs_SHELL'], ['TopAbs_WIRE', 'TopAbs_FACE'],
    ['TopAbs_EDGE', 'TopAbs_WIRE'], ['TopAbs_VERTEX', 'TopAbs_EDGE'],
  ].some(([type, avoid]) => countOutside(brep, type, avoid) > 0);
  if (loose) throw new Error('Geometry quality requires exactly one solid body with no loose faces, shells or wires.');
}

function measureTopology(brep: Brep): { faceInfo: FaceInfo[]; edgeInfo: EdgeInfo[]; degenerateEdges: GeometryQualityReport['degenerateEdges'] } {
  const faces = brep.faces;
  const edges = brep.edges;
  const degenerateEdges: GeometryQualityReport['degenerateEdges'] = [];
  try {
    const faceInfo = faces.map((face, index) => {
      const areaMm2 = measureArea(face), c = face.center;
      return { id: `f${index}`, index, areaMm2, location: [c.x,c.y,c.z] as Vec3 };
    });
    const edgeInfo = edges.flatMap((edge, index) => {
      // Read an existing topology flag, never infer degeneracy from tiny length.
      if (getOC().BRep_Tool.Degenerated(edge.wrapped)) {
        const box = edge.boundingBox;
        try { degenerateEdges.push({ id: `e${index}`, index, location: box.center }); }
        finally { box.delete(); }
        return [];
      }
      const c = edge.pointAt(0.5);
      return [{ id: `e${index}`, index, lengthMm: edge.length, location: [c.x,c.y,c.z] as Vec3 }];
    });
    return { faceInfo, edgeInfo, degenerateEdges };
  } finally {
    faces.forEach(f => f.delete());
    edges.forEach(e => e.delete());
  }
}

function assertValidMeasurements(m: ReturnType<typeof measureTopology>): void {
  const finite = (v: Vec3) => v.every(Number.isFinite);
  const badFace = m.faceInfo.some(f => !Number.isFinite(f.areaMm2) || f.areaMm2 <= 0 || !finite(f.location));
  const badEdge = m.edgeInfo.some(e => !Number.isFinite(e.lengthMm) || e.lengthMm < 0 || !finite(e.location));
  const badDegenerate = m.degenerateEdges.some(e => !finite(e.location));
  if (m.faceInfo.length === 0 || m.edgeInfo.length === 0 || badFace || badEdge || badDegenerate) {
    throw new Error('Incomplete or invalid BREP face/edge measurements.');
  }
}

/** Read-only quality screen of one solid using existing BREP/meshing APIs. */
export function checkGeometryQuality(shape: ShapeBackend, featureId: string, input: GeometryQualityOptions = {}): GeometryQualityReport {
  const options = resolveGeometryQualityOptions(input);
  if (!(shape instanceof OcctBackend)) throw new Error('Geometry quality requires one OCCT body; select a body feature_id for assemblies.');
  const brep = shape.getReplicadShape();
  assertSingleSolid(brep);
  const measured = measureTopology(brep);
  assertValidMeasurements(measured);
  const { faceInfo, edgeInfo, degenerateEdges } = measured;
  const surfaceAreaMm2 = faceInfo.reduce((sum,f) => sum+f.areaMm2, 0);
  const tinyFaceAreaMm2 = Math.max(options.tinyFaceAreaMm2, options.tinyFaceRelative * surfaceAreaMm2);
  if (!Number.isFinite(tinyFaceAreaMm2) || !Number.isFinite(surfaceAreaMm2)) throw new Error('Nonfinite BREP area threshold.');
  const tinyFaces = faceInfo.filter(f => f.areaMm2 < tinyFaceAreaMm2);
  const shortEdges = edgeInfo.filter(e => e.lengthMm < options.shortEdgeLengthMm);
  const mass = shape.massProperties();
  if (!mass.com.every(Number.isFinite)) throw new Error('Cannot resolve a finite centroid.');
  // Inertia axes only seed optional candidate planes; a degenerate or
  // non-finite axis drops those candidates instead of failing the topology checks.
  const unitAxes = mass.principalAxes.every(a => a.every(Number.isFinite) && Math.abs(Math.hypot(...a)-1) < 1e-6);
  const planes = [
    { name: 'XY', origin: mass.com, normal: [0,0,1] as Vec3 },
    { name: 'YZ', origin: mass.com, normal: [1,0,0] as Vec3 },
    { name: 'XZ', origin: mass.com, normal: [0,1,0] as Vec3 },
    ...(unitAxes ? mass.principalAxes.map((normal,i) => ({ name: `inertia-${i+1}`, origin: mass.com, normal })) : []),
    ...(options.assertedPlane ? [{ name: 'asserted', ...options.assertedPlane }] : []),
  ];
  const mesh = meshShapeForExport(brep, { linear: options.meshDeflectionMm, relative: false, angularRad: 0.1 });
  const symmetry = checkMeshSymmetry(mesh, planes, options.symmetryToleranceMm, options.meshDeflectionMm);
  return {
    ok: tinyFaces.length === 0 && shortEdges.length === 0 && symmetry.planes.every(p => p.name !== 'asserted' || p.passed),
    source: 'local', featureId, frame: 'model', counts: { faces: faceInfo.length, edges: edgeInfo.length + degenerateEdges.length },
    thresholds: { tinyFaceAreaMm2, tinyFaceRelative: options.tinyFaceRelative, shortEdgeLengthMm: options.shortEdgeLengthMm, surfaceAreaMm2 },
    tinyFaces, shortEdges, degenerateEdges, symmetry,
    limitations: [
      'Symmetry is a sampled tessellation screen, not exact BREP proof; defects between samples can be missed and curved tessellation can affect deviations.',
      'Candidate planes are discovery only; an asserted plane gates ok. Principal axes can be non-unique when moments repeat.',
      ...(unitAxes ? [] : ['Principal inertia axes were degenerate or non-finite; inertia candidate planes were omitted.']),
      'Face/edge ids and indices are scoped to this feature rebuild. Locations are in model coordinates; face centers need not lie inside trimmed faces.',
      'Local geometry validation does not certify manufacturing, loads or hardware acceptance.',
    ],
  };
}
