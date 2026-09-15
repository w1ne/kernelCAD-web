// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/sketchFromShapeOps.ts
//
// OCCT-side half of "derive a sketch from a solid". Three derivations:
//   - section:    BRepAlgoAPI_Section of the solid with a plane face.
//   - face:       outer + inner boundary wires of a planar face.
//   - silhouette: HLR visible outline along an orthographic direction.
//
// Each returns closed loops of `ProjectedSegment`s in a 2D frame, ready to be
// turned into `SketchCommand[]` by sketchFromShape.ts. The edge → 2D
// projection and arc reconstruction live in sketchFromShape.ts so this file
// only deals with OCCT handles and dispatch.

import { getOC, cast, ProjectionCamera, type AnyShape } from 'replicad';
import type { Edge } from 'replicad';
import type { OcctBackend } from './occtBackend';
import {
  chainSegments,
  edgeToSegments,
  extractLoops,
  segLength,
  segmentsSignedArea,
  type ExtractedLoops,
  type PlaneFrame,
  type ProjectedSegment,
  type Pt2,
} from './sketchFromShape';
import { projectShapeForDrawing } from './drawingProjection';

/** Wrap a raw `TopoDS_Shape`'s edges as replicad `Edge`s. */
function edgesOfShape(shape: unknown): Edge[] {
  return (cast(shape as Parameters<typeof cast>[0]) as AnyShape as unknown as { edges: Edge[] }).edges;
}

function collectSegments(edges: readonly Edge[], frame: PlaneFrame, tol: number): ProjectedSegment[] {
  const segs: ProjectedSegment[] = [];
  for (const e of edges) {
    for (const s of edgeToSegments(e, frame, tol)) {
      if (segLength(s) > 1e-9 || (s.bulge ?? 0) !== 0) segs.push(s);
    }
  }
  return segs;
}

/**
 * Exact planar cross-section of `backend` with `frame`'s plane, returned as
 * closed loops. A large square face is built on the plane and intersected with
 * the solid via `BRepAlgoAPI_Section`; the resulting edges are projected into
 * the frame and chained.
 */
export function sectionLoops(
  backend: OcctBackend,
  frame: PlaneFrame,
  opts: { curveTolerance?: number; chainTolerance?: number } = {},
): ExtractedLoops {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const bb = backend.boundingBox();
  const diag = Math.hypot(
    bb.max[0] - bb.min[0],
    bb.max[1] - bb.min[1],
    bb.max[2] - bb.min[2],
  ) || 1;
  const half = diag * 1.5 + 100;

  const origin = new oc.gp_Pnt_3(frame.origin[0], frame.origin[1], frame.origin[2]);
  const normal = new oc.gp_Dir_4(frame.normal[0], frame.normal[1], frame.normal[2]);
  const xDir = new oc.gp_Dir_4(frame.u[0], frame.u[1], frame.u[2]);
  const ax3 = new oc.gp_Ax3_3(origin, normal, xDir);
  const pln = new oc.gp_Pln_2(ax3);
  const faceBuilder = new oc.BRepBuilderAPI_MakeFace_9(pln, -half, half, -half, half);
  const planeFace = faceBuilder.Face();

  const section = new oc.BRepAlgoAPI_Section_3(
    backend.getReplicadShape().wrapped,
    planeFace,
    false,
  );
  try {
    section.ComputePCurveOn1(true);
    section.Approximation(true);
    section.Build(new oc.Message_ProgressRange_1());
    if (!section.IsDone()) {
      throw new Error('sketchFromShape: BRepAlgoAPI_Section failed to build');
    }
    return extractLoops(edgesOfShape(section.Shape()), frame, opts);
  } finally {
    section.delete();
    faceBuilder.delete();
    pln.delete();
    ax3.delete();
    xDir.delete();
    normal.delete();
    origin.delete();
  }
}

export interface FaceBoundaryLoops {
  outer: ProjectedSegment[];
  holes: ProjectedSegment[][];
  openChains: Array<{ start: Pt2; end: Pt2 }>;
}

/**
 * Outer + inner boundary of a planar `face` as projected loops. The largest
 * closed loop is the outer boundary; the rest are holes.
 *
 * The face's wires cannot be trusted to be split cleanly: a planar face
 * produced by a 2D boolean (and the top face of a drilled body) is often
 * stored as ONE wire whose edges include a closed circle — the hole circle is
 * embedded in the same wire as the outer square, joined by a zero-width seam.
 * `Face.innerWires()` therefore reports zero holes on exactly the faces an
 * agent most wants to sketch. Walking every edge and letting the chainer
 * separate disjoint loops recovers the outer boundary and the holes
 * regardless of how OCCT chose to sew the wire.
 */
export function faceLoops(
  face: AnyShape,
  frame: PlaneFrame,
  opts: { curveTolerance?: number; chainTolerance?: number } = {},
): FaceBoundaryLoops {
  const tol = opts.curveTolerance ?? 0.01;
  const chainTol = opts.chainTolerance ?? 1e-4;
  const replicadFace = face as unknown as { wires: Array<{ edges: Edge[] }>; edges: Edge[] };
  const edges: Edge[] = [];
  for (const w of replicadFace.wires ?? []) {
    for (const e of w.edges ?? []) edges.push(e);
  }
  if (edges.length === 0 && replicadFace.edges) {
    edges.push(...replicadFace.edges);
  }

  const segs = collectSegments(edges, frame, tol);
  const { loops, openChains } = chainSegments(segs, chainTol);
  // Rank by absolute area: index 0 is the outer boundary, the rest are holes.
  // The exact signed-area helper includes arc caps, so a hole emitted as two
  // semicircles ranks by its true πr², not by its zero chord area.
  const withArea = loops.map((l) => ({ l, a: Math.abs(segmentsSignedArea(l)) }));
  withArea.sort((x, y) => y.a - x.a);
  const nonDegenerate = withArea.filter((x) => x.a > 1e-6 || x.l.length >= 3);
  return {
    outer: nonDegenerate[0]?.l ?? [],
    holes: nonDegenerate.slice(1).map((x) => x.l),
    openChains,
  };
}

export interface SilhouetteLoops {
  loops: ProjectedSegment[][];
  openChains: Array<{ start: Pt2; end: Pt2 }>;
}

/**
 * Orthographic silhouette of `backend` viewed along `frame.normal`, as closed
 * loops in the frame's 2D coordinates. Uses OCCT HLR (visible sharp + outline
 * + smooth contours); straight edges stay exact, curved contours are HLR's own
 * deterministic discretization.
 *
 * Coordinates are shifted so the projected 2D bounding-box centre lands at the
 * frame origin — an orthographic outline has no absolute placement, and a
 * centred sketch is what a subsequent extrude wants.
 */
export function silhouetteLoops(
  backend: OcctBackend,
  frame: PlaneFrame,
  opts: { curveTolerance?: number } = {},
): SilhouetteLoops {
  // Direction points from object to viewer; xAxis is screen-right. Use the
  // frame's normal and u so the HLR 2D output already matches (u, v) up to a
  // sign, which we normalise by projecting through `frame` below.
  const cam = new ProjectionCamera([0, 0, 0], frame.normal, frame.u);
  const edges = projectShapeForDrawing(backend.getReplicadShape(), cam, {
    withHidden: false,
    curveTolerance: opts.curveTolerance ?? 0.02,
  });

  const polylines: Array<Array<readonly [number, number]>> = [
    ...edges.visibleSharp,
    ...edges.visibleOutline,
    ...edges.visibleSmooth,
  ];

  // HLR emits coordinates in the camera frame, where screen-up is
  // `normal × u` (matching `viewBasis`). The frame's `v` is `normal × u` too,
  // so the raw (x, y) already equals (u, v). Normalise the placement by
  // recentring on the combined bbox.
  const segs: ProjectedSegment[] = [];
  for (const pl of polylines) {
    for (let i = 1; i < pl.length; i++) {
      segs.push({ x0: pl[i - 1][0], y0: pl[i - 1][1], x1: pl[i][0], y1: pl[i][1] });
    }
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of segs) {
    for (const [x, y] of [[s.x0, s.y0], [s.x1, s.y1]] as Pt2[]) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  const cx = Number.isFinite(minX) ? (minX + maxX) / 2 : 0;
  const cy = Number.isFinite(minY) ? (minY + maxY) / 2 : 0;
  const centred = segs.map((s) => ({
    x0: s.x0 - cx, y0: s.y0 - cy, x1: s.x1 - cx, y1: s.y1 - cy,
  }));
  const res = chainSegments(centred, 1e-3);
  return { loops: res.loops, openChains: res.openChains };
}
