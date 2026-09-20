// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { distanceToPolygon, pointInPolygon } from '../geom';
import {
  circleToPolygon,
  loopPrimitives,
  primitivesMoments,
  primitivesToPolygon,
  type FittedLoop,
  type LoopGuide,
  type ProfilePrim,
  type RegionSection,
} from '../profileFit';
import { FaceBook, polygonRegion, type AxisLabel, type Region } from '../faces';
import { CoordinateBook, paramProfile, rectilinearCorners, type Corner } from '../profileParams';
import type { MeshAnalysis } from '../analysis';
import {
  DEG,
  type BandLoops,
  type BodyPlan,
  type LoopOut,
  type OutlineKind,
  type PassParams,
  type ProfileOut,
  type RoundsKind,
} from './shared';

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

export function circleRegion(cx: number, cy: number, r: number): Region {
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
    const blocks: BodyBlock[] = [];
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
    const blockCtx: ExtrudeBlockContext = {
      single, minExtent, bands, rawRel, tol, cornerSets, coords, addParam, snapInfo, radiusExpr,
    };
    body = {
      kind: 'extrude',
      blocks: blocks.map((blk, k) => buildExtrudeBlock(blk, k, blockCtx)),
    };
    bands.forEach((_, bi) => {
      const blk = blocks.find((x) => x.bands.includes(bi))!;
      bandBody[bi] = blk.loops.map(loopRegion);
    });
  }
  return { body, bandBody };
}

interface BodyBlock {
  z0: number;
  z1: number;
  i0: number;
  i1: number;
  bands: number[];
  loops: FittedLoop[];
  raw: FittedLoop[];
}

interface ExtrudeBlockContext {
  single: boolean;
  minExtent: number;
  bands: BandLoops[];
  rawRel: number[];
  tol: number;
  cornerSets: Array<Corner[] | undefined>;
  coords: CoordinateBook;
  addParam: (name: string, value: number, measured: number, description: string, grid?: number) => string;
  snapInfo: (value: number, measured: number) => { grid: number };
  radiusExpr: (r: number, measured: number) => string;
}

type ExtrudeBlockOut = Extract<BodyPlan, { kind: 'extrude' }>['blocks'][number];

function buildExtrudeBlock(blk: BodyBlock, k: number, ctx: ExtrudeBlockContext): ExtrudeBlockOut {
  const h = blk.z1 - blk.z0;
  const rawH = ctx.rawRel[blk.i1] - ctx.rawRel[blk.i0];
  const hName = blockHeightName(h, ctx.single, k, ctx.minExtent);
  const loops: LoopOut[] = blockLoops(blk);
  const sharpened = blk.bands.some((bi) => ctx.bands[bi].sharpened > 0);
  const { profile, outline } = blockProfile(blk, k, ctx, loops);
  ctx.addParam(hName, h, rawH, ctx.single ? 'Extrusion length of the profile.' : `Extrusion length of block ${k + 1} (from the base).`, ctx.snapInfo(h, rawH).grid);
  const hasArcs = blockHasArcs(profile, loops);
  const rounds: RoundsKind = blockRounds(sharpened, hasArcs);
  return { z0: blk.z0, z1: blk.z1, loops, hParam: hName, outline, rounds, ...(profile ? { profile } : {}) };
}

function blockHeightName(h: number, single: boolean, k: number, minExtent: number): string {
  if (!single) return `block${k + 1}Height`;
  return h <= 0.5 * minExtent ? 'thickness' : 'height';
}

function blockLoops(blk: BodyBlock): LoopOut[] {
  return blk.loops.map((l) =>
    l.kind === 'circle' ? { kind: 'circle', cx: l.cx, cy: l.cy, r: l.r } : { kind: 'path', prims: startNearOrigin(loopPrimitives(l)) },
  );
}

function blockProfile(
  blk: BodyBlock,
  k: number,
  ctx: ExtrudeBlockContext,
  loops: LoopOut[],
): { profile: ProfileOut | undefined; outline: OutlineKind } {
  const measured = rawMeasures(blk.raw, 2 * ctx.tol + 1e-3);
  const addDim = (name: string, value: number, meas: number, description: string) => {
    ctx.addParam(name, value, meas, description, ctx.snapInfo(value, meas).grid);
    return name;
  };
  let profile: ProfileOut | undefined;
  let outline: OutlineKind = 'literal';
  const corners = ctx.cornerSets[k];
  if (corners) {
    const pp = paramProfile(k + 1, corners, ctx.coords, addDim, measured.coordinate, (r) => ctx.radiusExpr(r, measured.radius(corners, r)));
    profile = { kind: 'corners', corners: pp.corners };
    outline = pp.kind;
  } else if (loops.length === 1 && loops[0].kind === 'circle') {
    const c = loops[0];
    const rawC = blk.raw[0].kind === 'circle' ? blk.raw[0] : undefined;
    const rName = addDim(ctx.single ? 'radius' : `block${k + 1}Radius`, c.r, rawC ? rawC.r : c.r, `Radius of the round profile${ctx.single ? '' : ` of block ${k + 1}`}.`);
    profile = { kind: 'circle', cx: ctx.coords.lookup('x', c.cx) ?? num3(c.cx), cy: ctx.coords.lookup('y', c.cy) ?? num3(c.cy), r: rName };
    outline = 'circle';
  }
  return { profile, outline };
}

function blockHasArcs(profile: ProfileOut | undefined, loops: LoopOut[]): boolean {
  if (profile?.kind === 'corners') return profile.corners.some((c) => c.r !== undefined);
  return !profile && loops.some((l) => l.kind === 'path' && l.prims.some((p) => p.kind === 'arc'));
}

function blockRounds(sharpened: boolean, hasArcs: boolean): RoundsKind {
  if (sharpened) return 'fillet';
  if (hasArcs) return 'arcs';
  return 'none';
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
export function maxBoundaryGap(a: Float64Array, b: Float64Array): number {
  let g = 0;
  const stride = (p: Float64Array) => Math.max(1, Math.floor(p.length / 2 / 128));
  for (let i = 0; i < a.length; i += 2 * stride(a)) g = Math.max(g, distanceToPolygon(a[i], a[i + 1], b));
  for (let i = 0; i < b.length; i += 2 * stride(b)) g = Math.max(g, distanceToPolygon(b[i], b[i + 1], a));
  return g;
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
