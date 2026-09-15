// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/sketchFromShape.ts
//
// Turn raw OCCT curves (the output of a section, a face boundary walk, or an
// HLR projection) into the repo's canonical `SketchCommand[]` representation,
// so a derived 2D profile is indistinguishable downstream from a hand-authored
// `path().moveTo(...).close()`.
//
// WHY THIS EXISTS
// ---------------
// `lib.fromDXF` / `lib.fromSVG` already prove the contract: an imported
// profile IS a sketch (`kind: 'sketch'`, `metadata.commands`). The missing
// half was going the other way — starting from a solid and recovering a
// reusable 2D profile. This module is the shared back end for
// `shape.sectionSketch`, `shape.faceSketch`, and `shape.silhouette`.
//
// ARCS STAY ARCS
// --------------
// A circular OCCT edge that lies in the target plane is emitted as an exact
// `bulgeArc` command (the same DXF encoding `lib.fromDXF` uses), never as a
// sampled polyline: a sectioned cylinder hole becomes two semicircles, and an
// extruded gasket from that section keeps its true radius. Only curves with no
// exact command form (B-splines, ellipses, non-planar circles) are flattened,
// under an explicit `curveTolerance`.
//
// LOOP CHAINING
// -------------
// Section and face-boundary edges arrive unordered. They are chained by
// matching projected endpoints within `tolerance`; edges are flipped as
// needed. A chain that does not close back onto its start is reported with
// both dangling endpoints, never silently closed.

import { getOC } from 'replicad';
import type { Edge } from 'replicad';
import type { SketchCommand } from '../../../shared/capture/sketchCommand';
import { toParam } from '../../../shared/runtime/editableHelpers';

export type Vec3 = [number, number, number];
export type Pt2 = [number, number];

/** Orthonormal 2D frame for placing derived geometry. `u`/`v` are the in-plane
 *  axes; a world point `p` projects to `[ (p-origin)·u, (p-origin)·v ]`. */
export interface PlaneFrame {
  origin: Vec3;
  normal: Vec3;
  u: Vec3;
  v: Vec3;
}

const dot3 = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const cross3 = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

const norm3 = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]);
  return l > 0 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 0];
};

/** Project a world point into the frame's 2D coordinates. */
export function projectToFrame(frame: PlaneFrame, p: Vec3): Pt2 {
  const d: Vec3 = [p[0] - frame.origin[0], p[1] - frame.origin[1], p[2] - frame.origin[2]];
  return [dot3(d, frame.u), dot3(d, frame.v)];
}

/**
 * Build an orthonormal frame from an origin + normal. `uHint` biases the
 * in-plane X axis (defaults to world +X, falling back to +Y when the normal is
 * nearly parallel to it) so a section on a cardinal plane lands in the
 * intuitive orientation.
 */
export function makePlaneFrame(origin: Vec3, normal: Vec3, uHint?: Vec3): PlaneFrame {
  const n = norm3(normal);
  let u: Vec3;
  if (uHint) {
    u = norm3(cross3(n, cross3(uHint, n)));
    if (Math.hypot(u[0], u[1], u[2]) < 1e-9) {
      u = norm3(cross3(Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0], n));
    }
  } else {
    u = norm3(cross3(Math.abs(n[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0], n));
    if (Math.hypot(u[0], u[1], u[2]) < 1e-9) u = norm3(cross3([0, 1, 0], n));
  }
  const v = norm3(cross3(n, u));
  return { origin, normal: n, u, v };
}

/** Canonical frames for the cardinal planes, at an optional offset. */
export function cardinalFrame(plane: 'xy' | 'xz' | 'yz', offset: number): PlaneFrame {
  switch (plane) {
    case 'xy': return { origin: [0, 0, offset], normal: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] };
    case 'xz': return { origin: [0, offset, 0], normal: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1] };
    case 'yz': return { origin: [offset, 0, 0], normal: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] };
  }
}

/** A single projected edge, reduced to 2D endpoints plus an optional exact arc. */
export interface ProjectedSegment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** DXF bulge factor for an exact circular arc; 0/undefined for a line. */
  bulge?: number;
}

const EPS = 1e-9;

const asVec = (p: { x: number; y: number; z: number }): Vec3 => [p.x, p.y, p.z];

/**
 * Exact DXF bulge for the circular arc that runs from `a` to `b` through `m`,
 * all in the 2D frame. Returns `null` when the three points are collinear.
 *
 * The sign follows the frame's handedness: a counter-clockwise sweep is
 * positive (matching `path().bulgeArc`). Major arcs (|bulge| > 1) fall out
 * naturally because the sweep is chosen to actually pass through `m`.
 */
export function bulgeThroughThreePoints(a: Pt2, m: Pt2, b: Pt2): number | null {
  const d = 2 * (a[0] * (m[1] - b[1]) + m[0] * (b[1] - a[1]) + b[0] * (a[1] - m[1]));
  if (Math.abs(d) < 1e-12) return null; // collinear
  const a2 = a[0] * a[0] + a[1] * a[1];
  const m2 = m[0] * m[0] + m[1] * m[1];
  const b2 = b[0] * b[0] + b[1] * b[1];
  const cx = (a2 * (m[1] - b[1]) + m2 * (b[1] - a[1]) + b2 * (a[1] - m[1])) / d;
  const cy = (a2 * (b[0] - m[0]) + m2 * (a[0] - b[0]) + b2 * (m[0] - a[0])) / d;
  const ang = (p: Pt2): number => Math.atan2(p[1] - cy, p[0] - cx);
  const a0 = ang(a);
  const am = ang(m);
  const a1 = ang(b);
  const norm = (x: number): number => {
    let y = x;
    while (y <= -Math.PI) y += 2 * Math.PI;
    while (y > Math.PI) y -= 2 * Math.PI;
    return y;
  };
  const ccwToMid = norm(am - a0);
  const ccwToEnd = norm(a1 - a0);
  // Sweep CCW from a to b if the midpoint is reached before the end (both in
  // [0, 2π)); otherwise the arc runs clockwise.
  let sweep: number;
  if (ccwToMid > 0 && ccwToMid < ccwToEnd) {
    sweep = ccwToEnd;
  } else {
    sweep = ccwToEnd - 2 * Math.PI;
  }
  return Math.tan(sweep / 4);
}

/**
 * Convert one replicad `Edge` to one or more projected segments.
 *
 * - `LINE`: a single line segment.
 * - `CIRCLE` whose plane is parallel to the target frame (or an HLR 2D edge,
 *   which always lies in the frame): a single exact `bulgeArc`.
 * - Anything else (B-spline, ellipse, non-coplanar circle): sampled.
 */
export function edgeToSegments(edge: Edge, frame: PlaneFrame, curveTolerance: number): ProjectedSegment[] {
  const start2 = projectToFrame(frame, asVec(edge.startPoint));
  const end2 = projectToFrame(frame, asVec(edge.endPoint));
  const type = edge.geomType;

  if (type === 'CIRCLE') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oc = getOC() as any;
    const adaptor = new oc.BRepAdaptor_Curve_2(edge.wrapped);
    try {
      const circ = adaptor.Circle();
      const axis = circ.Axis().Direction();
      const axisV: Vec3 = [axis.X(), axis.Y(), axis.Z()];
      const parallel = Math.abs(Math.abs(dot3(norm3(axisV), frame.normal)) - 1) < 1e-6;
      if (parallel) {
        const closed = Math.hypot(end2[0] - start2[0], end2[1] - start2[1]) < 1e-6;
        if (closed) {
          // Full circle: split into two exact semicircles at the antipode.
          // The traversal sign is decided by the projected tangent at the
          // start relative to the radial direction — this is the only
          // orientation information OCCT gives for a closed edge (start and
          // end coincide), and it is frame-correct by construction.
          const u0 = adaptor.FirstParameter();
          const u1 = adaptor.LastParameter();
          const p0 = new oc.gp_Pnt_1();
          const p1 = new oc.gp_Pnt_1();
          const v0 = new oc.gp_Vec_1();
          adaptor.D1(u0, p0, v0);
          adaptor.D0((u0 + u1) / 2, p1);
          const startP: Vec3 = [p0.X(), p0.Y(), p0.Z()];
          const midP: Vec3 = [p1.X(), p1.Y(), p1.Z()];
          const tangent3: Vec3 = [v0.X(), v0.Y(), v0.Z()];
          const start2b = projectToFrame(frame, startP);
          const mid2 = projectToFrame(frame, midP);
          const tangent2: Pt2 = [
            dot3(tangent3, frame.u),
            dot3(tangent3, frame.v),
          ];
          const radial: Pt2 = [start2b[0] - (start2b[0] + mid2[0]) / 2, start2b[1] - (start2b[1] + mid2[1]) / 2];
          const cross = radial[0] * tangent2[1] - radial[1] * tangent2[0];
          const sign = cross >= 0 ? 1 : -1;
          return [
            { x0: start2b[0], y0: start2b[1], x1: mid2[0], y1: mid2[1], bulge: sign },
            { x0: mid2[0], y0: mid2[1], x1: start2b[0], y1: start2b[1], bulge: sign },
          ];
        }
        // Open arc: reconstruct the exact arc directly in the 2D frame from
        // three projected points. The frame's handedness — not OCCT's
        // parameter direction — decides the bulge sign, and major vs minor is
        // decided by where the midpoint lands.
        const mid2 = projectToFrame(frame, asVec(edge.pointAt(0.5)));
        const bulge = bulgeThroughThreePoints(start2, mid2, end2);
        if (bulge !== null) {
          return [{ x0: start2[0], y0: start2[1], x1: end2[0], y1: end2[1], bulge }];
        }
      }
    } finally {
      adaptor.delete();
    }
  }

  if (type === 'LINE') {
    return [{ x0: start2[0], y0: start2[1], x1: end2[0], y1: end2[1] }];
  }

  // Generic sampling: a curve with no exact command form (B-spline, ellipse,
  // non-coplanar circle). The step count derives from the projected chord
  // length and the requested tolerance; a CLOSED curve has zero chord, so it
  // gets a fixed high-resolution sample instead.
  const closedGeneric = Math.hypot(end2[0] - start2[0], end2[1] - start2[1]) < 1e-6;
  const chord = Math.hypot(end2[0] - start2[0], end2[1] - start2[1]);
  const n = closedGeneric
    ? 64
    : Math.max(2, Math.min(720, Math.ceil(Math.PI * Math.sqrt(Math.max(chord, 1e-6) / (8 * curveTolerance)))));
  const out: ProjectedSegment[] = [];
  let prev = start2;
  for (let i = 1; i <= n; i++) {
    const cur = projectToFrame(frame, asVec(edge.pointAt(i / n)));
    out.push({ x0: prev[0], y0: prev[1], x1: cur[0], y1: cur[1] });
    prev = cur;
  }
  return out;
}

export function segLength(s: ProjectedSegment): number {
  return Math.hypot(s.x1 - s.x0, s.y1 - s.y0);
}

interface LoopChain {
  segments: ProjectedSegment[];
  area: number;
}

function flipSegment(s: ProjectedSegment): ProjectedSegment {
  return { x0: s.x1, y0: s.y1, x1: s.x0, y1: s.y0, bulge: s.bulge !== undefined ? -s.bulge : undefined };
}

/**
 * Chain unordered projected segments into closed loops by endpoint matching.
 * Segments are flipped when necessary. Open chains are returned with their
 * dangling start/end so the caller can raise a diagnostic.
 */
export function chainSegments(
  segments: ProjectedSegment[],
  tolerance = 1e-4,
): { loops: ProjectedSegment[][]; openChains: Array<{ start: Pt2; end: Pt2 }> } {
  const remaining = segments.slice();
  const loops: ProjectedSegment[][] = [];
  const openChains: Array<{ start: Pt2; end: Pt2 }> = [];
  const near = (a: Pt2, b: Pt2): boolean => Math.hypot(a[0] - b[0], a[1] - b[1]) <= tolerance;

  while (remaining.length > 0) {
    const seed = remaining.shift()!;
    const chain: ProjectedSegment[] = [seed];
    let head: Pt2 = [seed.x0, seed.y0];
    let tail: Pt2 = [seed.x1, seed.y1];
    let extended = true;
    while (extended) {
      extended = false;
      for (let i = 0; i < remaining.length; i++) {
        const s = remaining[i];
        const sStart: Pt2 = [s.x0, s.y0];
        const sEnd: Pt2 = [s.x1, s.y1];
        if (near(tail, sStart)) {
          chain.push(s); tail = sEnd; remaining.splice(i, 1); extended = true; break;
        }
        if (near(tail, sEnd)) {
          chain.push(flipSegment(s)); tail = sStart; remaining.splice(i, 1); extended = true; break;
        }
        if (near(head, sEnd)) {
          chain.unshift(s); head = sStart; remaining.splice(i, 1); extended = true; break;
        }
        if (near(head, sStart)) {
          chain.unshift(flipSegment(s)); head = sEnd; remaining.splice(i, 1); extended = true; break;
        }
      }
    }
    if (near(head, tail)) {
      loops.push(chain);
    } else if (chain.length > 1 || segLength(chain[0]) > tolerance) {
      openChains.push({ start: head, end: tail });
    }
  }
  return { loops, openChains };
}

/** Emit `SketchCommand[]` for a closed chain. */
export function loopToCommands(loop: ProjectedSegment[]): SketchCommand[] {
  if (loop.length === 0) return [];
  const cmds: SketchCommand[] = [
    { kind: 'moveTo', x: toParam(loop[0].x0, 'mm'), y: toParam(loop[0].y0, 'mm') },
  ];
  for (const s of loop) {
    const b = s.bulge ?? 0;
    if (Math.abs(b) < 1e-12) {
      cmds.push({ kind: 'lineTo', x: toParam(s.x1, 'mm'), y: toParam(s.y1, 'mm') });
    } else {
      cmds.push({ kind: 'bulgeArc', x: toParam(s.x1, 'mm'), y: toParam(s.y1, 'mm'), bulge: toParam(b, 'unitless') });
    }
  }
  cmds.push({ kind: 'close' });
  return cmds;
}

/** Radius + included angle encoded by a bulge on a chord of the given length.
 *  DXF: bulge = tan(θ/4) where θ is the signed included angle, so θ = 4·atan(b). */
function arcGeometry(chord: number, bulge: number): { r: number; theta: number } | null {
  const theta = 4 * Math.atan(bulge);
  const denom = 2 * Math.sin(theta / 2);
  if (Math.abs(denom) < 1e-12) return null;
  return { r: chord / denom, theta };
}

/** Perimeter of a set of segments, counting exact arc length where present. */
export function segmentsPerimeter(segments: ProjectedSegment[]): number {
  let total = 0;
  for (const s of segments) {
    const chord = segLength(s);
    const b = s.bulge ?? 0;
    if (Math.abs(b) < 1e-12) {
      total += chord;
    } else {
      const g = arcGeometry(chord, b);
      total += g ? Math.abs(g.r * g.theta) : chord;
    }
  }
  return total;
}

/** Signed enclosed area of a closed segment loop, including circular caps. */
export function segmentsSignedArea(segments: ProjectedSegment[]): number {
  let a = 0;
  for (const s of segments) a += s.x0 * s.y1 - s.x1 * s.y0;
  let signed = a / 2;
  for (const s of segments) {
    const b = s.bulge ?? 0;
    if (Math.abs(b) < 1e-12) continue;
    const g = arcGeometry(segLength(s), b);
    if (!g) continue;
    // Circular segment between chord and arc; sign follows the bulge.
    signed += 0.5 * g.r * g.r * (g.theta - Math.sin(g.theta));
  }
  return signed;
}

export interface ExtractedLoops {
  /** Closed loops as commands, largest absolute area first (index 0 outer). */
  loops: SketchCommand[][];
  /** Absolute areas (mm²) matching `loops`, in the same order. */
  areas: number[];
  /** Perimeters (mm) matching `loops`, exact for arc segments. */
  perimeters: number[];
  /** 2D bounding boxes matching `loops`. */
  bboxes: Array<{ min: Pt2; max: Pt2 }>;
  /** Open chains that failed to close, for the diagnostic. */
  openChains: Array<{ start: Pt2; end: Pt2 }>;
  /** All projected segments (for perimeter/area/bbox probes). */
  segments: ProjectedSegment[];
}

/**
 * Full pipeline: edges → projected segments → closed loops of commands.
 * `loops[0]` is the largest-area loop, so it is the outer boundary; the rest
 * are holes of the section (a single connected solid sliced by a plane has
 * exactly this structure).
 */
export function extractLoops(
  edges: readonly Edge[],
  frame: PlaneFrame,
  opts: { curveTolerance?: number; chainTolerance?: number } = {},
): ExtractedLoops {
  const curveTolerance = opts.curveTolerance ?? 0.01;
  const chainTolerance = opts.chainTolerance ?? 1e-4;
  const segments: ProjectedSegment[] = [];
  for (const e of edges) {
    for (const s of edgeToSegments(e, frame, curveTolerance)) {
      if (segLength(s) > EPS || (s.bulge ?? 0) !== 0) segments.push(s);
    }
  }
  const { loops, openChains } = chainSegments(segments, chainTolerance);
  const withArea: LoopChain[] = loops.map((segs) => ({ segments: segs, area: segmentsSignedArea(segs) }));
  withArea.sort((a, b) => Math.abs(b.area) - Math.abs(a.area));
  return {
    loops: withArea.map((l) => loopToCommands(l.segments)),
    areas: withArea.map((l) => Math.abs(l.area)),
    perimeters: withArea.map((l) => segmentsPerimeter(l.segments)),
    bboxes: withArea.map((l) => segmentsBBox(l.segments)),
    openChains,
    segments,
  };
}

/** 2D bounding box of a set of projected segments. */
export function segmentsBBox(segments: ProjectedSegment[]): { min: Pt2; max: Pt2 } {
  if (segments.length === 0) return { min: [0, 0], max: [0, 0] };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of segments) {
    for (const [x, y] of [[s.x0, s.y0], [s.x1, s.y1]] as Pt2[]) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  return { min: [minX, minY], max: [maxX, maxY] };
}
