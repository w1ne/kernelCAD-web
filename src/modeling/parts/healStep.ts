// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/healStep.ts
//
// Import-time B-rep normalization for STEP files.
//
// Third-party STEP files routinely carry topology that passes a coarse
// `BRepCheck_Analyzer` but breaks downstream consumers: split coplanar faces
// from re-exported booleans, duplicate faces left by a translator, and
// adjacent same-surface patches that tessellate into non-manifold edges
// (an edge shared by four triangles). The official CADGenBench validity gate
// rejects exactly that last class even though the solid is watertight, so a
// model that imports and renders fine can still be un-submittable.
//
// Two repair layers run here:
//
// 1. `ShapeUpgrade_UnifySameDomain` merges adjacent faces that lie on the same
//    surface and merges their edges. On a re-exported part this collapses the
//    split/duplicate patches back into one face, which removes the coincident
//    triangles that produced the four-triangle edge. It does not move geometry.
//
// 2. When the import carries a face that is invalid on its own, unification
//    cannot repair it. Two reconstruction strategies are used instead:
//
//    - A planar bow-tie face is split along a chord between two of its wire
//      vertices. Both halves must be valid and stay inside the original face's
//      extent. A bow-tie reports a signed area, so the halves' areas do not add
//      up geometrically and cannot be used as the acceptance test.
//    - A pinched non-planar face is excised locally: pairs of its edges that
//      touch (or come within 0.05 mm) mark the pinch. Each touch cluster is
//      removed with a small axis-aligned box cut, ordered largest cluster
//      first so the boolean always runs on a stabilised shape. A duplicate
//      face pair (identical bounding box, one patch far smaller) is cut the
//      same way. The cuts remove only the degenerate sliver; the resulting
//      notch is a clean transversal face and the solid stays watertight.
//
//    After those cuts the shape can still carry a triangulation defect that
//    `BRepCheck_Analyzer` cannot see (a face whose mesh boundary does not
//    follow its own edge polygons). The mesh pass finds exactly that: boundary
//    segments of a face's triangulation that are not covered by any of the
//    face's edge polygons. The gap is excised with the same local box cut.
//
// The per-face scan runs only when the whole-shape check fails, so a healthy
// import pays one `BRepCheck_Analyzer` pass and the unification attempt. Any
// OCCT throw, missing binding, or invalid result returns the untouched import:
// the heal must never make an import worse.

/* eslint-disable @typescript-eslint/no-explicit-any -- OCCT handles come from
   the dynamically typed opencascade.js bindings; `OcctHealApi` types the calls,
   and narrowing every handle would add no safety. */

import * as replicad from 'replicad';
import { getOC } from 'replicad';

export interface StepHealResult {
  /** Shape to hand to the backend: repaired/unified when the heal succeeded, otherwise the input. */
  shape: replicad.Shape3D;
  /** True when same-domain unification produced a valid replacement. */
  unified: boolean;
  /** True when invalid-topology reconstruction replaced the import. */
  repaired?: boolean;
}

type Vec3 = [number, number, number];

interface Bounds {
  lo: Vec3;
  hi: Vec3;
}

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
/**
 * Face unification is only attempted on imports up to this many faces.
 *
 * `ShapeUpgrade_UnifySameDomain` with `UnifyFaces=true` has pathological runtime
 * on some large B-spline-heavy solids in the OCCT wasm build: the 206 fixture
 * (637 faces, already gate-valid) did not finish in five minutes, while native
 * OCCT does it in under 0.1 s. Edge unification on the same shape finishes in
 * milliseconds. Large valid imports keep their same-domain patches — that does
 * not move geometry or break watertightness — instead of stalling the import.
 */
const MAX_FACE_UNIFY = 256;

function debug(...args: unknown[]): void {
  if ((globalThis as { __KCAD_HEAL_DEBUG__?: boolean }).__KCAD_HEAL_DEBUG__) {
    console.log('[heal]', ...args);
  }
}

type OcctHealApi = {
  BRepCheck_Analyzer: new (shape: unknown, geomControls: boolean, checkSubShape: boolean) => {
    IsValid_2(): boolean;
    delete(): void;
  };
  ShapeUpgrade_UnifySameDomain_2: new (
    shape: unknown,
    unifyEdges: boolean,
    unifyFaces: boolean,
    concatBSplines: boolean,
  ) => {
    Build(): void;
    Shape(): unknown;
    delete(): void;
  };
} & Record<string, any>;

/**
 * Normalize an imported STEP solid by merging same-domain faces/edges and, when
 * the file carries an invalid face, by reconstructing the defective topology.
 *
 * Safe by construction: any OCCT throw, a missing binding, or an invalid
 * repaired result returns the original shape with `unified: false`.
 */
export function healImportedStep(shape: replicad.Shape3D): StepHealResult {
  let oc: OcctHealApi;
  try {
    oc = getOC() as unknown as OcctHealApi;
  } catch {
    return { shape, unified: false };
  }
  if (
    typeof oc?.ShapeUpgrade_UnifySameDomain_2 !== 'function' ||
    typeof oc?.BRepCheck_Analyzer !== 'function'
  ) {
    return { shape, unified: false };
  }

  // The reconstruction path needs the boolean/topology bindings. A build that
  // only exposes unification keeps the historical behaviour.
  if (!canReconstruct(oc)) return unifyOnly(oc, shape);

  // A healthy solid needs no reconstruction; one whole-shape check is enough
  // to keep the common import path cheap.
  try {
    if (isValid(oc, shape.wrapped)) return unifyOnly(oc, shape);
  } catch {
    return unifyOnly(oc, shape);
  }

  try {
    const result = reconstruct(oc, shape);
    if (result) return result;
  } catch (error) {
    debug('reconstruct threw', error instanceof Error ? error.message : String(error));
    // fall through to the conservative path
  }
  return unifyOnly(oc, shape);
}

function canReconstruct(oc: OcctHealApi): boolean {
  const required = [
    'TopExp_Explorer_2',
    'TopoDS_Builder',
    'TopoDS_Shell',
    'TopoDS_Solid',
    'BRepAdaptor_Curve_2',
    'BRepAdaptor_Surface_2',
    'BRepExtrema_DistShapeShape_1',
    'BRepPrimAPI_MakeBox_4',
    'BRepAlgoAPI_Cut_3',
    'BRepBuilderAPI_MakeEdge_3',
    'BRepBuilderAPI_MakeWire_1',
    'BRepBuilderAPI_MakeFace_15',
    'BRepBuilderAPI_Sewing',
    'Bnd_Box_1',
    'BRepBndLib',
    'BRepGProp',
    'GProp_GProps_1',
    'gp_Pnt_3',
    'Message_ProgressRange_1',
    'TopLoc_Location_1',
    'TopoDS',
    'BRepMesh_IncrementalMesh_2',
    'BRep_Tool',
  ];
  if (!required.every((name) => name in oc)) {
    debug('missing bindings', required.filter((name) => !(name in oc)));
    return false;
  }
  if (
    typeof oc.TopoDS?.Face_1 !== 'function' ||
    typeof oc.TopoDS?.Edge_1 !== 'function' ||
    typeof oc.TopoDS?.Shell_1 !== 'function'
  ) {
    debug('missing TopoDS casts', {
      face: typeof oc.TopoDS?.Face_1,
      edge: typeof oc.TopoDS?.Edge_1,
      shell: typeof oc.TopoDS?.Shell_1,
    });
    return false;
  }
  return true;
}

function unifyOnly(oc: OcctHealApi, shape: replicad.Shape3D): StepHealResult {
  let unify: InstanceType<OcctHealApi['ShapeUpgrade_UnifySameDomain_2']> | undefined;
  let analyzer: InstanceType<OcctHealApi['BRepCheck_Analyzer']> | undefined;
  try {
    const unifyFaces = shape.faces.length <= MAX_FACE_UNIFY;
    debug('unify', { faces: shape.faces.length, unifyFaces });
    unify = new oc.ShapeUpgrade_UnifySameDomain_2(shape.wrapped, true, unifyFaces, false);
    unify.Build();
    const unified = unify.Shape();
    analyzer = new oc.BRepCheck_Analyzer(unified, true, true);
    if (!analyzer.IsValid_2()) return { shape, unified: false };
    const cast = replicad.cast(unified as never) as replicad.Shape3D;
    return { shape: cast, unified: true };
  } catch {
    return { shape, unified: false };
  } finally {
    analyzer?.delete();
    unify?.delete();
  }
}

function reconstruct(oc: OcctHealApi, shape: replicad.Shape3D): StepHealResult | null {
  let current: any = shape.wrapped;
  let changed = false;

  const initialFaces = facesOf(oc, current);
  const initialInvalid = initialFaces.filter((face) => !isValid(oc, face));
  debug('start', {
    faces: initialFaces.length,
    invalid: initialInvalid.length,
    planar: initialInvalid.filter((face) => isPlanar(oc, face)).length,
  });

  // 1. Planar bow-tie faces: split along a chord that preserves the area.
  for (let guard = 0; guard < 4; guard++) {
    const faces = facesOf(oc, current);
    const target = faces.find((face) => !isValid(oc, face) && isPlanar(oc, face));
    if (!target) break;
    debug('chord target', boundsOf(oc, target), areaOf(oc, target));
    const replacement = chordRepair(oc, target);
    debug('chord replacement', Boolean(replacement));
    if (!replacement) break;
    const rebuilt = buildSolid(
      oc,
      faces.filter((face) => !face.IsSame(target)).concat(replacement),
    );
    debug('chord solid', Boolean(rebuilt));
    if (!rebuilt) break;
    current = rebuilt;
    changed = true;
  }

  // 2. Pinched non-planar faces: excise each touch cluster.
  const remainingInvalid = facesOf(oc, current).filter((face) => !isValid(oc, face));
  const pinchBoxes: Bounds[] = [];
  for (const face of remainingInvalid) {
    if (isPlanar(oc, face)) continue;
    pinchBoxes.push(...pinchNotchBoxes(oc, face));
  }
  debug('pinch boxes', pinchBoxes.length, pinchBoxes);
  for (const box of pinchBoxes) {
    const cut = cutBox(oc, current, box);
    debug('pinch cut', Boolean(cut));
    if (cut) {
      current = cut;
      changed = true;
    }
  }

  // 3. Duplicate face pairs left by a translator (identical bounds, one patch
  //    far smaller): the small patch lies on top of the larger one and meshes
  //    into a four-triangle edge.
  if (changed && facesOf(oc, current).every((face) => isValid(oc, face))) {
    const duplicates = duplicateNotchBoxes(oc, current);
    debug('duplicate boxes', duplicates.length, duplicates);
    for (const box of duplicates) {
      const cut = cutBox(oc, current, box);
      debug('duplicate cut', Boolean(cut));
      if (cut) {
        current = cut;
        changed = true;
      }
    }
  }

  // 4. Mesh gaps: a face whose triangulation boundary is not covered by its
  //    own edge polygons leaves an open mesh even though the B-rep is valid.
  if (changed) {
    const gaps = meshGapNotchBoxes(oc, current);
    debug('mesh gap boxes', gaps.length, gaps);
    for (const box of gaps) {
      const cut = cutBox(oc, current, box);
      debug('mesh gap cut', Boolean(cut));
      if (cut) current = cut;
    }
  }

  debug('final', { changed, valid: isValid(oc, current) });
  if (!changed) return null;
  if (!isValid(oc, current)) return null;
  return {
    shape: replicad.cast(current as never) as replicad.Shape3D,
    unified: false,
    repaired: true,
  };
}

function facesOf(oc: OcctHealApi, shape: any): any[] {
  const out: any[] = [];
  const explorer = new oc.TopExp_Explorer_2(
    shape,
    oc.TopAbs_ShapeEnum.TopAbs_FACE,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
  );
  try {
    while (explorer.More()) {
      out.push(oc.TopoDS.Face_1(explorer.Current()));
      explorer.Next();
    }
  } finally {
    explorer.delete();
  }
  return out;
}

function edgesOf(oc: OcctHealApi, face: any): any[] {
  const out: any[] = [];
  const explorer = new oc.TopExp_Explorer_2(
    face,
    oc.TopAbs_ShapeEnum.TopAbs_EDGE,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
  );
  try {
    while (explorer.More()) {
      out.push(oc.TopoDS.Edge_1(explorer.Current()));
      explorer.Next();
    }
  } finally {
    explorer.delete();
  }
  return out;
}

function isValid(oc: OcctHealApi, shape: any): boolean {
  const analyzer = new oc.BRepCheck_Analyzer(shape, true, true);
  try {
    return analyzer.IsValid_2();
  } finally {
    analyzer.delete();
  }
}

function isPlanar(oc: OcctHealApi, face: any): boolean {
  const adapter = new oc.BRepAdaptor_Surface_2(face, true);
  try {
    const type = adapter.GetType();
    const plane = oc.GeomAbs_SurfaceType?.GeomAbs_Plane;
    if (!plane) return false;
    return type === plane || type?.value === plane?.value;
  } finally {
    adapter.delete();
  }
}

function boundsOf(oc: OcctHealApi, shape: any): Bounds {
  const box = new oc.Bnd_Box_1();
  oc.BRepBndLib.Add(shape, box, false);
  const min = box.CornerMin();
  const max = box.CornerMax();
  const out: Bounds = {
    lo: [min.X(), min.Y(), min.Z()],
    hi: [max.X(), max.Y(), max.Z()],
  };
  box.delete();
  return out;
}

function areaOf(oc: OcctHealApi, face: any): number {
  const props = new oc.GProp_GProps_1();
  try {
    oc.BRepGProp.SurfaceProperties_1(face, props, false, false);
    return props.Mass();
  } finally {
    props.delete();
  }
}

function isReversedOrientation(oc: OcctHealApi, edge: any): boolean {
  const orientation =
    typeof edge.Orientation === 'function'
      ? edge.Orientation()
      : typeof edge.Orientation_1 === 'function'
        ? edge.Orientation_1()
        : edge.Orientation;
  const reversed = oc.TopAbs_Orientation?.TopAbs_REVERSED;
  if (reversed !== undefined) {
    return orientation === reversed || orientation?.value === reversed?.value;
  }
  // TopAbs_FORWARD=0, TopAbs_REVERSED=1, TopAbs_INTERNAL=2, TopAbs_EXTERNAL=3.
  return orientation?.value === 1;
}

/**
 * Sample an edge in wire traversal order. `BRepAdaptor_Curve` always walks the
 * underlying curve, so a REVERSED edge is flipped to match the wire.
 */
function sampleEdge(oc: OcctHealApi, edge: any, count: number): Vec3[] {
  const curve = new oc.BRepAdaptor_Curve_2(edge);
  try {
    const first = curve.FirstParameter();
    const last = curve.LastParameter();
    const out: Vec3[] = [];
    const span = last - first;
    for (let i = 0; i < count; i++) {
      const point = curve.Value(first + (span * i) / (count - 1));
      out.push([point.X(), point.Y(), point.Z()]);
    }
    if (isReversedOrientation(oc, edge)) out.reverse();
    return out;
  } finally {
    curve.delete();
  }
}

function distanceSq(a: Vec3, b: Vec3): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return dx * dx + dy * dy + dz * dz;
}

/**
 * Order the face edges into a single closed chain by shared endpoints.
 *
 * `TopExp_Explorer` does not guarantee traversal order — on the bow-tie face
 * used by the 202 fixture it lists e0,e1,e2,e3,e4 while the actual loop is
 * e0,e4,e3,e2,e1. Walking by shared endpoints recovers the wire order, and the
 * edge is reversed when the chain needs it.
 */
function wireChain(
  oc: OcctHealApi,
  face: any,
): { edges: any[]; vertices: Vec3[] } | null {
  const edges = edgesOf(oc, face);
  if (edges.length < 3) return null;
  const ends = edges.map((edge) => sampleEdge(oc, edge, 2));
  const used = new Array<boolean>(edges.length).fill(false);
  const chainEdges: any[] = [edges[0]];
  const vertices: Vec3[] = [ends[0][0]];
  let current = ends[0][1];
  used[0] = true;

  for (let step = 1; step < edges.length; step++) {
    let found = -1;
    let reverse = false;
    let best = 1e-10;
    for (let k = 1; k < edges.length; k++) {
      if (used[k]) continue;
      const startDistance = distanceSq(ends[k][0], current);
      const endDistance = distanceSq(ends[k][1], current);
      if (startDistance <= best) {
        best = startDistance;
        found = k;
        reverse = false;
      }
      if (endDistance <= best) {
        best = endDistance;
        found = k;
        reverse = true;
      }
    }
    if (found < 0) return null;
    used[found] = true;
    vertices.push(current);
    const [start, end] = ends[found];
    chainEdges.push(reverse ? oc.TopoDS.Edge_1(edges[found].Reversed()) : edges[found]);
    current = reverse ? start : end;
  }

  debug('wire close', { edges: edges.length, gap: distanceSq(current, vertices[0]) });
  if (distanceSq(current, vertices[0]) > 1e-6) return null;
  return { edges: chainEdges, vertices };
}

function makeEdge(oc: OcctHealApi, from: Vec3, to: Vec3): any | null {
  const maker = new oc.BRepBuilderAPI_MakeEdge_3(
    new oc.gp_Pnt_3(from[0], from[1], from[2]),
    new oc.gp_Pnt_3(to[0], to[1], to[2]),
  );
  try {
    return maker.IsDone() ? maker.Edge() : null;
  } finally {
    maker.delete();
  }
}

function makeWire(oc: OcctHealApi, edges: any[]): any | null {
  const maker = new oc.BRepBuilderAPI_MakeWire_1();
  try {
    for (const edge of edges) maker.Add_1(edge);
    return maker.IsDone() ? maker.Wire() : null;
  } finally {
    maker.delete();
  }
}

function makeFace(oc: OcctHealApi, wire: any): any | null {
  const maker = new oc.BRepBuilderAPI_MakeFace_15(wire, true);
  try {
    return maker.IsDone() ? maker.Face() : null;
  } finally {
    maker.delete();
  }
}

/**
 * Split a planar bow-tie face along the first chord whose two halves are both
 * valid and whose areas add up to the original face area.
 */
function chordRepair(oc: OcctHealApi, face: any): any[] | null {
  const faceBounds = boundsOf(oc, face);
  const chain = wireChain(oc, face);
  if (!chain) return null;
  const { edges, vertices } = chain;
  const count = edges.length;
  const within = (candidate: any): boolean => {
    const bounds = boundsOf(oc, candidate);
    return (
      bounds.lo[0] >= faceBounds.lo[0] - 1e-3 &&
      bounds.lo[1] >= faceBounds.lo[1] - 1e-3 &&
      bounds.lo[2] >= faceBounds.lo[2] - 1e-3 &&
      bounds.hi[0] <= faceBounds.hi[0] + 1e-3 &&
      bounds.hi[1] <= faceBounds.hi[1] + 1e-3 &&
      bounds.hi[2] <= faceBounds.hi[2] + 1e-3
    );
  };
  for (let i = 0; i < count; i++) {
    for (let j = i + 2; j < count; j++) {
      if (i === 0 && j === count - 1) continue;
      const chord = makeEdge(oc, vertices[j], vertices[i]);
      if (!chord) continue;
      const chordReversed = oc.TopoDS.Edge_1(chord.Reversed());
      const firstWire = makeWire(oc, [
        ...edges.slice(i, j),
        chord,
      ]);
      const secondWire = makeWire(oc, [
        ...edges.slice(j),
        ...edges.slice(0, i),
        chordReversed,
      ]);
      if (!firstWire || !secondWire) continue;
      const first = makeFace(oc, firstWire);
      const second = makeFace(oc, secondWire);
      if (!first || !second) continue;
      const firstValid = isValid(oc, first);
      const secondValid = isValid(oc, second);
      debug('chord pair', i, j, { firstValid, secondValid });
      if (!firstValid || !secondValid) continue;
      // A bow-tie face reports a signed area, so the halves do not add up to
      // the original. The chord must simply stay inside the face's extent.
      if (within(first) && within(second)) return [first, second];
    }
  }
  return null;
}

/** Sew a face list back into a solid. */
function buildSolid(oc: OcctHealApi, faces: any[]): any | null {
  const builder = new oc.TopoDS_Builder();
  const shell = new oc.TopoDS_Shell();
  builder.MakeShell(shell);
  for (const face of faces) builder.Add(shell, face);
  shell.Closed_2(true);

  const sewing = new oc.BRepBuilderAPI_Sewing(1e-6, true, true, true, false);
  try {
    sewing.SetSameParameterMode(false);
    sewing.Add(shell);
    sewing.Perform(new oc.Message_ProgressRange_1());
    const sewn = sewing.SewedShape();
    const outer = oc.TopoDS.Shell_1(sewn);
    const solid = new oc.TopoDS_Solid();
    builder.MakeSolid(solid);
    builder.Add(solid, outer);
    return isValid(oc, solid) ? solid : null;
  } finally {
    sewing.delete();
  }
}

function clusterPoints(points: Vec3[], tolerance: number): Vec3[][] {
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

function pointsBounds(points: Vec3[]): Bounds {
  const lo: Vec3 = [Infinity, Infinity, Infinity];
  const hi: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const p of points) {
    for (let k = 0; k < 3; k++) {
      if (p[k] < lo[k]) lo[k] = p[k];
      if (p[k] > hi[k]) hi[k] = p[k];
    }
  }
  return { lo, hi };
}

/** Turn a pinch region into a notch box, extending it to nearby face borders. */
function notchBox(region: Bounds, face: Bounds): Bounds {
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

function shareEndpoint(a: Vec3[], b: Vec3[]): boolean {
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
function pinchNotchBoxes(oc: OcctHealApi, face: any): Bounds[] {
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
function duplicateBounds(groups: Iterable<{ bounds: Bounds; areas: number[] }>): Bounds[] {
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

function duplicateNotchBoxes(oc: OcctHealApi, shape: any): Bounds[] {
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

function cutBox(oc: OcctHealApi, shape: any, box: Bounds): any | null {
  let tool: any | null = null;
  try {
    const from = new oc.gp_Pnt_3(box.lo[0], box.lo[1], box.lo[2]);
    const to = new oc.gp_Pnt_3(box.hi[0], box.hi[1], box.hi[2]);
    tool = new oc.BRepPrimAPI_MakeBox_4(from, to).Shape();
    const cut = new oc.BRepAlgoAPI_Cut_3(shape, tool, new oc.Message_ProgressRange_1());
    try {
      if (!cut.IsDone()) return null;
      const result = cut.Shape();
      if (!result || result.IsNull()) return null;
      if (facesOf(oc, result).length === 0) return null;
      return result;
    } finally {
      cut.delete();
    }
  } catch {
    return null;
  } finally {
    tool?.delete?.();
  }
}

/**
 * Find faces whose triangulation boundary is not covered by their own edge
 * polygons, and return a notch around the uncovered segments. A seam edge is
 * covered by its polygon, so only genuine gaps survive.
 */
function meshGapNotchBoxes(oc: OcctHealApi, shape: any): Bounds[] {
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
      const handle = oc.BRep_Tool.Triangulation(face, location, 0);
      if (!handle || handle.IsNull?.()) continue;
      const triangulation = handle.get ? handle.get() : handle;
      const triangleCount = triangulation.NbTriangles();
      if (!triangleCount) continue;

      const incidence = new Map<string, number>();
      const nodePoint = (index: number): Vec3 => {
        const point = triangulation.Node(index);
        return [point.X(), point.Y(), point.Z()];
      };
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
          const key = x < y ? `${x}:${y}` : `${y}:${x}`;
          incidence.set(key, (incidence.get(key) ?? 0) + 1);
        }
      }

      const meshBoundary: string[] = [];
      for (const [key, count] of incidence) if (count === 1) meshBoundary.push(key);
      if (meshBoundary.length === 0) continue;

      const covered = new Set<string>();
      const edges = edgesOf(oc, face);
      for (const edge of edges) {
        const polygonHandle = oc.BRep_Tool.PolygonOnTriangulation_1(edge, handle, location);
        if (!polygonHandle || polygonHandle.IsNull?.()) continue;
        const polygon = polygonHandle.get ? polygonHandle.get() : polygonHandle;
        const nodes = polygon.NbNodes();
        let previous = polygon.Node(1);
        for (let i = 2; i <= nodes; i++) {
          const current = polygon.Node(i);
          covered.add(previous < current ? `${previous}:${current}` : `${current}:${previous}`);
          previous = current;
        }
      }

      const uncovered: Vec3[][] = [];
      const edgeSamples = edges.map((edge) => sampleEdge(oc, edge, 16));
      for (const key of meshBoundary) {
        if (covered.has(key)) continue;
        const [a, b] = key.split(':').map(Number);
        const pa = nodePoint(a);
        const pb = nodePoint(b);
        const mid: Vec3 = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, (pa[2] + pb[2]) / 2];
        let nearest = Infinity;
        for (const samples of edgeSamples) {
          for (const sample of samples) nearest = Math.min(nearest, distanceSq(mid, sample));
        }
        // A segment lying on the face border is a mesher representation
        // difference, not a gap. Only segments away from the border are holes.
        if (nearest > TOUCH_TOL * TOUCH_TOL) uncovered.push([pa, pb]);
      }
      if (uncovered.length === 0) continue;

      out.push(notchBox(pointsBounds(uncovered.flat()), boundsOf(oc, face)));
    }
  } finally {
    mesh?.delete?.();
    location.delete();
  }
  return out;
}

/**
 * Pure geometry rules used by the reconstruction. Exposed for regression
 * tests only; the OCCT-facing flow above is the public entry point.
 */
export const __healTest = {
  clusterPoints,
  pointsBounds,
  notchBox,
  duplicateBounds,
  shareEndpoint,
  distanceSq,
};
