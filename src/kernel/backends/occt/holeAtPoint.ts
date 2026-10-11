// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/holeAtPoint.ts
//
// Entry frame for point-placed holes — `hole(face, { at, axis? })`.
//
// A `{ u, v }` hole lives in the planar face frame (face centroid + world
// aligned axes), which a curved face does not have: the centroid of a
// cylinder's side face is on its axis, inside the part. An `at` hole starts
// from a world point projected onto the entry face and drills along the
// inward face normal there (or the given `axis`), so set screws and cross
// pins go straight into a cylinder side.
//
//   at: [x, y, z]        the face nearest the point (among the faces the
//                        selector matches) is the entry face; the point is
//                        projected onto it and must lie within AT_TOL_MM.
//   at: { angleDeg, z }  cylindrical entry faces only: the point at that
//                        polar angle about the cylinder axis and that axial
//                        world coordinate; of several matching cylinders the
//                        largest one carrying the point is used.
//
// `firstExitDepth` measures `depth: 'through'` along an arbitrary axis: the
// length of the bore axis inside material before it first leaves the body.

import * as replicad from 'replicad';
import type { Face } from 'replicad';
import type { OcctBackend } from './occtBackend';
import { pickFace } from './edgeSelection';
import { resolveFaceQuery } from './edgeQueries';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import type { Vec3 } from '../../../shared/intent/types';

/** Max distance (mm) between `at` and the entry face before it is projected. */
export const AT_TOL_MM = 0.5;

export interface PointEntry {
  face: Face;
  point: Vec3;
  normalOutward: Vec3;
  axisIntoBody: Vec3;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Oc = any;

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const fmt = (p: Vec3): string => `(${p.map((n) => Math.round(n * 1000) / 1000).join(', ')})`;

function unit(a: Vec3): Vec3 {
  const l = Math.hypot(a[0], a[1], a[2]);
  return l < 1e-12 ? a : scale(a, 1 / l);
}

/** True when the hole record was placed with `at` instead of `{ u, v }`. */
export function isPointPlacedHole(feature: FeatureRecord): boolean {
  return feature.params.atZ !== undefined;
}

function err(featureId: string, code: CompilerDiagnostic['code'], message: string, hint: string): { error: CompilerDiagnostic } {
  return { error: { target: 'export-occt', code, featureId, severity: 'error', message, hint } };
}

/** Faces the selector matches: every match of a FaceQuery, else the one face. */
function candidateFaces(
  feature: FeatureRecord,
  target: OcctBackend,
  records: readonly FeatureRecord[] | undefined,
): Face[] | { error: CompilerDiagnostic } {
  const ref = feature.inputs.face;
  if (ref?.kind === 'face' && ref.ref.kind === 'query') {
    const faces = resolveFaceQuery(target, ref.ref.query);
    if (faces.length > 0) return faces;
    return err(feature.id, 'feature.selection.no-match', 'hole: the face query matched zero faces on the input shape.',
      "Inspect faces with list_faces; for a cylinder side use { ofSurfaceType: 'CYLINDER' }.");
  }
  const one = pickFace(feature, target, records);
  return 'error' in one ? one : [one];
}

/** Closest point on `face` to `p`, with its distance; undefined if OCCT fails. */
function closestOnFace(oc: Oc, face: Face, p: Vec3): { dist: number; point: Vec3 } | undefined {
  const vertex = replicad.makeVertex(p);
  const ext = new oc.BRepExtrema_DistShapeShape_1();
  try {
    ext.LoadS1(vertex.wrapped);
    ext.LoadS2(face.wrapped);
    const progress = new oc.Message_ProgressRange_1();
    const ok = ext.Perform(progress);
    progress.delete();
    if (!ok || !ext.IsDone() || ext.NbSolution() < 1) return undefined;
    const q = ext.PointOnShape2(1);
    const out = { dist: ext.Value() as number, point: [q.X(), q.Y(), q.Z()] as Vec3 };
    q.delete();
    return out;
  } finally {
    ext.delete();
    vertex.delete();
  }
}

interface CylinderFrame { origin: Vec3; dir: Vec3; radius: number }

function cylinderOf(oc: Oc, face: Face): CylinderFrame | undefined {
  if (face.geomType !== 'CYLINDRE') return undefined;
  const adaptor = new oc.BRepAdaptor_Surface_2(face.wrapped, true);
  try {
    const cyl = adaptor.Cylinder();
    const ax = cyl.Position();
    const loc = ax.Location();
    const d = ax.Direction();
    let dir: Vec3 = [d.X(), d.Y(), d.Z()];
    // Orient the axis toward its dominant + world axis so `z` reads as a
    // world coordinate and the angle sense is right-handed about +axis.
    const k = [0, 1, 2].reduce((m, i) => (Math.abs(dir[i]) > Math.abs(dir[m]) ? i : m), 0);
    if (dir[k] < 0) dir = scale(dir, -1);
    return { origin: [loc.X(), loc.Y(), loc.Z()], dir, radius: cyl.Radius() as number };
  } finally {
    adaptor.delete();
  }
}

/** World point at polar angle `angleDeg` about the cylinder axis, axial coordinate `z`. */
function polarPoint(c: CylinderFrame, angleDeg: number, z: number): Vec3 {
  const ref0: Vec3 = Math.abs(c.dir[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const ref = unit(sub(ref0, scale(c.dir, dot(ref0, c.dir))));
  const side = cross(c.dir, ref);
  const a = angleDeg * Math.PI / 180;
  const onAxis = add(c.origin, scale(c.dir, z - dot(c.origin, c.dir)));
  return add(onAxis, add(scale(ref, c.radius * Math.cos(a)), scale(side, c.radius * Math.sin(a))));
}

function placeCartesian(oc: Oc, faces: Face[], at: Vec3, featureId: string): { face: Face; point: Vec3 } | { error: CompilerDiagnostic } {
  let best: { face: Face; dist: number; point: Vec3 } | undefined;
  for (const face of faces) {
    const c = closestOnFace(oc, face, at);
    if (c && (!best || c.dist < best.dist)) best = { face, ...c };
  }
  if (!best || best.dist > AT_TOL_MM) {
    const how = best ? `the nearest matching face is ${best.dist.toFixed(3)} mm away (closest point ${fmt(best.point)})` : 'no matching face could be measured';
    return err(featureId, 'feature.hole.cut-missing', `hole: at ${fmt(at)} is not on the entry face — ${how}.`,
      `Put \`at\` on the surface you drill into (within ${AT_TOL_MM} mm); on a cylinder of radius R about Z, at: [R·cos a, R·sin a, z] — or use at: { angleDeg, z }.`);
  }
  return best;
}

function placePolar(oc: Oc, faces: Face[], angleDeg: number, z: number, featureId: string): { face: Face; point: Vec3 } | { error: CompilerDiagnostic } {
  let best: { face: Face; point: Vec3; radius: number } | undefined;
  for (const face of faces) {
    const cyl = cylinderOf(oc, face);
    if (!cyl) continue;
    const p = polarPoint(cyl, angleDeg, z);
    const c = closestOnFace(oc, face, p);
    if (c && c.dist < 1e-3 && (!best || cyl.radius > best.radius)) best = { face, point: c.point, radius: cyl.radius };
  }
  if (best) return best;
  return err(featureId, 'feature.hole.cut-missing',
    `hole: at { angleDeg: ${angleDeg}, z: ${z} } lies on none of the selected cylindrical faces.`,
    "at: { angleDeg, z } needs a cylindrical entry face ({ ofSurfaceType: 'CYLINDER' }) whose axial extent contains z (a world coordinate along the cylinder axis).");
}

function readAxis(feature: FeatureRecord): Vec3 | undefined {
  const p = feature.params;
  if (p.axisX === undefined) return undefined;
  return unit([p.axisX.evaluated, p.axisY?.evaluated ?? 0, p.axisZ?.evaluated ?? 0]);
}

/** Resolve the entry face, entry point, outward normal and drill axis of an `at` hole. */
export function resolvePointEntry(
  feature: FeatureRecord,
  target: OcctBackend,
  records: readonly FeatureRecord[] | undefined,
): PointEntry | { error: CompilerDiagnostic } {
  const oc = replicad.getOC() as Oc;
  const faces = candidateFaces(feature, target, records);
  if ('error' in faces) return faces;
  const p = feature.params;
  const placed = p.atAngleDeg !== undefined
    ? placePolar(oc, faces, p.atAngleDeg.evaluated, p.atZ.evaluated, feature.id)
    : placeCartesian(oc, faces, [p.atX.evaluated, p.atY.evaluated, p.atZ.evaluated], feature.id);
  if ('error' in placed) return placed;
  const n = placed.face.normalAt(placed.point);
  const normalOutward = unit([n.x, n.y, n.z]);
  n.delete();
  const axisIntoBody = readAxis(feature) ?? scale(normalOutward, -1);
  if (dot(axisIntoBody, normalOutward) > -1e-3) {
    return err(feature.id, 'feature.invalid-args',
      `hole: axis ${fmt(axisIntoBody)} does not point into the body at ${fmt(placed.point)} (outward normal ${fmt(normalOutward)}).`,
      'hole(face, { at, axis }): `axis` is the drilling direction INTO the part; flip it, or omit it to drill along the inward face normal.');
  }
  return { face: placed.face, point: placed.point, normalOutward, axisIntoBody };
}

/** Parameter of `q` along the ray (origin, unit axis). */
const along = (q: Vec3, origin: Vec3, axis: Vec3): number => dot(sub(q, origin), axis);

function edgeInterval(oc: Oc, edge: unknown, origin: Vec3, axis: Vec3): [number, number] {
  const ts: number[] = [];
  const ex = new oc.TopExp_Explorer_2(edge, oc.TopAbs_ShapeEnum.TopAbs_VERTEX, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
  for (; ex.More(); ex.Next()) {
    const pnt = oc.BRep_Tool.Pnt(oc.TopoDS.Vertex_1(ex.Current()));
    ts.push(along([pnt.X(), pnt.Y(), pnt.Z()], origin, axis));
    pnt.delete();
  }
  ex.delete();
  return [Math.min(...ts), Math.max(...ts)];
}

/**
 * Depth from `origin` along `axis` to where the axis first leaves material,
 * or undefined when the axis does not run through the body there. The bore
 * axis is intersected with the solid (Common of solid and a line edge).
 */
export function firstExitDepth(target: OcctBackend, origin: Vec3, axis: Vec3): number | undefined {
  const oc = replicad.getOC() as Oc;
  const bb = target.boundingBox();
  const reach = 2 * Math.hypot(bb.max[0] - bb.min[0], bb.max[1] - bb.min[1], bb.max[2] - bb.min[2]) + 1;
  const line = replicad.makeLine(add(origin, scale(axis, -0.05)), add(origin, scale(axis, reach)));
  const progress = new oc.Message_ProgressRange_1();
  const common = new oc.BRepAlgoAPI_Common_3((target.getReplicadShape() as unknown as { wrapped: unknown }).wrapped, line.wrapped, progress);
  try {
    common.Build(progress);
    if (common.HasErrors()) return undefined;
    const intervals: [number, number][] = [];
    const ex = new oc.TopExp_Explorer_2(common.Shape(), oc.TopAbs_ShapeEnum.TopAbs_EDGE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
    for (; ex.More(); ex.Next()) intervals.push(edgeInterval(oc, ex.Current(), origin, axis));
    ex.delete();
    return exitFromIntervals(intervals);
  } finally {
    common.delete();
    progress.delete();
    line.delete();
  }
}

/** Merge touching inside-material intervals from the entry and return where they end. */
export function exitFromIntervals(intervals: readonly [number, number][]): number | undefined {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  let end: number | undefined;
  for (const [a, b] of sorted) {
    if (end === undefined) {
      if (a > 0.1) return undefined;
      end = b;
    } else if (a <= end + 1e-6) {
      end = Math.max(end, b);
    } else {
      break;
    }
  }
  return end !== undefined && end > 1e-6 ? end : undefined;
}
