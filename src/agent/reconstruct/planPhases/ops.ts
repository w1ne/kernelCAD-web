// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { V2, V3 } from '../geom';
import { circleToPolygon, loopPrimitives, type ProfilePrim } from '../profileFit';
import { fromFace2D, oppositeLabel, type AxisLabel, type FaceBook, type FacePiece } from '../faces';
import type { Drill } from '../decomposeRunPhases';
import type { FaceRef, FeaturePlan, Op, PassParams } from './shared';
import type { InnerRef } from './runs';
import { circleRegion } from './body';
import { fmt, roundUv } from './format';

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
