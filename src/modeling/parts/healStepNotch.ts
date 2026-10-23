// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/healStepNotch.ts
//
// Local box-cut ("notch") detection for the STEP import heal: pinch clusters
// of a non-planar invalid face, duplicate translator patches, and faces whose
// triangulation boundary is not covered by their own edge polygons.

/* eslint-disable @typescript-eslint/no-explicit-any -- OCCT handles come from
   the dynamically typed opencascade.js bindings; `OcctHealApi` types the calls,
   and narrowing every handle would add no safety. */

import {
  boundsOf,
  areaOf,
  distanceSq,
  edgesOf,
  facesOf,
  pointsBounds,
  sampleEdge,
  type Bounds,
  type OcctHealApi,
  type Vec3,
} from './healStepOcct';

/** Edges closer than this are treated as touching (mm). */
const TOUCH_TOL = 0.05;
/** Touch points closer than this belong to one pinch cluster (mm). */
const CLUSTER_TOL = 2;
/** Clearance added around a pinch cluster (mm). */
const NOTCH_PAD = 0.6;
/** A cluster closer than this to the face border extends to the border (mm). */
const BORDER_NEAR = 2.5;
/** Extra clearance when extending a notch to the face border (mm). */
const BORDER_EXTRA = 0.5;
/** Clearance added around a duplicate-face bounding box (mm). */
const DUPLICATE_PAD = 0.8;
/** Tessellation deflection used by the mesh-gap pass (mm). */
const MESH_DEFLECTION = 0.2;

export function clusterPoints(points: Vec3[], tolerance: number): Vec3[][] {
  const seen = new Array<boolean>(points.length).fill(false);
  const limit = tolerance * tolerance;
  const clusters: Vec3[][] = [];
  for (let i = 0; i < points.length; i++) {
    if (seen[i]) continue;
    const stack = [i];
    seen[i] = true;
    const cluster: Vec3[] = [];
    while (stack.length) {
      const k = stack.pop() as number;
      cluster.push(points[k]);
      for (let j = 0; j < points.length; j++) {
        if (seen[j]) continue;
        if (distanceSq(points[k], points[j]) <= limit) {
          seen[j] = true;
          stack.push(j);
        }
      }
    }
    clusters.push(cluster);
  }
  return clusters;
}

/** Turn a pinch region into a notch box, extending it to nearby face borders. */
export function notchBox(region: Bounds, face: Bounds): Bounds {
  const lo: Vec3 = [0, 0, 0];
  const hi: Vec3 = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    lo[k] = region.lo[k] - NOTCH_PAD;
    hi[k] = region.hi[k] + NOTCH_PAD;
    if (region.lo[k] - face.lo[k] < BORDER_NEAR) lo[k] = face.lo[k] - BORDER_EXTRA;
    if (face.hi[k] - region.hi[k] < BORDER_NEAR) hi[k] = face.hi[k] + BORDER_EXTRA;
  }
  return { lo, hi };
}

export function shareEndpoint(a: Vec3[], b: Vec3[]): boolean {
  for (const p of a) {
    for (const q of b) {
      if (distanceSq(p, q) <= 1e-10) return true;
    }
  }
  return false;
}

/** Exact closest points between two edges. */
function closestPoints(oc: OcctHealApi, first: any, second: any): [Vec3, Vec3] | null {
  const distance = new oc.BRepExtrema_DistShapeShape_1();
  try {
    distance.LoadS1(first);
    distance.LoadS2(second);
    distance.Perform(new oc.Message_ProgressRange_1());
    if (!distance.IsDone() || distance.NbSolution() < 1) return null;
    const from = distance.PointOnShape1(1);
    const to = distance.PointOnShape2(1);
    return [
      [from.X(), from.Y(), from.Z()],
      [to.X(), to.Y(), to.Z()],
    ];
  } catch {
    return null;
  } finally {
    distance.delete();
  }
}

/**
 * Find the pinch clusters of a non-planar face and return the notch boxes.
 * Pairs that merely share a wire vertex are the normal edge chain; only curves
 * that touch away from their endpoints are pinches. Largest cluster first: the
 * most degenerate region stabilises the shape before the smaller boolean runs.
 */
export function pinchNotchBoxes(oc: OcctHealApi, face: any): Bounds[] {
  const faceBounds = boundsOf(oc, face);
  const edges = edgesOf(oc, face);
  const ends = edges.map((edge) => sampleEdge(oc, edge, 2));
  const touches: Vec3[] = [];
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      if (shareEndpoint(ends[i], ends[j])) continue;
      const closest = closestPoints(oc, edges[i], edges[j]);
      if (!closest) continue;
      if (distanceSq(closest[0], closest[1]) <= TOUCH_TOL * TOUCH_TOL) {
        touches.push(closest[0], closest[1]);
      }
    }
  }

  if (touches.length === 0) {
    // No detectable pinch: fall back to removing the whole defective face.
    return [notchBox(faceBounds, faceBounds)];
  }
  const clusters = clusterPoints(touches, CLUSTER_TOL);
  clusters.sort((a, b) => b.length - a.length);
  return clusters.map((cluster) => notchBox(pointsBounds(cluster), faceBounds));
}

/** Duplicate patches: identical bounds, one far smaller than the other. */
export function duplicateBounds(groups: Iterable<{ bounds: Bounds; areas: number[] }>): Bounds[] {
  const out: Bounds[] = [];
  for (const { bounds, areas } of groups) {
    if (areas.length < 2) continue;
    const min = Math.min(...areas);
    const max = Math.max(...areas);
    if (min <= 0 || max / min <= 5) continue;
    out.push({
      lo: [bounds.lo[0] - DUPLICATE_PAD, bounds.lo[1] - DUPLICATE_PAD, bounds.lo[2] - DUPLICATE_PAD],
      hi: [bounds.hi[0] + DUPLICATE_PAD, bounds.hi[1] + DUPLICATE_PAD, bounds.hi[2] + DUPLICATE_PAD],
    });
  }
  return out;
}

export function duplicateNotchBoxes(oc: OcctHealApi, shape: any): Bounds[] {
  const groups = new Map<string, { bounds: Bounds; areas: number[] }>();
  for (const face of facesOf(oc, shape)) {
    const bounds = boundsOf(oc, face);
    const key = [...bounds.lo, ...bounds.hi]
      .map((value) => value.toFixed(4))
      .join(',');
    const record = groups.get(key) ?? { bounds, areas: [] };
    record.areas.push(areaOf(oc, face));
    groups.set(key, record);
  }
  return duplicateBounds(groups.values());
}

/** Undirected key for a triangulation segment between two node indices. */
function segmentKey(x: number, y: number): string {
  return x < y ? `${x}:${y}` : `${y}:${x}`;
}

/** Segments used by exactly one triangle: the boundary of a face's mesh. */
function meshBoundaryKeys(triangulation: any): string[] {
  const incidence = new Map<string, number>();
  const triangleCount = triangulation.NbTriangles();
  for (let t = 1; t <= triangleCount; t++) {
    const triangle = triangulation.Triangle(t);
    const a = triangle.Value(1);
    const b = triangle.Value(2);
    const c = triangle.Value(3);
    for (const [x, y] of [
      [a, b],
      [b, c],
      [c, a],
    ] as [number, number][]) {
      const key = segmentKey(x, y);
      incidence.set(key, (incidence.get(key) ?? 0) + 1);
    }
  }
  const boundary: string[] = [];
  for (const [key, count] of incidence) if (count === 1) boundary.push(key);
  return boundary;
}

/** Triangulation segments covered by the face's own edge polygons. */
function coveredSegmentKeys(oc: OcctHealApi, edges: any[], handle: any, location: any): Set<string> {
  const covered = new Set<string>();
  for (const edge of edges) {
    const polygonHandle = oc.BRep_Tool.PolygonOnTriangulation_1(edge, handle, location);
    if (!polygonHandle || polygonHandle.IsNull?.()) continue;
    const polygon = polygonHandle.get ? polygonHandle.get() : polygonHandle;
    const nodes = polygon.NbNodes();
    let previous = polygon.Node(1);
    for (let i = 2; i <= nodes; i++) {
      const current = polygon.Node(i);
      covered.add(segmentKey(previous, current));
      previous = current;
    }
  }
  return covered;
}

function nearestSampleDistanceSq(point: Vec3, edgeSamples: Vec3[][]): number {
  let nearest = Infinity;
  for (const samples of edgeSamples) {
    for (const sample of samples) nearest = Math.min(nearest, distanceSq(point, sample));
  }
  return nearest;
}

/** Boundary segments that are neither covered by an edge polygon nor on the face border. */
function uncoveredSegments(
  oc: OcctHealApi,
  triangulation: any,
  meshBoundary: string[],
  covered: Set<string>,
  edges: any[],
): Vec3[][] {
  const nodePoint = (index: number): Vec3 => {
    const point = triangulation.Node(index);
    return [point.X(), point.Y(), point.Z()];
  };
  const uncovered: Vec3[][] = [];
  const edgeSamples = edges.map((edge) => sampleEdge(oc, edge, 16));
  for (const key of meshBoundary) {
    if (covered.has(key)) continue;
    const [a, b] = key.split(':').map(Number);
    const pa = nodePoint(a);
    const pb = nodePoint(b);
    const mid: Vec3 = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, (pa[2] + pb[2]) / 2];
    // A segment lying on the face border is a mesher representation
    // difference, not a gap. Only segments away from the border are holes.
    if (nearestSampleDistanceSq(mid, edgeSamples) > TOUCH_TOL * TOUCH_TOL) uncovered.push([pa, pb]);
  }
  return uncovered;
}

/** Notch box around one face's uncovered mesh-boundary segments, if any. */
function faceMeshGapBox(oc: OcctHealApi, face: any, location: any): Bounds | null {
  const handle = oc.BRep_Tool.Triangulation(face, location, 0);
  if (!handle || handle.IsNull?.()) return null;
  const triangulation = handle.get ? handle.get() : handle;
  if (!triangulation.NbTriangles()) return null;

  const meshBoundary = meshBoundaryKeys(triangulation);
  if (meshBoundary.length === 0) return null;

  const edges = edgesOf(oc, face);
  const covered = coveredSegmentKeys(oc, edges, handle, location);
  const uncovered = uncoveredSegments(oc, triangulation, meshBoundary, covered, edges);
  if (uncovered.length === 0) return null;

  return notchBox(pointsBounds(uncovered.flat()), boundsOf(oc, face));
}

/**
 * Find faces whose triangulation boundary is not covered by their own edge
 * polygons, and return a notch around the uncovered segments. A seam edge is
 * covered by its polygon, so only genuine gaps survive.
 */
export function meshGapNotchBoxes(oc: OcctHealApi, shape: any): Bounds[] {
  let mesh: any = null;
  try {
    mesh = new oc.BRepMesh_IncrementalMesh_2(shape, MESH_DEFLECTION, false, 0.5, true);
  } catch {
    return [];
  }
  const location = new oc.TopLoc_Location_1();
  const out: Bounds[] = [];
  try {
    for (const face of facesOf(oc, shape)) {
      const box = faceMeshGapBox(oc, face, location);
      if (box) out.push(box);
    }
  } finally {
    mesh?.delete?.();
    location.delete();
  }
  return out;
}
