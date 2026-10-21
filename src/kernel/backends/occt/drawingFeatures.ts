// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/drawingFeatures.ts
//
// B-rep feature recognition for automatic drawing annotation. Reads the
// exported solid (no feature history) and reports what a drafter dimensions:
//
//   - planar faces (outward normal, area, centroid, extent) — datum candidates;
//   - hole composites: co-axial bores (from `detectCylindricalHoles`) plus
//     concave cones, chained along their axis into simple, counterbored and
//     countersunk holes; anything else is reported as unclassified with a
//     reason rather than dropped;
//   - radius features: partial cylinders and tori that are not hole walls or
//     bosses (fillets, rounds, slot ends), grouped per axis and radius;
//   - chamfers: narrow planar strips between two planar neighbours, with their
//     legs measured from the virtual corner line the chamfer replaced.
//
// Everything is measured in model millimetres. Nothing here renders.

import type { Edge, Face } from 'replicad';
import { measureArea, getOC } from 'replicad';
import { OcctBackend } from './occtBackend';
import { detectCylindricalHoles, type CylindricalHole } from './holeDetection';
import { isSameEdge } from './edgeQueries';

export type V3 = [number, number, number];

const dot = (a: readonly number[], b: readonly number[]): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: readonly number[], b: readonly number[]): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: readonly number[], b: readonly number[]): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: readonly number[], k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const cross = (a: readonly number[], b: readonly number[]): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const len = (a: readonly number[]): number => Math.hypot(a[0], a[1], a[2]);
const unit = (a: readonly number[]): V3 => {
  const l = len(a);
  return l > 0 ? [a[0] / l, a[1] / l, a[2] / l] : [a[0], a[1], a[2]];
};
const vec = (p: { x: number; y: number; z: number }): V3 => [p.x, p.y, p.z];
const distToLine = (p: readonly number[], o: readonly number[], d: readonly number[]): number =>
  len(cross(sub(p, o), d));

/** Canonical sign for an axis direction: first significant component positive. */
export function canonicalAxis(d: readonly number[]): V3 {
  const u = unit(d);
  for (const c of u) {
    if (Math.abs(c) > 1e-9) return c > 0 ? u : scale(u, -1);
  }
  return u;
}

/** `'x' | 'y' | 'z'` when `d` is within ~0.8° of a world axis, else null. */
export function principalAxis(d: readonly number[]): 'x' | 'y' | 'z' | null {
  const u = unit(d);
  const MIN = 0.9999;
  if (Math.abs(u[0]) > MIN) return 'x';
  if (Math.abs(u[1]) > MIN) return 'y';
  if (Math.abs(u[2]) > MIN) return 'z';
  return null;
}

export interface PlanarFaceInfo {
  /** Index into the shape's face list (stable for one export). */
  index: number;
  /** Unit outward normal. */
  normal: V3;
  centre: V3;
  area: number;
  /** `normal · point` for any point on the face. */
  offset: number;
  min: V3;
  max: V3;
}

export interface HoleComposite {
  /** Axis point on the entry surface. */
  entry: V3;
  /** Unit axis pointing into the body from the entry. */
  axis: V3;
  diameter: number;
  through: boolean;
  /** Blind holes: entry surface to the end of the full diameter. */
  depth?: number;
  counterbore?: { diameter: number; depth: number };
  countersink?: { diameter: number; angleDeg: number };
}

export interface UnclassifiedBore {
  point: V3;
  axis: V3;
  diameter: number;
  reason: string;
}

export interface RadiusFeature {
  radius: number;
  /** Unit axis of the arc (cylinder axis, or the torus's tube direction is
   *  not needed — tori carry their revolution axis). */
  axis: V3;
  /** Point on the arc surface, mid-way along the face. */
  arcPoint: V3;
  /** Centre of the arc through `arcPoint`: its foot on the cylinder axis, or
   *  the torus tube centre. Exact for convex and concave arcs alike. */
  centre: V3;
  /** Sampled points along the arc surface, for choosing a leader target. */
  samples: V3[];
  surface: 'cylinder' | 'torus';
}

export interface ChamferFeature {
  /** Leg lengths from the virtual corner line to each long edge, ascending. */
  legs: [number, number];
  /** Unit direction of the chamfered edge. */
  edgeDir: V3;
  /** Midpoint of the chamfer strip's centre line. */
  midPoint: V3;
  /** Outward normal of the chamfer face. */
  normal: V3;
}

export interface DrawingFeatureModel {
  planar: PlanarFaceInfo[];
  holes: HoleComposite[];
  unclassified: UnclassifiedBore[];
  radii: RadiusFeature[];
  chamfers: ChamferFeature[];
  /** Triangle facets of a mesh-derived body left out of recognition. */
  meshFacetsSkipped?: number;
}

/**
 * A body with more than this many triangular planar faces came from a mesh
 * (lib.fromSTL / fromOBJ / from3MF): those faces are facets, not designed
 * features, so they are not recognised. The SO-100 arm's 65k STL facets
 * took 50 s and ~760 MB of JS heap to classify into nothing usable.
 */
export const MESH_FACET_MIN = 2000;

/** Indices of triangular faces when there are more than MESH_FACET_MIN of
 *  them, else an empty set. */
function meshFacetIndices(faces: Face[]): Set<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const triangles = new Set<number>();
  faces.forEach((face, index) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const edges = new oc.TopExp_Explorer_2((face as any).wrapped, oc.TopAbs_ShapeEnum.TopAbs_EDGE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
    let n = 0;
    for (; edges.More() && n < 4; edges.Next()) n += 1;
    edges.delete();
    if (n === 3) triangles.add(index);
  });
  return triangles.size > MESH_FACET_MIN ? triangles : new Set();
}

// ---------------------------------------------------------------------------
// Surface sampling helpers
// ---------------------------------------------------------------------------

interface UV { uMin: number; uMax: number; vMin: number; vMax: number }

function uvBounds(face: Face): UV {
  return face.UVBounds;
}

/** Point at FRACTIONAL surface parameters (0..1 across the face's UV bounds). */
function pointOn(face: Face, uFrac: number, vFrac: number): V3 {
  return vec(face.pointOnSurface(uFrac, vFrac));
}

/** Circumcircle of three 3D points: centre, radius and plane normal. */
export function circumcircle(a: V3, b: V3, c: V3): { centre: V3; radius: number; normal: V3 } | null {
  const ab = sub(b, a);
  const ac = sub(c, a);
  const n = cross(ab, ac);
  const n2 = dot(n, n);
  if (n2 < 1e-18) return null;
  const rel = scale(
    add(scale(cross(ac, n), dot(ab, ab)), scale(cross(n, ab), dot(ac, ac))),
    1 / (2 * n2),
  );
  return { centre: add(a, rel), radius: len(rel), normal: unit(n) };
}

/** True when the outward normal at `p` points toward `axisPoint` (concave). */
function isConcaveAt(face: Face, p: V3, axisOrigin: V3, axisDir: V3): boolean {
  const n = vec(face.normalAt(p));
  const t = dot(sub(p, axisOrigin), axisDir);
  const radial = sub(p, add(axisOrigin, scale(axisDir, t)));
  return dot(n, radial) < 0;
}

interface CylFace {
  face: Face;
  loc: V3;
  dir: V3;
  radius: number;
  du: number;
  concave: boolean;
  area: number;
  mid: V3;
  samples: V3[];
}

/** Axis line and radius of a cylindrical face. */
export function cylinderAxisOf(face: Face): { loc: V3; dir: V3; radius: number } | null {
  const c = cylinderOf(face);
  return c ? { loc: c.loc, dir: c.dir, radius: c.radius } : null;
}

function cylinderOf(face: Face): CylFace | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adaptor = new oc.BRepAdaptor_Surface_2((face as any).wrapped, true);
  try {
    const cyl = adaptor.Cylinder();
    const ax = cyl.Axis();
    const l = ax.Location();
    const d = ax.Direction();
    const loc: V3 = [l.X(), l.Y(), l.Z()];
    const dir = unit([d.X(), d.Y(), d.Z()]);
    const radius = cyl.Radius();
    l.delete(); d.delete(); ax.delete(); cyl.delete();
    const uv = uvBounds(face);
    const mid = pointOn(face, 0.5, 0.5);
    const samples: V3[] = [];
    for (let k = 0; k <= 8; k++) samples.push(pointOn(face, k / 8, 0.5));
    return {
      face, loc, dir, radius,
      du: uv.uMax - uv.uMin,
      concave: isConcaveAt(face, mid, loc, dir),
      area: measureArea(face),
      mid,
      samples,
    };
  } finally {
    adaptor.delete();
  }
}

// ---------------------------------------------------------------------------
// Holes
// ---------------------------------------------------------------------------

const AXIS_DIST_TOL = 0.01;
const CHAIN_GAP = 0.05;
const DIAM_TOL = 0.01;

interface AxialSegment {
  kind: 'bore' | 'cone';
  t0: number;
  t1: number;
  /** Bore: diameter. Cone: radius at t0 / t1. */
  diameter?: number;
  r0?: number;
  r1?: number;
  bore?: CylindricalHole;
}

interface ConeFace {
  face: Face;
  /** Three samples at the mid-v circle and the mid-u generatrix ends. */
  circle: { centre: V3; radius: number; normal: V3 };
  genA: V3;
  genB: V3;
  mid: V3;
}

function coneOf(face: Face): ConeFace | null {
  const circle = circumcircle(pointOn(face, 0.1, 0.5), pointOn(face, 0.5, 0.5), pointOn(face, 0.9, 0.5));
  if (!circle) return null;
  return {
    face,
    circle,
    genA: pointOn(face, 0.5, 0),
    genB: pointOn(face, 0.5, 1),
    mid: pointOn(face, 0.5, 0.5),
  };
}

function classifySingleBore(
  seg: AxialSegment,
  boreSeg: AxialSegment,
  pointAt: (t: number) => V3,
  dir: V3,
): { hole: HoleComposite } {
    const b = boreSeg.bore!;
    if (b.kind === 'through') {
      // Entry on the +axis end, so a vertical hole reads from the top view.
      return {
        hole: { entry: pointAt(seg.t1), axis: scale(dir, -1), diameter: b.diameterMm, through: true },
      };
    }
    return {
      hole: {
        entry: b.axisOrigin,
        axis: unit(b.axisDirection),
        diameter: b.diameterMm,
        through: false,
        depth: b.depthMm,
      },
    };
  
}

function classifyCounterbore(
  segs: AxialSegment[],
  origin: V3,
  dir: V3,
  pointAt: (t: number) => V3,
): { hole: HoleComposite } | { reason: string } {
    const [first, second] = segs;
    const d0 = first.diameter!;
    const d1 = second.diameter!;
    if (Math.abs(d0 - d1) < DIAM_TOL) return { reason: 'two co-axial bores of equal diameter' };
    const largeAtStart = d0 > d1;
    const large = largeAtStart ? first : second;
    const small = largeAtStart ? second : first;
    const mouthT = (b: CylindricalHole): number => dot(sub(b.axisOrigin, origin), dir);
    const entryT = largeAtStart ? large.t0 : large.t1;
    // Hole detection probes each bore on its own: a blind bore's mouth is the
    // open end. The counterbore must open at the outer end, and a blind main
    // bore must open into the counterbore.
    const largeOuterOpen = large.bore!.kind === 'through' || Math.abs(mouthT(large.bore!) - entryT) < 1e-3;
    if (!largeOuterOpen) return { reason: 'the larger bore is closed at its outer end' };
    const innerT = largeAtStart ? small.t0 : small.t1;
    if (small.bore!.kind === 'blind' && Math.abs(mouthT(small.bore!) - innerT) > 1e-3) {
      return { reason: 'the smaller bore is closed where it meets the larger one' };
    }
    const axis = largeAtStart ? dir : scale(dir, -1);
    const through = small.bore!.kind === 'through';
    const farT = largeAtStart ? small.t1 : small.t0;
    return {
      hole: {
        entry: pointAt(entryT),
        axis,
        diameter: small.diameter!,
        through,
        ...(through ? {} : { depth: Math.abs(farT - entryT) }),
        counterbore: { diameter: large.diameter!, depth: large.t1 - large.t0 },
      },
    };
  
}

function classifyConicalStep(
  bores: AxialSegment[],
  cones: AxialSegment[],
  origin: V3,
  dir: V3,
  pointAt: (t: number) => V3,
): { hole: HoleComposite } | { reason: string } {
    const boreSeg = bores[0];
    const b = boreSeg.bore!;
    const boreR = b.diameterMm / 2;
    // A drill point is a cone whose wide end matches the bore; a countersink
    // is wider than the bore and sits at an open end.
    const csks = cones.filter(c => Math.max(c.r0!, c.r1!) > boreR + DIAM_TOL);
    const points = cones.filter(c => Math.abs(Math.max(c.r0!, c.r1!) - boreR) <= DIAM_TOL);
    if (csks.length > 1 || csks.length + points.length !== cones.length) {
      return { reason: 'bore with more than one conical step' };
    }
    if (csks.length === 0) {
      // Plain blind hole with a drill point: depth is to the full diameter.
      if (b.kind === 'through') return { reason: 'conical step inside a through bore' };
      return {
        hole: { entry: b.axisOrigin, axis: unit(b.axisDirection), diameter: b.diameterMm, through: false, depth: b.depthMm },
      };
    }
    const csk = csks[0];
    const cskAtStart = csk.t0 < boreSeg.t0;
    const entryT = cskAtStart ? csk.t0 : csk.t1;
    const wideR = Math.max(csk.r0!, csk.r1!);
    const narrowR = Math.min(csk.r0!, csk.r1!);
    const semi = Math.atan2(wideR - narrowR, csk.t1 - csk.t0);
    const axis = cskAtStart ? dir : scale(dir, -1);
    const farT = cskAtStart ? boreSeg.t1 : boreSeg.t0;
    // The bore's far end decides THRU: its near end opens into the countersink.
    const through = b.kind === 'through';
    const nearT = cskAtStart ? boreSeg.t0 : boreSeg.t1;
    if (!through && Math.abs(dot(sub(b.axisOrigin, origin), dir) - nearT) > 1e-3) {
      return { reason: 'the bore is closed where it meets the countersink' };
    }
    return {
      hole: {
        entry: pointAt(entryT),
        axis,
        diameter: b.diameterMm,
        through,
        ...(through ? {} : { depth: Math.abs(farT - entryT) }),
        countersink: { diameter: 2 * wideR, angleDeg: Math.round((2 * semi * 180) / Math.PI * 10) / 10 },
      },
    };
  
}

function classifyChain(
  segs: AxialSegment[],
  origin: V3,
  dir: V3,
): { hole: HoleComposite } | { reason: string } {
  const bores = segs.filter(s => s.kind === 'bore');
  const cones = segs.filter(s => s.kind === 'cone');
  if (bores.some(b => b.bore!.bothEndsClosed)) return { reason: 'both ends are closed (internal duct)' };
  const pointAt = (t: number): V3 => add(origin, scale(dir, t));

  if (segs.length === 1 && bores.length === 1) {
    return classifySingleBore(segs[0], bores[0], pointAt, dir);
  }

  if (segs.length === 2 && bores.length === 2) {
    return classifyCounterbore(segs, origin, dir, pointAt);
  }

  if (bores.length === 1 && cones.length >= 1 && segs.length <= 3) {
    return classifyConicalStep(bores, cones, origin, dir, pointAt);
  }

  return { reason: `${bores.length} stacked bores and ${cones.length} conical step(s)` };
}

function recogniseHoles(
  backend: OcctBackend,
  cones: ConeFace[],
  checkpoint?: () => void,
): { holes: HoleComposite[]; unclassified: UnclassifiedBore[]; bores: CylindricalHole[] } {
  const bores = detectCylindricalHoles(backend, checkpoint);
  const holes: HoleComposite[] = [];
  const unclassified: UnclassifiedBore[] = [];

  interface Line { origin: V3; dir: V3; segs: AxialSegment[] }
  const lines: Line[] = [];
  const lineFor = (p: V3, d: V3): Line => {
    const cd = canonicalAxis(d);
    for (const l of lines) {
      if (Math.abs(dot(l.dir, cd)) < 1 - 1e-6) continue;
      if (distToLine(p, l.origin, l.dir) > AXIS_DIST_TOL) continue;
      return l;
    }
    const l: Line = { origin: p, dir: cd, segs: [] };
    lines.push(l);
    return l;
  };

  for (const b of bores) {
    const l = lineFor(b.axisOrigin, b.axisDirection);
    const a = dot(sub(b.axisOrigin, l.origin), l.dir);
    const e = a + dot(unit(b.axisDirection), l.dir) * b.depthMm;
    l.segs.push({ kind: 'bore', t0: Math.min(a, e), t1: Math.max(a, e), diameter: b.diameterMm, bore: b });
  }
  for (const c of cones) {
    // Only cones co-axial with an existing bore line belong to a hole.
    const l = lines.find(ln =>
      Math.abs(dot(ln.dir, c.circle.normal)) > 1 - 1e-6 &&
      distToLine(c.circle.centre, ln.origin, ln.dir) <= AXIS_DIST_TOL);
    if (!l) continue;
    if (!isConcaveAt(c.face, c.mid, l.origin, l.dir)) continue;
    const ta = dot(sub(c.genA, l.origin), l.dir);
    const tb = dot(sub(c.genB, l.origin), l.dir);
    const ra = distToLine(c.genA, l.origin, l.dir);
    const rb = distToLine(c.genB, l.origin, l.dir);
    const [t0, r0, t1, r1] = ta <= tb ? [ta, ra, tb, rb] : [tb, rb, ta, ra];
    l.segs.push({ kind: 'cone', t0, t1, r0, r1 });
  }

  for (const l of lines) {
    const segs = [...l.segs].sort((p, q) => p.t0 - q.t0);
    // Split into contiguous chains: two holes on one axis with material
    // between them are two holes.
    const chains: AxialSegment[][] = [];
    for (const s of segs) {
      const last = chains[chains.length - 1];
      if (last && s.t0 <= Math.max(...last.map(x => x.t1)) + CHAIN_GAP) last.push(s);
      else chains.push([s]);
    }
    for (const chain of chains) {
      const maxD = Math.max(...chain.map(s => s.diameter ?? 2 * Math.max(s.r0 ?? 0, s.r1 ?? 0)));
      const centre = add(l.origin, scale(l.dir, (chain[0].t0 + chain[chain.length - 1].t1) / 2));
      if (principalAxis(l.dir) === null) {
        unclassified.push({ point: centre, axis: l.dir, diameter: maxD, reason: 'its axis is not along X, Y or Z' });
        continue;
      }
      if (!chain.some(s => s.kind === 'bore')) continue;
      const r = classifyChain(chain, l.origin, l.dir);
      if ('hole' in r) holes.push(r.hole);
      else unclassified.push({ point: centre, axis: l.dir, diameter: maxD, reason: r.reason });
    }
  }
  return { holes, unclassified, bores };
}

// ---------------------------------------------------------------------------
// Radius features (fillets / rounds)
// ---------------------------------------------------------------------------

const FULL_COVERAGE = 5.8; // rad — same threshold hole detection uses

function recogniseRadii(cyls: CylFace[], tori: Face[], bores: CylindricalHole[], checkpoint?: () => void): RadiusFeature[] {
  const out: RadiusFeature[] = [];
  const isBoreWall = (c: CylFace) => bores.some(b =>
    Math.abs(b.diameterMm / 2 - c.radius) < DIAM_TOL &&
    Math.abs(dot(unit(b.axisDirection), c.dir)) > 1 - 1e-6 &&
    distToLine(c.loc, b.axisOrigin, unit(b.axisDirection)) < AXIS_DIST_TOL);

  interface Group { loc: V3; dir: V3; radius: number; faces: CylFace[] }
  const groups: Group[] = [];
  for (const c of cyls) {
    checkpoint?.();
    if (isBoreWall(c)) continue;
    const g = groups.find(x =>
      Math.abs(x.radius - c.radius) < DIAM_TOL &&
      Math.abs(dot(x.dir, c.dir)) > 1 - 1e-6 &&
      distToLine(c.loc, x.loc, x.dir) < AXIS_DIST_TOL);
    if (g) g.faces.push(c);
    else groups.push({ loc: c.loc, dir: c.dir, radius: c.radius, faces: [c] });
  }
  for (const g of groups) {
    const coverage = g.faces.reduce((s, f) => s + f.du, 0);
    // A (possibly seam-split) full cylinder is a boss or a bore, not a radius.
    if (coverage >= FULL_COVERAGE) continue;
    const biggest = [...g.faces].sort((a, b) => b.area - a.area)[0];
    out.push({
      radius: g.radius,
      axis: canonicalAxis(g.dir),
      arcPoint: biggest.mid,
      centre: add(g.loc, scale(g.dir, dot(sub(biggest.mid, g.loc), g.dir))),
      samples: g.faces.flatMap(f => f.samples),
      surface: 'cylinder',
    });
  }

  interface TorusInfo { centre: V3; axis: V3; minor: number; mid: V3; tube: V3; samples: V3[] }
  const torusInfos: TorusInfo[] = [];
  for (const face of tori) {
    checkpoint?.();
    const major = circumcircle(pointOn(face, 0.1, 0.5), pointOn(face, 0.5, 0.5), pointOn(face, 0.9, 0.5));
    const minor = circumcircle(pointOn(face, 0.5, 0.1), pointOn(face, 0.5, 0.5), pointOn(face, 0.5, 0.9));
    if (!major || !minor) continue;
    const samples: V3[] = [];
    for (let k = 0; k <= 16; k++) samples.push(pointOn(face, k / 16, 0.5));
    torusInfos.push({
      centre: major.centre,
      axis: canonicalAxis(major.normal),
      minor: minor.radius,
      mid: pointOn(face, 0.5, 0.5),
      // The minor circle passes through `mid`, so its centre is the tube
      // centre the arc at `mid` is struck from.
      tube: minor.centre,
      samples,
    });
  }
  // Seam splits: one torus reported as two faces shares centre, axis, radius.
  const seen: TorusInfo[] = [];
  for (const t of torusInfos) {
    const dup = seen.find(s =>
      Math.abs(s.minor - t.minor) < DIAM_TOL &&
      len(sub(s.centre, t.centre)) < AXIS_DIST_TOL * 10 &&
      Math.abs(dot(s.axis, t.axis)) > 1 - 1e-6);
    if (dup) {
      dup.samples.push(...t.samples);
      continue;
    }
    seen.push(t);
    out.push({ radius: t.minor, axis: t.axis, arcPoint: t.mid, centre: t.tube, samples: t.samples, surface: 'torus' });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Chamfers
// ---------------------------------------------------------------------------

function edgeEnds(e: Edge): [V3, V3] {
  return [vec(e.startPoint), vec(e.endPoint)];
}

interface EdgeSeg { e: Edge; a: V3; b: V3; dir: V3; length: number }

/** The two long parallel edges of a four-line planar strip, or null when the
 *  face is not a narrow strip between two long edges. */
function chamferStripSegs(edges: Edge[]): [EdgeSeg, EdgeSeg] | null {
  if (edges.length !== 4) return null;
  if (edges.some(e => (e as unknown as { geomType?: string }).geomType !== 'LINE')) return null;
  const segs = edges.map(e => {
    const [a, b] = edgeEnds(e);
    return { e, a, b, dir: unit(sub(b, a)), length: len(sub(b, a)) };
  });
  // Two parallel long edges, two short ones.
  const sorted = [...segs].sort((p, q) => q.length - p.length);
  const [l1, l2, s1, s2] = sorted;
  if (Math.abs(dot(l1.dir, l2.dir)) < 0.9999) return null;
  if (s1.length > l1.length * 0.5 || s2.length > l1.length * 0.5) return null;
  const width = distToLine(l2.a, l1.a, l1.dir);
  if (width > l1.length * 0.25) return null;
  return [l1, l2];
}

/** Validate a candidate strip against its two planar neighbours and measure
 *  the chamfer feature; null when it is not a chamfer. */
function chamferFromStrip(
  idx: number,
  info: PlanarFaceInfo,
  l1: EdgeSeg,
  l2: EdgeSeg,
  planarByIndex: Map<number, PlanarFaceInfo>,
  neighbourAcross: (faceIdx: number, edge: Edge) => number,
): ChamferFeature | null {
  const n1 = neighbourAcross(idx, l1.e);
  const n2 = neighbourAcross(idx, l2.e);
  const p1 = planarByIndex.get(n1);
  const p2 = planarByIndex.get(n2);
  if (!p1 || !p2) return null;
  // A chamfer is a small strip cut from a corner of two larger faces; a
  // narrow face whose neighbours are themselves the smaller strips (the
  // flat left between two chamfers) is not one.
  if (p1.area < info.area * 1.5 || p2.area < info.area * 1.5) return null;
  const sinDihedral = len(cross(p1.normal, p2.normal));
  if (sinDihedral < 0.1) return null;
  // The strip must not be coplanar with either neighbour.
  if (Math.abs(dot(info.normal, p1.normal)) > 0.999 || Math.abs(dot(info.normal, p2.normal)) > 0.999) return null;
  // Leg on neighbour 1: distance within plane 1 from the long edge l1 to the
  // corner line where planes 1 and 2 meet.
  const legOn = (edgePoint: V3, other: PlanarFaceInfo): number =>
    Math.abs(dot(other.normal, edgePoint) - other.offset) / sinDihedral;
  const leg1 = legOn(l1.a, p2);
  const leg2 = legOn(l2.a, p1);
  // Convexity: the removed corner lies outside the body, i.e. on the strip's
  // outward side.
  const cornerSide = dot(info.normal, sub(p1.centre, info.centre)) < 1e-9 &&
    dot(info.normal, sub(p2.centre, info.centre)) < 1e-9;
  if (!cornerSide) return null;
  const midPoint = scale(add(add(l1.a, l1.b), add(l2.a, l2.b)), 0.25);
  const legs = [leg1, leg2].sort((a, b) => a - b) as [number, number];
  return { legs, edgeDir: canonicalAxis(l1.dir), midPoint, normal: info.normal };
}

/** `isSameEdge`'s per-axis endpoint tolerance. */
const EDGE_POINT_TOL = 1e-6;

interface IndexedEdge {
  face: number;
  edge: Edge;
  a: V3;
  b: V3;
}

/**
 * `neighbourAcross(faceIdx, edge)`: the lowest-index other face with an edge
 * `isSameEdge` matches, -1 if none. Same answer as testing every edge of every
 * face, but each edge's endpoints are read from OCCT once and indexed on a
 * grid of the endpoint tolerance, so only edges whose endpoints already match
 * reach `isSameEdge`. The full scan was O(faces x edges) OCCT reads per query
 * (each endpoint read builds a curve adaptor): 72 s and a WASM heap at its
 * 2 GB ceiling for the 2,556-face planetary gear stage's pdf-drawing.
 */
/** Per-face edge lists, read lazily. */
interface FaceEdgeLists {
  readonly length: number;
  at(face: number): Edge[];
}

function makeNeighbourAcross(faceEdges: FaceEdgeLists): (faceIdx: number, edge: Edge) => number {
  const cell = (c: number): number => Math.floor(c / EDGE_POINT_TOL);
  const cellKey = (x: number, y: number, z: number): string => `${x},${y},${z}`;
  // Built on the first query: a body with no chamfer candidates never pays
  // for reading every edge.
  let built: Map<string, IndexedEdge[]> | undefined;
  const index = (): Map<string, IndexedEdge[]> => (built ??= buildEdgeGrid(faceEdges, cell, cellKey));
  return makeLookup(index, cell, cellKey);
}

function buildEdgeGrid(
  faceEdges: FaceEdgeLists,
  cell: (c: number) => number,
  cellKey: (x: number, y: number, z: number) => string,
): Map<string, IndexedEdge[]> {
  const grid = new Map<string, IndexedEdge[]>();
  for (let face = 0; face < faceEdges.length; face += 1) {
    for (const edge of faceEdges.at(face)) {
      const entry: IndexedEdge = { face, edge, a: vec(edge.startPoint), b: vec(edge.endPoint) };
      const k = cellKey(cell(entry.a[0]), cell(entry.a[1]), cell(entry.a[2]));
      const bucket = grid.get(k);
      if (bucket) bucket.push(entry);
      else grid.set(k, [entry]);
    }
  }
  return grid;
}

function makeLookup(
  index: () => Map<string, IndexedEdge[]>,
  cell: (c: number) => number,
  cellKey: (x: number, y: number, z: number) => string,
): (faceIdx: number, edge: Edge) => number {
  const near = (p: V3, q: V3): boolean =>
    Math.abs(p[0] - q[0]) < EDGE_POINT_TOL && Math.abs(p[1] - q[1]) < EDGE_POINT_TOL && Math.abs(p[2] - q[2]) < EDGE_POINT_TOL;
  /** Indexed edges whose start point is within tolerance of `p`. */
  const startingNear = (p: V3, out: IndexedEdge[]): void => {
    const [cx, cy, cz] = [cell(p[0]), cell(p[1]), cell(p[2])];
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dz = -1; dz <= 1; dz += 1) {
          for (const entry of index().get(cellKey(cx + dx, cy + dy, cz + dz)) ?? []) {
            if (near(entry.a, p)) out.push(entry);
          }
        }
      }
    }
  };
  return (faceIdx, edge) => {
    const qa = vec(edge.startPoint);
    const qb = vec(edge.endPoint);
    const found: IndexedEdge[] = [];
    // isSameEdge accepts either orientation, so a match starts at qa or qb.
    startingNear(qa, found);
    startingNear(qb, found);
    const candidates = found
      .filter(c => c.face !== faceIdx && ((near(c.a, qa) && near(c.b, qb)) || (near(c.a, qb) && near(c.b, qa))))
      .sort((x, y) => x.face - y.face);
    for (const c of candidates) {
      if (isSameEdge(c.edge, edge)) return c.face;
    }
    return -1;
  };
}

function recogniseChamfers(faces: Face[], planarByIndex: Map<number, PlanarFaceInfo>, checkpoint?: () => void): ChamferFeature[] {
  const out: ChamferFeature[] = [];
  // Edge lists are read per face on demand: most faces are never a chamfer
  // candidate, and a mesh-derived body has tens of thousands.
  const edgeCache = new Map<number, Edge[]>();
  const edgesOf = (i: number): Edge[] => {
    let edges = edgeCache.get(i);
    if (!edges) {
      edges = (faces[i] as unknown as { edges: Edge[] }).edges;
      edgeCache.set(i, edges);
    }
    return edges;
  };
  const faceEdges = { length: faces.length, at: edgesOf };
  const neighbourAcross = makeNeighbourAcross(faceEdges);

  for (const [idx, info] of planarByIndex) {
    checkpoint?.();
    const strip = chamferStripSegs(edgesOf(idx));
    if (!strip) continue;
    const [l1, l2] = strip;
    const feature = chamferFromStrip(idx, info, l1, l2, planarByIndex, neighbourAcross);
    if (feature) out.push(feature);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export interface RecogniseOptions {
  /** Detect hole composites (runs point-in-solid probes); default true. */
  holes?: boolean;
  radii?: boolean;
  chamfers?: boolean;
  /** Called per face while classifying, between bore probes and per
   *  candidate in the radius and chamfer passes; throw from it to abort a
   *  budgeted run. */
  checkpoint?: () => void;
  /** Return the planar face table (`planar`); default true. False leaves it
   *  empty and measures a planar face's centre and area only when the
   *  chamfer pass needs them (the surface integrals dominate recognition);
   *  holes, radii and chamfers are unchanged. */
  planar?: boolean;
}

/**
 * A planar face's info whose centre, area and offset (surface integrals) are
 * measured on first read and then kept. Values are the same as measuring them
 * eagerly; {@link materialisePlanar} turns it into a plain record before it
 * leaves the recogniser, so no caller holds the face.
 */
function lazyPlanarFace(face: Face, index: number): PlanarFaceInfo {
  const normal = unit(vec(face.normalAt()));
  const [mn, mx] = face.boundingBox.bounds;
  let centre: V3 | undefined;
  let area: number | undefined;
  const info = { index, normal } as PlanarFaceInfo;
  Object.defineProperties(info, {
    centre: { enumerable: true, get: () => (centre ??= vec(face.center)) },
    area: { enumerable: true, get: () => (area ??= measureArea(face)) },
    offset: { enumerable: true, get: () => dot(normal, info.centre) },
  });
  return Object.assign(info, { min: [mn[0], mn[1], mn[2]] as V3, max: [mx[0], mx[1], mx[2]] as V3 });
}

/** Plain-data copy of a {@link lazyPlanarFace}, fields in declaration order. */
function materialisePlanar(p: PlanarFaceInfo): PlanarFaceInfo {
  return { index: p.index, normal: p.normal, centre: p.centre, area: p.area, offset: p.offset, min: p.min, max: p.max };
}

export function recogniseDrawingFeatures(backend: OcctBackend, options: RecogniseOptions = {}): DrawingFeatureModel {
  const wantHoles = options.holes !== false;
  const wantRadii = options.radii !== false;
  const wantChamfers = options.chamfers !== false;
  const shape = backend.getReplicadShape() as unknown as { faces: Face[] };
  const faces = shape.faces;
  const planar: PlanarFaceInfo[] = [];
  const cyls: CylFace[] = [];
  const cones: ConeFace[] = [];
  const tori: Face[] = [];

  const facets = meshFacetIndices(faces);
  faces.forEach((face, index) => {
    options.checkpoint?.();
    if (facets.has(index)) return;
    const type = (face as unknown as { geomType?: string }).geomType;
    if (type === 'PLANE') {
      planar.push(lazyPlanarFace(face, index));
    } else if (type === 'CYLINDRE' && wantRadii) {
      const c = cylinderOf(face);
      if (c) cyls.push(c);
    } else if (type === 'CONE' && wantHoles) {
      const c = coneOf(face);
      if (c) cones.push(c);
    } else if (type === 'TORUS' && wantRadii) {
      tori.push(face);
    }
  });

  const { holes, unclassified, bores } = wantHoles || wantRadii
    ? recogniseHoles(backend, cones, options.checkpoint)
    : { holes: [], unclassified: [], bores: [] };
  const radii = wantRadii ? recogniseRadii(cyls, tori, bores, options.checkpoint) : [];
  const planarByIndex = new Map(planar.map(p => [p.index, p]));
  const chamfers = wantChamfers ? recogniseChamfers(faces, planarByIndex, options.checkpoint) : [];
  return {
    planar: options.planar === false ? [] : planar.map(materialisePlanar),
    holes: wantHoles ? holes : [],
    unclassified: wantHoles ? unclassified : [],
    radii,
    chamfers,
    ...(facets.size > 0 ? { meshFacetsSkipped: facets.size } : {}),
  };
}
