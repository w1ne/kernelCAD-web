// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { cast, getOC, measureArea, type AnyShape } from 'replicad';
import { OcctBackend, meshShapeForExport } from '../../kernel/backends/occt/occtBackend';
import type { ShapeBackend } from '../../kernel/backends/backend';
import type { Vec3 } from '../../shared/intent/types';
import { checkMeshSymmetry } from './geometrySymmetry';
import { resolveGeometryQualityOptions, type GeometryQualityOptions, type GeometryQualityReport, type ResolvedGeometryQualityOptions } from './geometryQualityTypes';

type FaceInfo = { id: string; index: number; areaMm2: number; location: Vec3 };
type EdgeInfo = { id: string; index: number; lengthMm: number; location: Vec3 };
type Brep = ReturnType<OcctBackend['getReplicadShape']>;

/** Count sub-shapes of `type` that are NOT nested inside a sub-shape of `avoid`. */
function countOutside(brep: Brep, type: string, avoid: string): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const e = new oc.TopExp_Explorer_2(brep.wrapped, oc.TopAbs_ShapeEnum[type], oc.TopAbs_ShapeEnum[avoid]);
  let n = 0;
  try {
    for (; e.More(); e.Next()) n++;
  } finally {
    e.delete();
  }
  return n;
}

/** Shells/faces/wires/edges/vertices not nested inside their parent level. */
function hasLooseTopology(brep: Brep): boolean {
  return [
    ['TopAbs_SHELL', 'TopAbs_SOLID'], ['TopAbs_FACE', 'TopAbs_SHELL'], ['TopAbs_WIRE', 'TopAbs_FACE'],
    ['TopAbs_EDGE', 'TopAbs_WIRE'], ['TopAbs_VERTEX', 'TopAbs_EDGE'],
  ].some(([type, avoid]) => countOutside(brep, type, avoid) > 0);
}

/** The target must be exactly one solid and nothing else: a compound with one
 *  solid plus loose shells, faces, wires, edges or vertices is rejected rather
 *  than measured. Walks the real topology (each level outside its parent
 *  level), so loose geometry that happens to share or duplicate the solid's
 *  faces/edges is still found. */
function assertSingleSolid(brep: Brep): void {
  if (countOutside(brep, 'TopAbs_SOLID', 'TopAbs_SHAPE') !== 1) throw new Error('Geometry quality requires exactly one solid body.');
  if (hasLooseTopology(brep)) throw new Error('Geometry quality requires exactly one solid body with no loose faces, shells or wires.');
}

type Faces = Brep['faces'];
type Edges = Brep['edges'];
const invalidMeasurements = () => new Error('Incomplete or invalid BREP face/edge measurements.');
const finite = (v: Vec3) => v.every(Number.isFinite);
const xyz = (c: { x: number; y: number; z: number }): Vec3 => [c.x, c.y, c.z];

/** Relative error of the adaptive area integration used by the fast screen. */
const FAST_AREA_EPS = 1e-3;
/** Adaptive (error-bounded) face area: an order of magnitude cheaper than the
 *  fixed-order Gauss integration on dense B-spline faces. */
function fastArea(face: Faces[number]): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const props = new oc.GProp_GProps_1();
  try {
    oc.BRepGProp.SurfaceProperties_2(face.wrapped, props, FAST_AREA_EPS, true);
    return props.Mass() as number;
  } finally {
    props.delete();
  }
}

/** Face areas; the precise, costly center integration runs only for the few
 *  faces under the threshold. With `fast`, areas come from the adaptive
 *  integration and only faces within 1% of the threshold are re-measured
 *  exactly, so the tiny/not-tiny verdict matches the exact screen. */
function measureFaces(faces: Faces, options: ResolvedGeometryQualityOptions, fast: boolean) {
  const areas = faces.map(face => (fast ? fastArea(face) : measureArea(face)));
  if (areas.length === 0 || areas.some(a => !Number.isFinite(a) || a <= 0)) throw invalidMeasurements();
  const surfaceAreaMm2 = areas.reduce((sum, a) => sum + a, 0);
  const tinyFaceAreaMm2 = Math.max(options.tinyFaceAreaMm2, options.tinyFaceRelative * surfaceAreaMm2);
  if (!Number.isFinite(tinyFaceAreaMm2) || !Number.isFinite(surfaceAreaMm2)) throw new Error('Nonfinite BREP area threshold.');
  if (fast) areas.forEach((a, i) => { if (a < tinyFaceAreaMm2 * 1.01) areas[i] = measureArea(faces[i]); });
  const tinyFaces: FaceInfo[] = areas.flatMap((areaMm2, index) =>
    areaMm2 < tinyFaceAreaMm2 ? [{ id: `f${index}`, index, areaMm2, location: xyz(faces[index].center) }] : []);
  if (tinyFaces.some(f => !finite(f.location))) throw invalidMeasurements();
  return { tinyFaces, surfaceAreaMm2, tinyFaceAreaMm2 };
}

/** Edge lengths; midpoints only for short edges. Degenerated edges (sphere
 *  poles) are read from the topology flag, never inferred from length. */
function measureEdges(edges: Edges, shortEdgeLengthMm: number) {
  const degenerateEdges: GeometryQualityReport['degenerateEdges'] = [];
  const shortEdges: EdgeInfo[] = [];
  let measured = 0;
  edges.forEach((edge, index) => {
    if (getOC().BRep_Tool.Degenerated(edge.wrapped)) {
      const box = edge.boundingBox;
      try { degenerateEdges.push({ id: `e${index}`, index, location: box.center }); }
      finally { box.delete(); }
      return;
    }
    const lengthMm = edge.length;
    if (!Number.isFinite(lengthMm) || lengthMm < 0) throw invalidMeasurements();
    measured++;
    if (lengthMm < shortEdgeLengthMm) shortEdges.push({ id: `e${index}`, index, lengthMm, location: xyz(edge.pointAt(0.5)) });
  });
  if (measured === 0 || shortEdges.some(e => !finite(e.location)) || degenerateEdges.some(e => !finite(e.location))) throw invalidMeasurements();
  return { shortEdges, degenerateEdges };
}

/** Topology-only part of the quality report (no symmetry sampling). */
export type TopologyQualityReport = Pick<GeometryQualityReport, 'ok' | 'counts' | 'thresholds' | 'tinyFaces' | 'shortEdges' | 'degenerateEdges'>;

/** Tiny-face / short-edge screen of ONE solid BREP. The caller guarantees the
 *  solid-only contract (see {@link splitSolids}); no meshing is done. */
export function checkSolidTopology(brep: Brep, options: ResolvedGeometryQualityOptions, fast = false): TopologyQualityReport {
  const faces = brep.faces;
  const edges = brep.edges;
  try {
    const { tinyFaces, surfaceAreaMm2, tinyFaceAreaMm2 } = measureFaces(faces, options, fast);
    const { shortEdges, degenerateEdges } = measureEdges(edges, options.shortEdgeLengthMm);
    return {
      ok: tinyFaces.length === 0 && shortEdges.length === 0,
      counts: { faces: faces.length, edges: edges.length },
      thresholds: { tinyFaceAreaMm2, tinyFaceRelative: options.tinyFaceRelative, shortEdgeLengthMm: options.shortEdgeLengthMm, surfaceAreaMm2 },
      tinyFaces, shortEdges, degenerateEdges,
    };
  } finally {
    faces.forEach(f => f.delete());
    edges.forEach(e => e.delete());
  }
}

/** Cheap face count (topology walk only, no measurement) for budgeting. */
function countBrepFaces(brep: Brep): number {
  return countOutside(brep, 'TopAbs_FACE', 'TopAbs_SHAPE');
}

/** A body's solids, or why it has none to check. `solids` are fresh wrappers
 *  the caller must `delete()`; the source shape is untouched. */
type SolidSplit = { kind: 'solids'; solids: Brep[] } | { kind: 'not-solid'; reason: string };

/** Split a body into its solids. Shells, faces, wires or other loose topology
 *  (alone or beside solids) are reported as `not-solid` rather than measured. */
function splitSolids(brep: Brep): SolidSplit {
  if (countOutside(brep, 'TopAbs_SOLID', 'TopAbs_SHAPE') === 0) {
    return { kind: 'not-solid', reason: 'no solid body (shell, face or wire geometry)' };
  }
  if (hasLooseTopology(brep)) return { kind: 'not-solid', reason: 'loose shells, faces or wires beside the solid(s)' };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const e = new oc.TopExp_Explorer_2(brep.wrapped, oc.TopAbs_ShapeEnum.TopAbs_SOLID, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
  const solids: Brep[] = [];
  try {
    for (; e.More(); e.Next()) solids.push(cast(e.Current()) as AnyShape as Brep);
  } finally {
    e.delete();
  }
  return { kind: 'solids', solids };
}

/** One body's topology screen: per-solid reports, or why it was skipped.
 *  `faces` is what the screen consumed from the caller's face budget. */
export type BodyTopologyScreen = { reports: TopologyQualityReport[]; faces: number } | { skipped: string; faces: number };

/** Tiny-face / short-edge screen of every solid in `shape`, within a face
 *  budget. Meshes, non-OCCT bodies, shells and mixed compounds are skipped
 *  with a reason instead of throwing. */
export function screenBodyTopology(shape: ShapeBackend, options: ResolvedGeometryQualityOptions, remainingFaces: number): BodyTopologyScreen {
  if (!(shape instanceof OcctBackend)) return { skipped: 'not a B-rep solid (mesh or non-OCCT body)', faces: 0 };
  const brep = shape.getReplicadShape();
  const faces = countBrepFaces(brep);
  if (faces > remainingFaces) return { skipped: `face budget exhausted (${faces} faces, ${remainingFaces} left)`, faces: 0 };
  const split = splitSolids(brep);
  if (split.kind === 'not-solid') return { skipped: split.reason, faces: 0 };
  try {
    return { reports: split.solids.map(s => checkSolidTopology(s, options, true)), faces };
  } finally {
    split.solids.forEach(s => s.delete());
  }
}

/** Read-only quality screen of one solid using existing BREP/meshing APIs. */
export function checkGeometryQuality(shape: ShapeBackend, featureId: string, input: GeometryQualityOptions = {}): GeometryQualityReport {
  const options = resolveGeometryQualityOptions(input);
  if (!(shape instanceof OcctBackend)) throw new Error('Geometry quality requires one OCCT body; select a body feature_id for assemblies.');
  const brep = shape.getReplicadShape();
  assertSingleSolid(brep);
  const topology = checkSolidTopology(brep, options);
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
    ...topology,
    ok: topology.ok && symmetry.planes.every(p => p.name !== 'asserted' || p.passed),
    source: 'local', featureId, frame: 'model', symmetry,
    limitations: [
      'Symmetry is a sampled tessellation screen, not exact BREP proof; defects between samples can be missed and curved tessellation can affect deviations.',
      'Candidate planes are discovery only; an asserted plane gates ok. Principal axes can be non-unique when moments repeat.',
      ...(unitAxes ? [] : ['Principal inertia axes were degenerate or non-finite; inertia candidate planes were omitted.']),
      'Face/edge ids and indices are scoped to this feature rebuild. Locations are in model coordinates; face centers need not lie inside trimmed faces.',
      'Local geometry validation does not certify manufacturing, loads or hardware acceptance.',
    ],
  };
}
