// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/reconstruct/planPhases.ts
//
// Phase implementations for buildPlan (src/agent/reconstruct/plan.ts): fitted-loop
// geometry helpers, the axisymmetric/extruded body builder, the face book, the
// axis-hole and cross-bore run decomposers, the cutout-run grouping and emission,
// and the drill grouping and emission. Split out of plan.ts purely to keep that
// file under the file-length ratchet; behaviour is unchanged.

import {
  distanceToPolygon,
  pointInPolygon,
  type V2,
  type V3,
} from './geom';
import {
  circleToPolygon,
  loopPrimitives,
  primitivesMoments,
  primitivesToPolygon,
  snapValue,
  type FittedLoop,
  type ProfilePrim,
  type SnapRecord,
} from './profileFit';
import { FaceBook, fromFace2D, oppositeLabel, polygonRegion, type AxisLabel, type FacePiece, type Region } from './faces';
import { pointInsideMesh } from './fidelity';
import type { MeshAnalysis } from './analysis';
import type { LoopGuide, RegionSection } from './profileFit';
import type { EdgeQueryOut } from './blends';
import { CoordinateBook, paramProfile, rectilinearCorners, type Corner, type CornerExpr } from './profileParams';

export interface PassParams {
  index: number;
  /** Loop simplification tolerance (mm). */
  eps: number;
  /** Grid snap tolerance (mm); 0 disables snapping. */
  snapTol: number;
  /** Line-direction snap tolerance (deg); 0 disables. */
  angleTolDeg: number;
  /** Allow `depth: 'through'` where the lowerer's rule resolves it. */
  allowThroughKeyword: boolean;
  /** Replace tangent corner arcs of outer profiles by sharp corners, so their
   *  rounds can be re-created as edge fillets together with adjoining blends. */
  sharpenCorners?: boolean;
}

export interface ParamDecl {
  name: string;
  value: number;
  measured: number;
  snapped: boolean;
  grid: number;
  description: string;
}

export interface FaceRef {
  byNormal: AxisLabel;
  level: number;
  near?: V3;
}

export type LoopOut = { kind: 'circle'; cx: number; cy: number; r: number } | { kind: 'path'; prims: ProfilePrim[] };

/** How a block's outline is written: param-driven corners, a param circle, or literal coordinates. */
export type ProfileOut =
  | { kind: 'corners'; corners: CornerExpr[] }
  | { kind: 'circle'; cx: string; cy: string; r: string };

export type OutlineKind = 'rectangle' | 'rectilinear' | 'circle' | 'literal';

/** How a block's corner rounds are written: edge fillets, tangent arcs in the profile, or none. */
export type RoundsKind = 'fillet' | 'arcs' | 'none';

export type BodyPlan =
  | { kind: 'revolve'; steps: Array<{ r: number; z0: number; z1: number; rParam: string; hParam: string }> }
  | {
      kind: 'extrude';
      blocks: Array<{
        z0: number;
        z1: number;
        loops: LoopOut[];
        hParam: string;
        outline: OutlineKind;
        rounds: RoundsKind;
        /** Param-driven outline; absent for a literal one (then `loops` is emitted). */
        profile?: ProfileOut;
      }>;
    };

export type Op =
  | {
      kind: 'holes';
      name: string;
      axis: 'Z' | 'X' | 'Y';
      face: FaceRef;
      positions: Array<{ u: number; v: number; at: V3 }>;
      diameter: number;
      diameterParam: string;
      depth: number | 'through';
      depthParam?: string;
      counterbore?: { diameter: number; depth: number; diameterParam: string; depthParam: string };
    }
  | { kind: 'cutout'; name: string; face: FaceRef; prims: ProfilePrim[]; depth: number; depthParam: string; at: V3 }
  | { kind: 'subtractCylinder'; name: string; axis: 'Z' | 'X' | 'Y'; base: V3; length: number; radius: number }
  | { kind: 'subtractPrism'; name: string; prims: ProfilePrim[]; z0: number; length: number }
  | { kind: 'fillet'; groups: Array<{ radius: number; radiusParam: string; edgeCount: number; selectors: Array<EdgeQueryOut | undefined> }> };

export interface EntrySideAssumption {
  feature: string;
  statement: string;
}

export interface FeaturePlan {
  pass: PassParams;
  /** Canonical-frame offset: q_emitted = q_canonical − origin. */
  origin: V3;
  body: BodyPlan;
  ops: Op[];
  params: ParamDecl[];
  /** Snaps applied to literal (non-param) coordinates. */
  literalSnaps: SnapRecord[];
  entryAssumptions: EntrySideAssumption[];
  /** Geometry this pass saw but could not express. */
  notRepresented: string[];
  holeSummary: Array<{ name: string; axis: 'Z' | 'X' | 'Y'; count: number; diameterMm: number; kind: 'through' | 'blind'; counterbore?: { diameterMm: number; depthMm: number } }>;
  /** Tangent corner arcs turned into sharp corners (sharpenCorners passes). */
  sharpenedArcs: number;
}

export interface BandLoops {
  z0: number;
  z1: number;
  /** Snapped loops, emitted-frame coordinates. */
  loops: FittedLoop[];
  /** Raw (unsnapped) loops in the same frame, index-aligned. */
  raw: FittedLoop[];
  polys: Float64Array[];
  depth: number[];
  /** Corner rounds of the outer outline made sharp (sharpenCorners passes). */
  sharpened: number;
}

interface RunSeg {
  r: number;
  rawR: number;
  t0: number;
  t1: number;
  /** Measured (unsnapped) ends, same frame. */
  rawT0: number;
  rawT1: number;
}

export interface Drill {
  axis: 'Z' | 'X' | 'Y';
  /** Entry at the high-t end (+axis face) or the low end. */
  fromHigh: boolean;
  center: V2;
  diameter: number;
  measuredDiameter: number;
  /** Distance from the entry face to the far end of the cut. */
  length: number;
  rawLength: number;
  through: boolean;
  counterbore?: { r: number; rawR: number; depth: number; rawDepth: number };
  entryLevel: number;
  exitLevel: number;
  /** Radius where the drill breaks the entry face. */
  rimR: number;
  exitR: number;
  source: string;
}

export const DEG = Math.PI / 180;

export function loopPolygon(l: FittedLoop): Float64Array {
  if (l.kind === 'circle') return circleToPolygon(l.cx, l.cy, l.r, !l.hole);
  return primitivesToPolygon(loopPrimitives(l));
}

/**
 * Labels each section segment with the wall plane (label p + 1) or coaxial
 * cylinder (label −(c + 1)) whose triangle produced it, and resolves a label
 * to that region's exact trace in the section plane at height `z`.
 */
export function loopGuide(an: MeshAnalysis, z: number, tris: Int32Array): LoopGuide {
  const { e1, e2, axis } = an.frame;
  const rot = (v: readonly number[]) => [
    v[0] * e1[0] + v[1] * e1[1] + v[2] * e1[2],
    v[0] * e2[0] + v[1] * e2[1] + v[2] * e2[2],
    v[0] * axis[0] + v[1] * axis[1] + v[2] * axis[2],
  ];
  const labels = Array.from(tris, (t) => {
    if (t < 0) return 0;
    const pl = an.seg.planeOf[t];
    if (pl >= 0) return pl + 1;
    const cy = an.seg.cylinderOf[t];
    return cy >= 0 ? -(cy + 1) : 0;
  });
  const cache = new Map<number, RegionSection | undefined>();
  return {
    labels,
    geometry(label: number): RegionSection | undefined {
      if (cache.has(label)) return cache.get(label);
      let out: RegionSection | undefined;
      if (label > 0) {
        const plane = an.seg.planes[label - 1];
        const n = rot(plane.normal);
        const nxy = Math.hypot(n[0], n[1]);
        if (Math.abs(n[2]) <= Math.sin(2 * DEG) && nxy > 0) {
          const d = plane.offset - n[2] * z;
          out = { kind: 'line', px: (n[0] * d) / (nxy * nxy), py: (n[1] * d) / (nxy * nxy), dx: -n[1] / nxy, dy: n[0] / nxy };
        }
      } else if (label < 0) {
        const c = an.seg.cylinders[-label - 1];
        const a = rot(c.axis);
        if (Math.abs(a[2]) >= Math.cos(2 * DEG) && c.coverageRad >= 10 * DEG) {
          const o = rot(c.origin);
          out = { kind: 'circle', cx: o[0], cy: o[1], r: c.radius };
        }
      }
      cache.set(label, out);
      return out;
    },
  };
}

function circleRegion(cx: number, cy: number, r: number): Region {
  return { poly: circleToPolygon(cx, cy, r, true), area: Math.PI * r * r, cx, cy };
}

function loopRegion(l: FittedLoop): Region {
  if (l.kind === 'circle') return circleRegion(l.cx, l.cy, l.r);
  const prims = loopPrimitives(l);
  const m = primitivesMoments(prims);
  return { poly: primitivesToPolygon(prims), area: m.area, cx: m.cx, cy: m.cy };
}

export function shiftLoop(l: FittedLoop, dx: number, dy: number): void {
  if (l.kind === 'circle') {
    l.cx -= dx;
    l.cy -= dy;
    return;
  }
  for (const s of l.segments) {
    if (s.geom.kind === 'line') {
      s.geom.px -= dx;
      s.geom.py -= dy;
    } else {
      s.geom.cx -= dx;
      s.geom.cy -= dy;
    }
  }
  for (let i = 0; i < l.points.length; i += 2) {
    l.points[i] -= dx;
    l.points[i + 1] -= dy;
  }
}

export function cloneLoop(l: FittedLoop): FittedLoop {
  if (l.kind === 'circle') return { ...l };
  return {
    kind: 'path',
    hole: l.hole,
    points: Float64Array.from(l.points),
    segments: l.segments.map((s) => ({ ...s, geom: { ...s.geom } })),
  };
}

export function buildBody(
  pass: PassParams,
  bands: BandLoops[],
  levels: number[],
  rawRel: number[],
  axisymmetric: boolean,
  tol: number,
  notRepresented: string[],
  addParam: (name: string, value: number, measured: number, description: string, grid?: number) => string,
  snapInfo: (value: number, measured: number) => { grid: number },
): { body: BodyPlan; bandBody: Region[][] } {
  // ---- body ---------------------------------------------------------------------------
  let body: BodyPlan;
  const bandBody: Region[][] = []; // per band: body outline regions (time 0)
  if (axisymmetric) {
    const steps: Array<{ r: number; rawR: number; i0: number; i1: number }> = [];
    bands.forEach((b, bi) => {
      const idx = b.depth.findIndex((d) => d === 0);
      const c = b.loops[idx] as Extract<FittedLoop, { kind: 'circle' }>;
      const rc = b.raw[idx] as Extract<FittedLoop, { kind: 'circle' }>;
      const last = steps[steps.length - 1];
      if (last && Math.abs(last.r - c.r) <= (pass.snapTol > 0 ? 1e-9 : pass.eps)) last.i1 = bi + 1;
      else steps.push({ r: c.r, rawR: rc.r, i0: bi, i1: bi + 1 });
    });
    const single = steps.length === 1;
    body = {
      kind: 'revolve',
      steps: steps.map((s, k) => {
        const rName = single ? 'radius' : `step${k + 1}Radius`;
        const hName = single ? 'height' : `step${k + 1}Height`;
        addParam(rName, s.r, s.rawR, single ? 'Outer radius of the turned body.' : `Outer radius of turned step ${k + 1} (from the base).`, snapInfo(s.r, s.rawR).grid);
        const h = levels[s.i1] - levels[s.i0];
        const rawH = rawRel[s.i1] - rawRel[s.i0];
        addParam(hName, h, rawH, single ? 'Height of the turned body.' : `Axial height of turned step ${k + 1}.`, snapInfo(h, rawH).grid);
        return { r: s.r, z0: levels[s.i0], z1: levels[s.i1], rParam: rName, hParam: hName };
      }),
    };
    bands.forEach((b, bi) => {
      const step = body.kind === 'revolve' ? body.steps.find((s) => s.z0 <= b.z0 + 1e-9 && s.z1 >= b.z1 - 1e-9)! : undefined;
      bandBody[bi] = [circleRegion(0, 0, step!.r)];
    });
  } else {
    const blocks: Array<{ z0: number; z1: number; i0: number; i1: number; bands: number[]; loops: FittedLoop[]; raw: FittedLoop[] }> = [];
    bands.forEach((b, bi) => {
      const outer = b.loops.filter((_, i) => b.depth[i] === 0);
      const rawOuter = b.raw.filter((_, i) => b.depth[i] === 0);
      b.loops.forEach((_, i) => {
        if (b.depth[i] >= 2) notRepresented.push(`band ${bi}: an island inside an inner loop (nesting depth ${b.depth[i]}) is not reconstructed.`);
      });
      const last = blocks[blocks.length - 1];
      if (last && sameOutline(last.loops, outer, tol)) {
        last.z1 = levels[bi + 1];
        last.i1 = bi + 1;
        last.bands.push(bi);
      } else {
        blocks.push({ z0: levels[bi], z1: levels[bi + 1], i0: bi, i1: bi + 1, bands: [bi], loops: outer, raw: rawOuter });
      }
    });
    let minExtent = Infinity;
    for (const blk of blocks) {
      for (const l of blk.loops) {
        const poly = loopPolygon(l);
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        for (let k = 0; k < poly.length; k += 2) {
          x0 = Math.min(x0, poly[k]);
          x1 = Math.max(x1, poly[k]);
          y0 = Math.min(y0, poly[k + 1]);
          y1 = Math.max(y1, poly[k + 1]);
        }
        minExtent = Math.min(minExtent, x1 - x0, y1 - y0);
      }
    }
    const single = blocks.length === 1;
    const angleTol = Math.max(pass.angleTolDeg, 0.5) * DEG;
    const coordTol = pass.snapTol > 0 ? 1e-6 : Math.max(1e-6, pass.eps);
    const coords = new CoordinateBook(coordTol);
    const cornerSets = blocks.map((blk) => {
      if (blk.loops.length !== 1 || blk.loops[0].kind !== 'path') return undefined;
      const corners = rectilinearCorners(loopPrimitives(blk.loops[0]), angleTol, Math.max(2 * tol, 1e-3));
      if (!corners) return undefined;
      let first = 0;
      corners.forEach((c, i) => {
        if (Math.hypot(c.x, c.y) < Math.hypot(corners[first].x, corners[first].y) - 1e-9) first = i;
      });
      return [...corners.slice(first), ...corners.slice(0, first)];
    });
    // One radius param per distinct corner-round radius, shared by all blocks.
    const radiusValues: number[] = [];
    for (const cs of cornerSets) for (const c of cs ?? []) if (c.r > 0 && !radiusValues.some((r) => Math.abs(r - c.r) <= coordTol)) radiusValues.push(c.r);
    const radiusNames = new Map<number, string>();
    const radiusExpr = (r: number, measured: number): string => {
      const i = radiusValues.findIndex((v) => Math.abs(v - r) <= coordTol);
      const existing = radiusNames.get(i);
      if (existing) return existing;
      const name = radiusValues.length === 1 ? 'cornerRadius' : `corner${i + 1}Radius`;
      addParam(name, radiusValues[i], measured, 'Radius of the tangent corner rounds in the extruded profile.', snapInfo(radiusValues[i], measured).grid);
      radiusNames.set(i, name);
      return name;
    };
    body = {
      kind: 'extrude',
      blocks: blocks.map((blk, k) => {
        const h = blk.z1 - blk.z0;
        const rawH = rawRel[blk.i1] - rawRel[blk.i0];
        const hName = single ? (h <= 0.5 * minExtent ? 'thickness' : 'height') : `block${k + 1}Height`;
        const loops: LoopOut[] = blk.loops.map((l) =>
          l.kind === 'circle' ? { kind: 'circle', cx: l.cx, cy: l.cy, r: l.r } : { kind: 'path', prims: startNearOrigin(loopPrimitives(l)) },
        );
        const sharpened = blk.bands.some((bi) => bands[bi].sharpened > 0);
        const measured = rawMeasures(blk.raw, 2 * tol + 1e-3);
        const addDim = (name: string, value: number, meas: number, description: string) => {
          addParam(name, value, meas, description, snapInfo(value, meas).grid);
          return name;
        };
        let profile: ProfileOut | undefined;
        let outline: OutlineKind = 'literal';
        const corners = cornerSets[k];
        if (corners) {
          const pp = paramProfile(k + 1, corners, coords, addDim, measured.coordinate, (r) => radiusExpr(r, measured.radius(corners, r)));
          profile = { kind: 'corners', corners: pp.corners };
          outline = pp.kind;
        } else if (loops.length === 1 && loops[0].kind === 'circle') {
          const c = loops[0];
          const rawC = blk.raw[0].kind === 'circle' ? blk.raw[0] : undefined;
          const rName = addDim(single ? 'radius' : `block${k + 1}Radius`, c.r, rawC ? rawC.r : c.r, `Radius of the round profile${single ? '' : ` of block ${k + 1}`}.`);
          profile = { kind: 'circle', cx: coords.lookup('x', c.cx) ?? num3(c.cx), cy: coords.lookup('y', c.cy) ?? num3(c.cy), r: rName };
          outline = 'circle';
        }
        addParam(hName, h, rawH, single ? 'Extrusion length of the profile.' : `Extrusion length of block ${k + 1} (from the base).`, snapInfo(h, rawH).grid);
        const hasArcs = profile?.kind === 'corners' ? profile.corners.some((c) => c.r !== undefined) : !profile && loops.some((l) => l.kind === 'path' && l.prims.some((p) => p.kind === 'arc'));
        const rounds: RoundsKind = sharpened ? 'fillet' : hasArcs ? 'arcs' : 'none';
        return { z0: blk.z0, z1: blk.z1, loops, hParam: hName, outline, rounds, ...(profile ? { profile } : {}) };
      }),
    };
    bands.forEach((_, bi) => {
      const blk = blocks.find((x) => x.bands.includes(bi))!;
      bandBody[bi] = blk.loops.map(loopRegion);
    });
  }
  return { body, bandBody };
}

export function buildFaceBook(nb: number, bandBody: Region[][], levels: number[], tol: number, body: BodyPlan): FaceBook {
  // ---- face book (time 0) -------------------------------------------------------------
  const book = new FaceBook(tol);
  for (let L = 0; L <= nb; L++) {
    const below = L >= 1 ? bandBody[L - 1] : [];
    const above = L < nb ? bandBody[L] : [];
    if (below.length > 0) book.addDifference('Z', levels[L], below, above);
    if (above.length > 0) book.addDifference('-Z', levels[L], above, below);
  }
  if (body.kind === 'extrude') {
    for (const blk of body.blocks) {
      for (const loop of blk.loops) {
        if (loop.kind !== 'path') continue;
        for (const p of loop.prims) {
          if (p.kind !== 'line') continue;
          const dx = p.b[0] - p.a[0];
          const dy = p.b[1] - p.a[1];
          const len = Math.hypot(dx, dy);
          if (len < 1e-9) continue;
          let label: AxisLabel | undefined;
          let level = 0;
          let s0 = 0, s1 = 0;
          if (Math.abs(dy) < 1e-9) {
            label = dx > 0 ? '-Y' : 'Y';
            level = p.a[1];
            s0 = Math.min(p.a[0], p.b[0]);
            s1 = Math.max(p.a[0], p.b[0]);
          } else if (Math.abs(dx) < 1e-9) {
            label = dy > 0 ? 'X' : '-X';
            level = p.a[0];
            s0 = Math.min(p.a[1], p.b[1]);
            s1 = Math.max(p.a[1], p.b[1]);
          }
          if (!label) continue;
          const rect = Float64Array.from([s0, blk.z0, s1, blk.z0, s1, blk.z1, s0, blk.z1]);
          book.addDifference(label, level, [polygonRegion(rect)], []);
        }
      }
    }
  }
  return book;
}

export function buildAxisHoleRuns(
  bands: BandLoops[],
  levels: number[],
  rawRel: number[],
  nb: number,
  pass: PassParams,
  ctol: number,
  allAir: (bi: number, pts: V2[]) => boolean,
  drills: Drill[],
  remainderCyl: Array<{ axis: 'Z' | 'X' | 'Y'; base: V3; length: number; radius: number; source: string }>,
  entryAssumptions: EntrySideAssumption[],
): void {
  // ---- axis hole runs ------------------------------------------------------------------------
  interface CircleRef {
    band: number;
    cx: number;
    cy: number;
    r: number;
    rawR: number;
  }
  const circles: CircleRef[] = [];
  bands.forEach((b, bi) =>
    b.loops.forEach((l, li) => {
      if (b.depth[li] !== 1 || l.kind !== 'circle') return;
      const raw = b.raw[li] as Extract<FittedLoop, { kind: 'circle' }>;
      circles.push({ band: bi, cx: l.cx, cy: l.cy, r: l.r, rawR: raw.r });
    }),
  );
  const clusters: CircleRef[][] = [];
  for (const c of circles) {
    const cl = clusters.find((g) => Math.hypot(g[0].cx - c.cx, g[0].cy - c.cy) <= ctol);
    if (cl) cl.push(c);
    else clusters.push([c]);
  }

  clusters.sort((a, b) => a[0].cy - b[0].cy || a[0].cx - b[0].cx);
  for (const cl of clusters) {
    cl.sort((a, b) => a.band - b.band);
    const cx = cl[0].cx;
    const cy = cl[0].cy;
    let start = 0;
    while (start < cl.length) {
      let end = start;
      while (end + 1 < cl.length && cl[end + 1].band === cl[end].band + 1) end++;
      const run = cl.slice(start, end + 1);
      start = end + 1;
      const b0 = run[0].band;
      const b1 = run[run.length - 1].band;
      const ring = (r: number): V2[] => [
        [cx, cy],
        ...Array.from({ length: 8 }, (_, k) => [cx + 0.85 * r * Math.cos((k * Math.PI) / 4), cy + 0.85 * r * Math.sin((k * Math.PI) / 4)] as V2),
      ];
      const openHigh = b1 === nb - 1 || allAir(b1 + 1, ring(run[run.length - 1].r));
      const openLow = b0 === 0 || allAir(b0 - 1, ring(run[0].r));
      const segs = mergeSegs(
        run.map((c) => ({ r: c.r, rawR: c.rawR, t0: levels[c.band], t1: levels[c.band + 1], rawT0: rawRel[c.band], rawT1: rawRel[c.band + 1] })),
        pass,
      );
      decomposeRun(segs, openLow, openHigh, 'Z', [cx, cy], `hole at (${fmt(cx)}, ${fmt(cy)})`, drills, remainderCyl, entryAssumptions);
    }
  }
}

export function buildCrossBores(
  an: MeshAnalysis,
  pass: PassParams,
  origin: V3,
  ctol: number,
  literalSnaps: SnapRecord[],
  drills: Drill[],
  remainderCyl: Array<{ axis: 'Z' | 'X' | 'Y'; base: V3; length: number; radius: number; source: string }>,
  entryAssumptions: EntrySideAssumption[],
): void {
  // ---- cross bores --------------------------------------------------------------------------
  const crossRuns: Array<{ axis: 'X' | 'Y'; s: number; z: number; segs: RunSeg[] }> = [];
  for (const cb of an.crossBores) {
    const s = snapValue(cb.s - (cb.axis === 'X' ? origin[1] : origin[0]), pass.snapTol);
    const z = snapValue(cb.z - origin[2], pass.snapTol);
    const d = snapValue(2 * cb.radius, pass.snapTol);
    const shiftT = cb.axis === 'X' ? origin[0] : origin[1];
    const t0 = snapValue(cb.tMin - shiftT, pass.snapTol).value;
    const t1 = snapValue(cb.tMax - shiftT, pass.snapTol).value;
    for (const [what, m, sv] of [['s', cb.s, s], ['z', cb.z, z]] as const) {
      if (sv.snapped) literalSnaps.push({ what: `crossBore.${cb.axis}.${what}`, measured: m, value: sv.value, grid: sv.grid });
    }
    const seg: RunSeg = { r: d.value / 2, rawR: cb.radius, t0, t1, rawT0: cb.tMin - shiftT, rawT1: cb.tMax - shiftT };
    const run = crossRuns.find((r) => r.axis === cb.axis && Math.abs(r.s - s.value) <= ctol && Math.abs(r.z - z.value) <= ctol);
    if (run) run.segs.push(seg);
    else crossRuns.push({ axis: cb.axis, s: s.value, z: z.value, segs: [seg] });
  }
  for (const run of crossRuns) {
    run.segs.sort((a, b) => a.t0 - b.t0);
    // Split at gaps along the axis.
    const groups: RunSeg[][] = [];
    for (const sg of run.segs) {
      const g = groups[groups.length - 1];
      if (g && sg.t0 - g[g.length - 1].t1 <= ctol) {
        sg.t0 = g[g.length - 1].t1;
        sg.rawT0 = g[g.length - 1].rawT1;
        g.push(sg);
      } else groups.push([sg]);
    }
    for (const g of groups) {
      const segs = mergeSegs(g, pass);
      const tLow = segs[0].t0;
      const tHigh = segs[segs.length - 1].t1;
      const delta = Math.max(0.1, 3 * pass.eps);
      const probe = (t: number, r: number) => {
        const pts: V3[] = [];
        const around: V2[] = [[0, 0], ...Array.from({ length: 8 }, (_, k) => [0.85 * r * Math.cos((k * Math.PI) / 4), 0.85 * r * Math.sin((k * Math.PI) / 4)] as V2)];
        for (const [a, b] of around) {
          const p: V3 = run.axis === 'X' ? [t, run.s + a, run.z + b] : [run.s + a, t, run.z + b];
          pts.push([p[0] + origin[0], p[1] + origin[1], p[2] + origin[2]]);
        }
        return pts.every((p) => !pointInsideMesh({ positions: an.canonical, indices: an.mesh.triangles }, p[0], p[1], p[2]));
      };
      const openHigh = probe(tHigh + delta, segs[segs.length - 1].r);
      const openLow = probe(tLow - delta, segs[0].r);
      decomposeRun(segs, openLow, openHigh, run.axis, [run.s, run.z], `cross bore along ${run.axis} at (${fmt(run.s)}, ${fmt(run.z)})`, drills, remainderCyl, entryAssumptions);
    }
  }
}

interface InnerRef {
  band: number;
  loop: Extract<FittedLoop, { kind: 'path' }>;
  poly: Float64Array;
  area: number;
  cx: number;
  cy: number;
  samples: V2[];
}

export function buildCutoutRuns(bands: BandLoops[], tol: number, ctol: number): InnerRef[][] {
  // ---- cutout runs --------------------------------------------------------------------------
  const inners: InnerRef[] = [];
  bands.forEach((b, bi) =>
    b.loops.forEach((l, li) => {
      if (b.depth[li] !== 1 || l.kind !== 'path') return;
      const poly = b.polys[li];
      const m = primitivesMoments(loopPrimitives(l));
      inners.push({ band: bi, loop: l, poly, area: m.area, cx: m.cx, cy: m.cy, samples: interiorSamples(poly) });
    }),
  );
  const cutoutRuns: InnerRef[][] = [];
  for (const inner of inners.sort((a, b) => a.band - b.band)) {
    const run = cutoutRuns.find((r) => {
      const last = r[r.length - 1];
      return (
        last.band === inner.band - 1 &&
        Math.abs(last.area - inner.area) <= 0.01 * last.area &&
        Math.hypot(last.cx - inner.cx, last.cy - inner.cy) <= ctol &&
        maxBoundaryGap(last.poly, inner.poly) <= 2 * tol
      );
    });
    if (run) run.push(inner);
    else cutoutRuns.push([inner]);
  }
  return cutoutRuns;
}

export function emitCutoutOps(
  cutoutRuns: InnerRef[][],
  nb: number,
  levels: number[],
  rawRel: number[],
  allAir: (bi: number, pts: V2[]) => boolean,
  book: FaceBook,
  levelTol: number,
  addParam: (name: string, value: number, measured: number, description: string, grid?: number) => string,
  snapInfo: (value: number, measured: number) => { grid: number },
  notRepresented: string[],
  ops: Op[],
): Op[] {
  // ---- order + emit ops --------------------------------------------------------------------
  let pocketN = 0;
  const cutoutOps: Op[] = [];
  const remainderPrisms: Op[] = [];
  cutoutRuns.sort((a, b) => levels[b[b.length - 1].band + 1] - levels[a[a.length - 1].band + 1]);
  for (const run of cutoutRuns) {
    const first = run[0];
    const last = run[run.length - 1];
    const openHigh = last.band === nb - 1 || allAir(last.band + 1, last.samples);
    const openLow = first.band === 0 || allAir(first.band - 1, first.samples);
    const tLow = levels[first.band];
    const tHigh = levels[last.band + 1];
    const prims = loopPrimitives(first.loop);
    if (!openHigh && !openLow) {
      remainderPrisms.push({ kind: 'subtractPrism', name: `void${remainderPrisms.length + 1}`, prims, z0: tLow, length: tHigh - tLow });
      notRepresented.push(`inner loop at (${fmt(first.cx)}, ${fmt(first.cy)}): its opening is covered by material, so no face-based cutout reaches it; subtracted as a boolean.`);
      continue;
    }
    const fromHigh = openHigh;
    const label: AxisLabel = fromHigh ? 'Z' : '-Z';
    const entryLevel = fromHigh ? tHigh : tLow;
    const probePt = first.samples[0] ?? [first.cx, first.cy];
    const piece = book.find(label, entryLevel, probePt, levelTol);
    if (!piece) {
      remainderPrisms.push({ kind: 'subtractPrism', name: `void${remainderPrisms.length + 1}`, prims, z0: tLow, length: tHigh - tLow });
      notRepresented.push(`pocket at (${fmt(first.cx)}, ${fmt(first.cy)}): no planar entry face found; subtracted as a boolean.`);
      continue;
    }
    pocketN++;
    const name = `pocket${pocketN}`;
    const depth = tHigh - tLow;
    const rawDepth = rawRel[last.band + 1] - rawRel[first.band];
    const depthParam = addParam(`${name}Depth`, depth, rawDepth, `Depth of ${name}.`, snapInfo(depth, rawDepth).grid);
    const sign = fromHigh ? 1 : -1;
    const uvPrims = prims.map((p) => mapPrim(p, (q) => [q[0] - piece.cx, sign * (q[1] - piece.cy)], !fromHigh));
    const at = book.centroid3D(piece);
    cutoutOps.push({ kind: 'cutout', name, face: faceRef(book, piece, levelTol), prims: uvPrims, depth, depthParam, at });
    book.removeMoments(piece, first.area, first.cx, first.cy, first.poly);
    if (openHigh && openLow) {
      const exit = book.find(oppositeLabel(label), fromHigh ? tLow : tHigh, probePt, levelTol);
      if (exit) book.removeMoments(exit, first.area, first.cx, first.cy, first.poly);
    } else {
      book.addDifference(label, fromHigh ? tLow : tHigh, [{ poly: first.poly, area: first.area, cx: first.cx, cy: first.cy }], [], true);
    }
  }
  ops.push(...cutoutOps);
  return remainderPrisms;
}

interface ResolvedDrill {
  drill: Drill;
  piece: FacePiece;
}

function resolveDrills(
  drills: Drill[],
  book: FaceBook,
  levelTol: number,
  remainderCyl: Array<{ axis: 'Z' | 'X' | 'Y'; base: V3; length: number; radius: number; source: string }>,
  notRepresented: string[],
): ResolvedDrill[] {
  const resolved: ResolvedDrill[] = [];
  const axisOrder = { Z: 0, X: 1, Y: 2 } as const;
  drills.sort((a, b) => axisOrder[a.axis] - axisOrder[b.axis] || b.entryLevel - a.entryLevel || a.center[1] - b.center[1] || a.center[0] - b.center[0]);
  for (const d of drills) {
    const label = entryLabel(d);
    const piece = book.find(label, d.entryLevel, d.center, levelTol);
    if (!piece) {
      remainderCyl.push({ axis: d.axis, base: cylinderBase(d), length: d.length, radius: d.diameter / 2, source: d.source });
      if (d.counterbore) {
        const cbBase = cylinderBase({ ...d, length: d.counterbore.depth });
        remainderCyl.push({ axis: d.axis, base: cbBase, length: d.counterbore.depth, radius: d.counterbore.r, source: d.source });
      }
      notRepresented.push(`${d.source}: no planar entry face found; subtracted as a boolean.`);
      continue;
    }
    resolved.push({ drill: d, piece });
  }
  return resolved;
}

function groupResolvedDrills(resolved: ResolvedDrill[]): ResolvedDrill[][] {
  const groups: ResolvedDrill[][] = [];
  for (const r of resolved) {
    const key = (x: ResolvedDrill) =>
      [x.piece.id, x.drill.axis, x.drill.diameter, x.drill.through ? 'T' : x.drill.length, x.drill.exitLevel, x.drill.counterbore ? `${x.drill.counterbore.r}/${x.drill.counterbore.depth}` : '-'].join('|');
    const g = groups.find((grp) => key(grp[0]) === key(r));
    if (g) g.push(r);
    else groups.push([r]);
  }
  return groups;
}

function emitHoleGroupOps(
  g: ResolvedDrill[],
  name: string,
  piece: FacePiece,
  book: FaceBook,
  levelTol: number,
  pass: PassParams,
  addParam: (name: string, value: number, measured: number, description: string, grid?: number) => string,
  snapInfo: (value: number, measured: number) => { grid: number },
  ops: Op[],
  holeSummary: FeaturePlan['holeSummary'],
  removeDisk: (piece: FacePiece | undefined, c: V2, r: number) => void,
): void {
  const { drill: d } = g[0];
  const centroid: V2 = [piece.cx, piece.cy];
  const positions = g.map(({ drill }) => ({
    u: roundUv(drill.center[0] - centroid[0]),
    v: roundUv(drill.center[1] - centroid[1]),
    at: fromFace2D(piece.normal, piece.level, drill.center),
  }));
  const thr = pass.allowThroughKeyword && d.through ? book.throughDepth(piece, d.diameter) : undefined;
  const useThroughKeyword = thr !== undefined && Math.abs(thr - d.length) <= 1e-6;
  const diameterParam = addParam(`${name}Diameter`, d.diameter, d.measuredDiameter, `Bore diameter of ${name}.`, snapInfo(d.diameter, d.measuredDiameter).grid);
  let depthParam: string | undefined;
  if (!useThroughKeyword) {
    depthParam = addParam(`${name}Depth`, d.length, d.rawLength, d.through ? `Wall thickness ${name} passes through.` : `Blind depth of ${name}.`, snapInfo(d.length, d.rawLength).grid);
  }
  let counterbore: Extract<Op, { kind: 'holes' }>['counterbore'];
  if (d.counterbore) {
    const cbD = 2 * d.counterbore.r;
    counterbore = {
      diameter: cbD,
      depth: d.counterbore.depth,
      diameterParam: addParam(`${name}CounterboreDiameter`, cbD, 2 * d.counterbore.rawR, `Counterbore diameter of ${name}.`, snapInfo(cbD, 2 * d.counterbore.rawR).grid),
      depthParam: addParam(`${name}CounterboreDepth`, d.counterbore.depth, d.counterbore.rawDepth, `Counterbore depth of ${name}.`, snapInfo(d.counterbore.depth, d.counterbore.rawDepth).grid),
    };
  }
  ops.push({
    kind: 'holes',
    name,
    axis: d.axis,
    face: faceRef(book, piece, levelTol),
    positions,
    diameter: d.diameter,
    diameterParam,
    depth: useThroughKeyword ? 'through' : d.length,
    depthParam,
    counterbore,
  });
  holeSummary.push({
    name,
    axis: d.axis,
    count: g.length,
    diameterMm: d.diameter,
    kind: d.through ? 'through' : 'blind',
    ...(d.counterbore ? { counterbore: { diameterMm: 2 * d.counterbore.r, depthMm: d.counterbore.depth } } : {}),
  });
  // Bookkeeping: entry rim, exit rim, created floors.
  const entry = entryLabel(d);
  for (const { drill } of g) {
    removeDisk(piece, drill.center, drill.rimR);
    if (drill.through) {
      removeDisk(book.find(oppositeLabel(entry), drill.exitLevel, drill.center, levelTol), drill.center, drill.exitR);
    } else {
      const floorLevel = drill.fromHigh ? drill.entryLevel - drill.length : drill.entryLevel + drill.length;
      book.addDifference(entry, floorLevel, [circleRegion(drill.center[0], drill.center[1], drill.diameter / 2)], [], true);
    }
    if (drill.counterbore) {
      const cbLevel = drill.fromHigh ? drill.entryLevel - drill.counterbore.depth : drill.entryLevel + drill.counterbore.depth;
      book.addDifference(
        entry,
        cbLevel,
        [circleRegion(drill.center[0], drill.center[1], drill.counterbore.r)],
        [circleRegion(drill.center[0], drill.center[1], drill.diameter / 2)],
        true,
      );
    }
  }
}

export function emitDrillOps(
  drills: Drill[],
  remainderCyl: Array<{ axis: 'Z' | 'X' | 'Y'; base: V3; length: number; radius: number; source: string }>,
  book: FaceBook,
  levelTol: number,
  pass: PassParams,
  addParam: (name: string, value: number, measured: number, description: string, grid?: number) => string,
  snapInfo: (value: number, measured: number) => { grid: number },
  notRepresented: string[],
  ops: Op[],
  holeSummary: FeaturePlan['holeSummary'],
): void {
  // Drill groups: same entry piece + same spec → one `.holes()` record.
  const resolved = resolveDrills(drills, book, levelTol, remainderCyl, notRepresented);
  const groups = groupResolvedDrills(resolved);
  let holeN = 0;
  let crossN = 0;
  const removedDisks = new Map<number, Array<{ c: V2; r: number }>>();
  const removeDisk = (piece: FacePiece | undefined, c: V2, r: number) => {
    if (!piece) return;
    const list = removedDisks.get(piece.id) ?? [];
    const prev = list.find((d) => Math.hypot(d.c[0] - c[0], d.c[1] - c[1]) <= 1e-6);
    const prevR = prev ? prev.r : 0;
    if (r <= prevR) return;
    const area = Math.PI * (r * r - prevR * prevR);
    book.removeMoments(piece, area, c[0], c[1], circleToPolygon(c[0], c[1], r, true, 64));
    if (prev) prev.r = r;
    else list.push({ c, r });
    removedDisks.set(piece.id, list);
  };
  for (const g of groups) {
    const { drill: d, piece } = g[0];
    const isCross = d.axis !== 'Z';
    const base = isCross ? `crossHole${++crossN}` : `hole${++holeN}`;
    const name = g.length > 1 ? `${base.replace(/Hole/, 'Holes').replace(/^hole/, 'holes')}` : base;
    emitHoleGroupOps(g, name, piece, book, levelTol, pass, addParam, snapInfo, ops, holeSummary, removeDisk);
  }
}

/**
 * Remove tangent line–arc–line corner rounds from a snapped outer profile,
 * leaving the sharp corner the two lines meet at. Returns how many arcs went.
 */
export function sharpenFilletArcs(loop: FittedLoop): number {
  if (loop.kind !== 'path') return 0;
  let removed = 0;
  for (let k = loop.segments.length - 1; k >= 0 && loop.segments.length > 3; k--) {
    const n = loop.segments.length;
    const seg = loop.segments[k];
    const prev = loop.segments[(k - 1 + n) % n].geom;
    const next = loop.segments[(k + 1) % n].geom;
    if (seg.geom.kind !== 'arc' || prev.kind !== 'line' || next.kind !== 'line') continue;
    const g = seg.geom;
    const offset = (l: typeof prev) => Math.abs((g.cx - l.px) * -l.dy + (g.cy - l.py) * l.dx);
    const tangentTol = Math.max(0.05 * g.r, 0.05);
    if (Math.abs(offset(prev) - g.r) > tangentTol || Math.abs(offset(next) - g.r) > tangentTol) continue;
    const cross = prev.dx * next.dy - prev.dy * next.dx;
    const turn = Math.atan2(cross, prev.dx * next.dx + prev.dy * next.dy);
    if (Math.abs(cross) < Math.sin(10 * DEG) || Math.abs(turn) > 120 * DEG) continue;
    loop.segments.splice(k, 1);
    removed++;
  }
  return removed;
}

// ---------------------------------------------------------------------------

function fmt(v: number): string {
  return String(Math.round(v * 1000) / 1000);
}

function roundUv(v: number): number {
  const r = Math.round(v * 1000) / 1000;
  return Object.is(r, -0) ? 0 : r;
}

/** Rotate a closed chain so it starts at the joint nearest the origin — the
 *  corner a reader expects a profile to begin from. */
function startNearOrigin(prims: ProfilePrim[]): ProfilePrim[] {
  if (prims.length === 0) return prims;
  let best = 0;
  let bestD = Infinity;
  prims.forEach((p, i) => {
    const d = Math.hypot(p.a[0], p.a[1]);
    if (d < bestD - 1e-9) {
      bestD = d;
      best = i;
    }
  });
  return [...prims.slice(best), ...prims.slice(0, best)];
}

export function nestingDepth(polys: Float64Array[], i: number): number {
  const x = polys[i][0];
  const y = polys[i][1];
  let d = 0;
  polys.forEach((p, j) => {
    if (j !== i && pointInPolygon(x, y, p)) d++;
  });
  return d;
}

function sameOutline(a: FittedLoop[], b: FittedLoop[], tol: number): boolean {
  if (a.length !== b.length) return false;
  const pa = a.map(loopPolygon);
  const pb = b.map(loopPolygon);
  return pa.every((poly) => pb.some((other) => maxBoundaryGap(poly, other) <= 2 * tol));
}

/** Max distance from any vertex of either polygon to the other's boundary. */
function maxBoundaryGap(a: Float64Array, b: Float64Array): number {
  let g = 0;
  const stride = (p: Float64Array) => Math.max(1, Math.floor(p.length / 2 / 128));
  for (let i = 0; i < a.length; i += 2 * stride(a)) g = Math.max(g, distanceToPolygon(a[i], a[i + 1], b));
  for (let i = 0; i < b.length; i += 2 * stride(b)) g = Math.max(g, distanceToPolygon(b[i], b[i + 1], a));
  return g;
}

function interiorSamples(poly: Float64Array): V2[] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < poly.length; i += 2) {
    x0 = Math.min(x0, poly[i]);
    x1 = Math.max(x1, poly[i]);
    y0 = Math.min(y0, poly[i + 1]);
    y1 = Math.max(y1, poly[i + 1]);
  }
  const out: V2[] = [];
  const n = 7;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = x0 + ((i + 0.5) / n) * (x1 - x0);
      const y = y0 + ((j + 0.5) / n) * (y1 - y0);
      if (pointInPolygon(x, y, poly) && distanceToPolygon(x, y, poly) > 1e-3) out.push([x, y]);
    }
  }
  return out;
}

function mergeSegs(segs: RunSeg[], pass: PassParams): RunSeg[] {
  const out: RunSeg[] = [];
  const same = pass.snapTol > 0 ? 1e-9 : Math.max(pass.eps, 1e-9);
  for (const s of segs) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.r - s.r) <= same && Math.abs(last.t1 - s.t0) <= 1e-6) {
      last.t1 = s.t1;
      last.rawT1 = s.rawT1;
    } else out.push({ ...s });
  }
  return out;
}

function entryLabel(d: Drill): AxisLabel {
  return (d.fromHigh ? d.axis : `-${d.axis}`) as AxisLabel;
}

/** Base point of a subtractive cylinder for the drill's full cut. */
function cylinderBase(d: Pick<Drill, 'axis' | 'fromHigh' | 'entryLevel' | 'length' | 'center'>): V3 {
  const tStart = d.fromHigh ? d.entryLevel - d.length : d.entryLevel;
  return d.axis === 'Z'
    ? [d.center[0], d.center[1], tStart]
    : d.axis === 'X'
      ? [tStart, d.center[0], d.center[1]]
      : [d.center[0], tStart, d.center[1]];
}

function faceRef(book: FaceBook, piece: FacePiece, levelTol: number): FaceRef {
  const shared = book.countOnPlane(piece.normal, piece.level, levelTol);
  return {
    byNormal: piece.normal,
    level: piece.level,
    ...(shared > 1 ? { near: book.centroid3D(piece).map((v) => roundUv(v)) as V3 } : {}),
  };
}

function mapPrim(p: ProfilePrim, f: (q: V2) => V2, mirrored: boolean): ProfilePrim {
  if (p.kind === 'line') return { kind: 'line', a: f(p.a), b: f(p.b) };
  return { kind: 'arc', a: f(p.a), b: f(p.b), c: f(p.c), r: p.r, ccw: mirrored ? !p.ccw : p.ccw };
}

/**
 * Split one bore run (segments ascending along t) into drillable holes:
 * the smallest radius spans the run (through when both ends are open, blind
 * from the open end otherwise); a single wider step at the entry becomes the
 * counterbore; further non-increasing steps from an open end become blind
 * holes from that end; anything undrillable (an undercut, or a run closed at
 * both ends) is a boolean remainder.
 */
export function decomposeRun(
  segs: RunSeg[],
  openLow: boolean,
  openHigh: boolean,
  axis: 'Z' | 'X' | 'Y',
  center: V2,
  source: string,
  drills: Drill[],
  remainder: Array<{ axis: 'Z' | 'X' | 'Y'; base: V3; length: number; radius: number; source: string }>,
  assumptions: EntrySideAssumption[],
): void {
  const tLow = segs[0].t0;
  const tHigh = segs[segs.length - 1].t1;
  const baseOf = (t0: number): V3 =>
    axis === 'Z' ? [center[0], center[1], t0] : axis === 'X' ? [t0, center[0], center[1]] : [center[0], t0, center[1]];
  if (!openLow && !openHigh) {
    for (const s of segs) remainder.push({ axis, base: baseOf(s.t0), length: s.t1 - s.t0, radius: s.r, source });
    return;
  }
  const rMin = Math.min(...segs.map((s) => s.r));
  const minSeg = segs.find((s) => s.r === rMin)!;
  const fromHigh = openHigh && (!openLow || segs[segs.length - 1].r >= segs[0].r);
  if (openHigh && openLow && Math.abs(segs[segs.length - 1].r - segs[0].r) <= 1e-9) {
    assumptions.push({
      feature: source,
      statement: `${source}: both ends are open and equal in size, so the drilling side is not recoverable from geometry; drilled from the ${axis === 'Z' ? '+Z (top)' : `+${axis}`} face.`,
    });
  }
  const ordered = fromHigh ? [...segs].reverse() : segs;
  const entryLevel = fromHigh ? tHigh : tLow;
  const farLevel = fromHigh ? tLow : tHigh;
  const through = openLow && openHigh;
  const len = (s: RunSeg) => s.t1 - s.t0;
  const rawLen = (s: RunSeg) => s.rawT1 - s.rawT0;

  let k = 0;
  const entrySteps: RunSeg[] = [];
  while (k < ordered.length && ordered[k].r > rMin + 1e-9) entrySteps.push(ordered[k++]);
  let m = ordered.length - 1;
  const farSteps: RunSeg[] = [];
  if (through) {
    while (m > k && ordered[m].r > rMin + 1e-9) farSteps.unshift(ordered[m--]);
  }
  const interior = ordered.slice(k, m + 1).filter((s) => s.r > rMin + 1e-9);
  for (const s of interior) remainder.push({ axis, base: baseOf(s.t0), length: len(s), radius: s.r, source });

  // Entry steps must narrow going in; a widening step is an undercut.
  const drillable = (steps: RunSeg[]) => steps.every((s, i) => i === 0 || s.r <= steps[i - 1].r + 1e-9);
  const entryOk = drillable(entrySteps);
  if (!entryOk) for (const s of entrySteps) remainder.push({ axis, base: baseOf(s.t0), length: len(s), radius: s.r, source });
  const farFromEnd = [...farSteps].reverse();
  const farOk = drillable(farFromEnd);
  if (!farOk) for (const s of farSteps) remainder.push({ axis, base: baseOf(s.t0), length: len(s), radius: s.r, source });

  const counterboreStep = entryOk && entrySteps.length > 0 ? entrySteps[0] : undefined;
  drills.push({
    axis,
    fromHigh,
    center,
    diameter: 2 * rMin,
    measuredDiameter: 2 * minSeg.rawR,
    length: tHigh - tLow,
    rawLength: segs[segs.length - 1].rawT1 - segs[0].rawT0,
    through,
    ...(counterboreStep
      ? { counterbore: { r: counterboreStep.r, rawR: counterboreStep.rawR, depth: len(counterboreStep), rawDepth: rawLen(counterboreStep) } }
      : {}),
    entryLevel,
    exitLevel: farLevel,
    rimR: counterboreStep ? counterboreStep.r : rMin,
    exitR: rMin,
    source,
  });
  if (entryOk) {
    let depth = counterboreStep ? len(counterboreStep) : 0;
    let rawDepth = counterboreStep ? rawLen(counterboreStep) : 0;
    for (const s of entrySteps.slice(1)) {
      depth += len(s);
      rawDepth += rawLen(s);
      drills.push({ axis, fromHigh, center, diameter: 2 * s.r, measuredDiameter: 2 * s.rawR, length: depth, rawLength: rawDepth, through: false, entryLevel, exitLevel: entryLevel, rimR: s.r, exitR: s.r, source: `${source} step` });
    }
  }
  if (through && farOk) {
    let depth = 0;
    let rawDepth = 0;
    for (const s of farFromEnd) {
      depth += len(s);
      rawDepth += rawLen(s);
      drills.push({ axis, fromHigh: !fromHigh, center, diameter: 2 * s.r, measuredDiameter: 2 * s.rawR, length: depth, rawLength: rawDepth, through: false, entryLevel: farLevel, exitLevel: farLevel, rimR: s.r, exitR: s.r, source: `${source} far step` });
    }
  }
}

/**
 * Measured (unsnapped) positions of a block's axis-aligned walls and corner
 * rounds, read from its raw loops: `coordinate` returns the measured wall
 * position nearest a snapped one, `radius` the measured round radius nearest
 * a snapped one.
 */
function rawMeasures(raw: FittedLoop[], within: number): {
  coordinate: (axis: 'x' | 'y', v: number) => number;
  radius: (corners: Corner[], r: number) => number;
} {
  const xs: number[] = [];
  const ys: number[] = [];
  const arcs: number[] = [];
  for (const l of raw) {
    if (l.kind !== 'path') continue;
    for (const seg of l.segments) {
      const g = seg.geom;
      if (g.kind === 'arc') arcs.push(g.r);
      else if (Math.abs(g.dx) <= Math.sin(5 * DEG)) xs.push(g.px);
      else if (Math.abs(g.dy) <= Math.sin(5 * DEG)) ys.push(g.py);
    }
  }
  const nearest = (vals: number[], v: number) => {
    let best = v;
    let d = within;
    for (const x of vals) {
      if (Math.abs(x - v) <= d) {
        d = Math.abs(x - v);
        best = x;
      }
    }
    return best;
  };
  return {
    coordinate: (axis, v) => nearest(axis === 'x' ? xs : ys, v),
    radius: (_corners, r) => nearest(arcs, r),
  };
}

function num3(v: number): string {
  const r = Math.round(v * 1000) / 1000;
  return Object.is(r, -0) || r === 0 ? '0' : String(r);
}

