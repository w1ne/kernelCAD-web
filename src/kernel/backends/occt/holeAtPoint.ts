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
//                        largest one carrying the point is cut, and that
//                        cylinder's axis is what a later replay selects.
//
// `firstExitDepth` measures `depth: 'through'` along an arbitrary axis: the
// length of the bore axis inside material before it first leaves the body.

import * as replicad from 'replicad';
import type { Face } from 'replicad';
import type { OcctBackend } from './occtBackend';
import { pickFace } from './edgeSelection';
import { resolveFaceQuery } from './edgeQueries';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import {
  clearDrilledPolarFrame,
  readDrilledPolarFrame,
  writeDrilledPolarFrame,
} from '../../../shared/intent/drilledPolarFrame';
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

export interface CylinderAxisFrame { origin: Vec3; dir: Vec3; radius: number }

/** Point `dir` toward its dominant positive component. `z` then reads as a
 *  coordinate along that axis, and the polar angle is right-handed about it.
 *  `placePolar` applies this in the frame it cuts; a later replay must apply
 *  it in that same frame, not in the post-transform frame. */
export function orientDominantCylinderDir(dir: Vec3): Vec3 {
  const k = [0, 1, 2].reduce((m, i) => (Math.abs(dir[i]) > Math.abs(dir[m]) ? i : m), 0);
  return dir[k] < 0 ? scale(dir, -1) : dir;
}

function readCylinder(oc: Oc, face: Face): CylinderAxisFrame | undefined {
  if (face.geomType !== 'CYLINDRE') return undefined;
  const adaptor = new oc.BRepAdaptor_Surface_2(face.wrapped, true);
  try {
    const cyl = adaptor.Cylinder();
    const ax = cyl.Position();
    const loc = ax.Location();
    const d = ax.Direction();
    return {
      origin: [loc.X(), loc.Y(), loc.Z()],
      dir: [d.X(), d.Y(), d.Z()],
      radius: cyl.Radius() as number,
    };
  } finally {
    adaptor.delete();
  }
}

function cylinderOf(oc: Oc, face: Face): CylinderAxisFrame | undefined {
  const raw = readCylinder(oc, face);
  if (!raw) return undefined;
  return { ...raw, dir: orientDominantCylinderDir(raw.dir) };
}

const RADIUS_TIE_MM = 1e-4;
const DIST_TIE_MM = 1e-4;
/** Axis locations from an inverse transform stay well inside this. Two
 *  distinct bosses are millimetres apart, so a tie falls through to radius. */
const AXIS_LINE_TIE_MM = 1e-3;

export interface PolarCylinderRank {
  /** Polar point of this candidate, in the face's frame. Used only when the
   *  hole record has no stored cut-frame axis. */
  pointOnFace: (frame: CylinderAxisFrame) => Vec3 | undefined;
  /** Candidate axis in the frame `placePolar` cut in. */
  cutFrame?: (frame: CylinderAxisFrame) => CylinderAxisFrame | undefined;
}

interface RankedCylinder {
  frame: CylinderAxisFrame;
  dist: number | undefined;
  radiusErr: number | undefined;
  axisErr: number | undefined;
}

function rememberDrilledPolarFrame(
  feature: FeatureRecord,
  records: readonly FeatureRecord[] | undefined,
  frame: CylinderAxisFrame,
): void {
  writeDrilledPolarFrame(feature, frame);
  const live = records?.find((record) => record.id === feature.id);
  if (live && live !== feature) writeDrilledPolarFrame(live, frame);
}

function forgetDrilledPolarFrame(
  feature: FeatureRecord,
  records: readonly FeatureRecord[] | undefined,
): void {
  clearDrilledPolarFrame(feature);
  const live = records?.find((record) => record.id === feature.id);
  if (live && live !== feature) clearDrilledPolarFrame(live);
}

function beats(next: RankedCylinder, prev: RankedCylinder | undefined): boolean {
  if (!prev) return true;
  if (next.axisErr !== undefined || prev.axisErr !== undefined) return beatsStoredAxis(next, prev);
  return beatsFaceDistance(next, prev);
}

/** Stored cut-frame axis: the matching line wins, then the matching radius.
 *  Distance-to-face prefers the cylinder the drill did not open. */
function beatsStoredAxis(next: RankedCylinder, prev: RankedCylinder): boolean {
  if (next.axisErr === undefined) return false;
  if (prev.axisErr === undefined) return true;
  if (Math.abs(next.axisErr - prev.axisErr) > AXIS_LINE_TIE_MM) return next.axisErr < prev.axisErr;
  const nextErr = next.radiusErr ?? Number.POSITIVE_INFINITY;
  const prevErr = prev.radiusErr ?? Number.POSITIVE_INFINITY;
  if (Math.abs(nextErr - prevErr) > RADIUS_TIE_MM) return nextErr < prevErr;
  return false;
}

function beatsFaceDistance(next: RankedCylinder, prev: RankedCylinder): boolean {
  const nextErr = next.radiusErr ?? Number.POSITIVE_INFINITY;
  const prevErr = prev.radiusErr ?? Number.POSITIVE_INFINITY;
  if (Math.abs(nextErr - prevErr) > RADIUS_TIE_MM) return nextErr < prevErr;
  const nextDist = next.dist ?? Number.POSITIVE_INFINITY;
  const prevDist = prev.dist ?? Number.POSITIVE_INFINITY;
  if (Math.abs(nextDist - prevDist) > DIST_TIE_MM) return nextDist < prevDist;
  return next.frame.radius > prev.frame.radius;
}

/** Distance from `a`'s axis line to `b`'s. Parallel lines use the cross
 *  rejection; skew lines use the common normal. */
function axisLineSeparation(a: CylinderAxisFrame, b: CylinderAxisFrame): number {
  const da = unit(a.dir);
  const db = unit(b.dir);
  const between = sub(b.origin, a.origin);
  if (Math.abs(dot(da, db)) > 1 - 1e-8) {
    const rej = cross(between, da);
    return Math.hypot(rej[0], rej[1], rej[2]);
  }
  const n = cross(da, db);
  const nLen = Math.hypot(n[0], n[1], n[2]);
  return nLen < 1e-12 ? 0 : Math.abs(dot(between, n)) / nLen;
}

function scorePolarFace(
  oc: Oc,
  face: Face,
  rank: PolarCylinderRank | undefined,
  drilled: CylinderAxisFrame | undefined,
): RankedCylinder | undefined {
  const cyl = readCylinder(oc, face);
  if (!cyl) return undefined;
  if (!rank) return { frame: cyl, dist: undefined, radiusErr: undefined, axisErr: undefined };
  const cut = rank.cutFrame?.(cyl);
  if (drilled && cut) {
    return {
      frame: cyl,
      dist: undefined,
      radiusErr: Math.abs(cut.radius - drilled.radius),
      axisErr: axisLineSeparation(cut, drilled),
    };
  }
  return scoreByFaceDistance(oc, face, cyl, rank);
}

function scoreByFaceDistance(
  oc: Oc,
  face: Face,
  cyl: CylinderAxisFrame,
  rank: PolarCylinderRank,
): RankedCylinder {
  const point = rank.pointOnFace(cyl);
  const hit = point === undefined ? undefined : closestOnFace(oc, face, point);
  return { frame: cyl, dist: hit?.dist, radiusErr: undefined, axisErr: undefined };
}

function largerRadius(largest: CylinderAxisFrame | undefined, frame: CylinderAxisFrame): CylinderAxisFrame {
  if (!largest || frame.radius > largest.radius) return frame;
  return largest;
}

function selectPolarCylinder(
  oc: Oc,
  faces: readonly Face[],
  rank: PolarCylinderRank | undefined,
  drilled: CylinderAxisFrame | undefined,
): CylinderAxisFrame | undefined {
  let best: RankedCylinder | undefined;
  let largest: CylinderAxisFrame | undefined;
  for (const face of faces) {
    const scored = scorePolarFace(oc, face, rank, drilled);
    if (!scored) continue;
    largest = largerRadius(largest, scored.frame);
    if (rank && beats(scored, best)) best = scored;
  }
  return rank ? (best?.frame ?? largest) : largest;
}

/** Cylindrical face a polar hole replays.
 *
 *  The cylinder `placePolar` drilled wins: its cut-frame axis (origin,
 *  direction, and radius) is stored on the hole record. The candidate whose
 *  axis line matches that frame is replayed. Distance from a polar point to
 *  the face is the ranking only when no frame was stored — after the cut the
 *  drilled mouth is open, so an undrilled twin of the same radius looks closer.
 *  The returned direction is the geometric axis, not yet flipped toward its
 *  dominant positive component. Without `rank`, the largest radius is kept. */
export function polarCylinderAxis(
  feature: FeatureRecord,
  target: OcctBackend,
  records: readonly FeatureRecord[] | undefined,
  rank?: PolarCylinderRank,
): CylinderAxisFrame | undefined {
  const faces = candidateFaces(feature, target, records);
  if ('error' in faces) return undefined;
  return selectPolarCylinder(replicad.getOC() as Oc, faces, rank, readDrilledPolarFrame(feature));
}

/** World point at polar angle `angleDeg` about the cylinder axis, axial coordinate `z`. */
export function polarPointOnAxis(frame: CylinderAxisFrame, angleDeg: number, z: number): Vec3 {
  return polarPoint(frame, angleDeg, z);
}

/** World point at polar angle `angleDeg` about the cylinder axis, axial coordinate `z`. */
function polarPoint(c: CylinderAxisFrame, angleDeg: number, z: number): Vec3 {
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

function placePolar(oc: Oc, faces: Face[], angleDeg: number, z: number, featureId: string): { face: Face; point: Vec3; frame: CylinderAxisFrame } | { error: CompilerDiagnostic } {
  let best: { face: Face; point: Vec3; frame: CylinderAxisFrame } | undefined;
  for (const face of faces) {
    const cyl = cylinderOf(oc, face);
    if (!cyl) continue;
    const p = polarPoint(cyl, angleDeg, z);
    const c = closestOnFace(oc, face, p);
    if (c && c.dist < 1e-3 && (!best || cyl.radius > best.frame.radius)) best = { face, point: c.point, frame: cyl };
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
  let placed: { face: Face; point: Vec3 };
  let polarFrame: CylinderAxisFrame | undefined;
  if (p.atAngleDeg !== undefined) {
    const polar = placePolar(oc, faces, p.atAngleDeg.evaluated, p.atZ.evaluated, feature.id);
    if ('error' in polar) {
      forgetDrilledPolarFrame(feature, records);
      return polar;
    }
    placed = polar;
    polarFrame = polar.frame;
  } else {
    const cartesian = placeCartesian(oc, faces, [p.atX.evaluated, p.atY.evaluated, p.atZ.evaluated], feature.id);
    if ('error' in cartesian) return cartesian;
    placed = cartesian;
  }
  const n = placed.face.normalAt(placed.point);
  const normalOutward = unit([n.x, n.y, n.z]);
  n.delete();
  const axisIntoBody = readAxis(feature) ?? scale(normalOutward, -1);
  if (dot(axisIntoBody, normalOutward) > -1e-3) {
    if (polarFrame) forgetDrilledPolarFrame(feature, records);
    return err(feature.id, 'feature.invalid-args',
      `hole: axis ${fmt(axisIntoBody)} does not point into the body at ${fmt(placed.point)} (outward normal ${fmt(normalOutward)}).`,
      'hole(face, { at, axis }): `axis` is the drilling direction INTO the part; flip it, or omit it to drill along the inward face normal.');
  }
  if (polarFrame) rememberDrilledPolarFrame(feature, records, polarFrame);
  return { face: placed.face, point: placed.point, normalOutward, axisIntoBody };
}
