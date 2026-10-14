// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { getOC, measureArea } from 'replicad';
import { OcctBackend, meshShapeForExport } from '../../kernel/backends/occt/occtBackend';
import type { ShapeBackend } from '../../kernel/backends/backend';
import type { Vec3 } from '../../shared/intent/types';
import { checkMeshSymmetry } from './geometrySymmetry';
import { resolveGeometryQualityOptions, type GeometryQualityOptions, type GeometryQualityReport } from './geometryQualityTypes';

/** Read-only quality screen of one solid using existing BREP/meshing APIs. */
export function checkGeometryQuality(shape: ShapeBackend, featureId: string, input: GeometryQualityOptions = {}): GeometryQualityReport {
  const options = resolveGeometryQualityOptions(input);
  if (!(shape instanceof OcctBackend)) throw new Error('Geometry quality requires one OCCT body; select a body feature_id for assemblies.');
  const solids = shape.solidComponents();
  try {
    if (solids.length !== 1) throw new Error('Geometry quality requires exactly one solid body.');
  } finally {
    solids.forEach(s => s.dispose?.());
  }
  const brep = shape.getReplicadShape();
  const faces = brep.faces;
  const edges = brep.edges;
  let faceInfo: { id: string; index: number; areaMm2: number; location: Vec3 }[];
  let edgeInfo: { id: string; index: number; lengthMm: number; location: Vec3 }[];
  const degenerateEdges: GeometryQualityReport['degenerateEdges'] = [];
  try {
    faceInfo = faces.map((face, index) => {
      const areaMm2 = measureArea(face), c = face.center;
      return { id: `f${index}`, index, areaMm2, location: [c.x,c.y,c.z] };
    });
    edgeInfo = edges.flatMap((edge, index) => {
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
  } finally {
    faces.forEach(f => f.delete());
    edges.forEach(e => e.delete());
  }
  if (faceInfo.length === 0 || edgeInfo.length === 0
    || faceInfo.some(f => !Number.isFinite(f.areaMm2) || f.areaMm2 <= 0 || !f.location.every(Number.isFinite))
    || edgeInfo.some(e => !Number.isFinite(e.lengthMm) || e.lengthMm < 0 || !e.location.every(Number.isFinite))
    || degenerateEdges.some(e => !e.location.every(Number.isFinite))) {
    throw new Error('Incomplete or invalid BREP face/edge measurements.');
  }
  const surfaceAreaMm2 = faceInfo.reduce((sum,f) => sum+f.areaMm2, 0);
  const tinyFaceAreaMm2 = Math.max(options.tinyFaceAreaMm2, options.tinyFaceRelative * surfaceAreaMm2);
  if (!Number.isFinite(tinyFaceAreaMm2) || !Number.isFinite(surfaceAreaMm2)) throw new Error('Nonfinite BREP area threshold.');
  const tinyFaces = faceInfo.filter(f => f.areaMm2 < tinyFaceAreaMm2);
  const shortEdges = edgeInfo.filter(e => e.lengthMm < options.shortEdgeLengthMm);
  const mass = shape.massProperties();
  if (!mass.com.every(Number.isFinite) || !mass.principalAxes.every(a => a.every(Number.isFinite) && Math.abs(Math.hypot(...a)-1) < 1e-6)) {
    throw new Error('Cannot resolve finite centroid and principal inertia axes.');
  }
  const planes = [
    { name: 'XY', origin: mass.com, normal: [0,0,1] as Vec3 },
    { name: 'YZ', origin: mass.com, normal: [1,0,0] as Vec3 },
    { name: 'XZ', origin: mass.com, normal: [0,1,0] as Vec3 },
    ...mass.principalAxes.map((normal,i) => ({ name: `inertia-${i+1}`, origin: mass.com, normal })),
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
      'Face/edge ids and indices are scoped to this feature rebuild. Locations are in model coordinates; face centers need not lie inside trimmed faces.',
      'Local geometry validation does not certify manufacturing, loads or hardware acceptance.',
    ],
  };
}
