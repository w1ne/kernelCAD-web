// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/reconstruct/plan.ts
//
// One refinement pass: fit + snap the band sections, decide the body
// (revolve for concentric round stacks, extruded blocks otherwise), turn
// circle stacks into drilled holes, non-circular inner stacks into cutouts,
// cardinal cross bores into side-drilled holes, and whatever cannot be drilled
// into boolean subtractions — then order those features and resolve each one's
// entry face, centroid-relative position and through/blind depth against the
// face book, so the emitted script lowers to the geometry that was measured.
//
// The body/face-book/hole/cutout phase implementations live in ./planPhases,
// split out to keep this file under the file-length ratchet.

import {
  pointInPolygon,
  type V2,
  type V3,
} from './geom';
import {
  fitLoop,
  snapLoop,
  snapValue,
  type FittedLoop,
  type SnapRecord,
} from './profileFit';
import type { EdgeQueryOut } from './blends';
import type { MeshAnalysis } from './analysis';
import {
  buildAxisHoleRuns,
  buildBody,
  buildCrossBores,
  buildCutoutRuns,
  buildFaceBook,
  cloneLoop,
  decomposeRun,
  DEG,
  emitCutoutOps,
  emitDrillOps,
  loopGuide,
  loopPolygon,
  nestingDepth,
  sharpenFilletArcs,
  shiftLoop,
  type BandLoops,
  type Drill,
  type EntrySideAssumption,
  type FeaturePlan,
  type Op,
  type ParamDecl,
  type PassParams,
} from './planPhases';

export type {
  BandLoops,
  BodyPlan,
  Drill,
  EntrySideAssumption,
  FaceRef,
  FeaturePlan,
  LoopOut,
  Op,
  OutlineKind,
  ParamDecl,
  PassParams,
  ProfileOut,
  RoundsKind,
} from './planPhases';

export function buildPlan(an: MeshAnalysis, pass: PassParams): FeaturePlan {
  const notRepresented: string[] = [];
  const literalSnaps: SnapRecord[] = [];
  let sharpenedArcs = 0;
  const tol = Math.max(pass.eps, pass.snapTol, 1e-3);

  const { fitted, axisymmetric, origin } = fitLoopsAndOrigin(an, pass, literalSnaps);

  const bandsOut = buildBands(an, pass, fitted, origin, literalSnaps);
  const { bands, nb, levels, rawRel } = bandsOut;
  sharpenedArcs += bandsOut.sharpenedArcs;

  const params: ParamDecl[] = [];
  const addParam = (name: string, value: number, measured: number, description: string, grid = 0.001): string => {
    params.push({ name, value, measured, snapped: Math.abs(value - measured) > 1e-9 && grid !== 0.001, grid, description });
    return name;
  };
  const snapInfo = (value: number, measured: number) => {
    const s = snapValue(measured, pass.snapTol);
    return { grid: Math.abs(s.value - value) < 1e-9 ? s.grid : 0.001 };
  };

  const { body, bandBody } = buildBody(pass, bands, levels, rawRel, axisymmetric, tol, notRepresented, addParam, snapInfo);

  const book = buildFaceBook(nb, bandBody, levels, tol, body);

  const levelTol = Math.max(2 * tol, 0.05);
  const ops: Op[] = [];
  const entryAssumptions: EntrySideAssumption[] = [];
  const holeSummary: FeaturePlan['holeSummary'] = [];

  // ---- material test ---------------------------------------------------------------------
  const materialAt = (bi: number, x: number, y: number): boolean => {
    const b = bands[bi];
    let inside = 0;
    for (const poly of b.polys) if (pointInPolygon(x, y, poly)) inside++;
    return inside % 2 === 1;
  };
  const allAir = (bi: number, pts: V2[]) => pts.every((p) => !materialAt(bi, p[0], p[1]));

  const ctol = Math.max(2 * tol, 0.05);
  const drills: Drill[] = [];
  const remainderCyl: Array<{ axis: 'Z' | 'X' | 'Y'; base: V3; length: number; radius: number; source: string }> = [];

  buildAxisHoleRuns(bands, levels, rawRel, nb, pass, ctol, allAir, drills, remainderCyl, entryAssumptions);
  buildCrossBores(an, pass, origin, ctol, literalSnaps, drills, remainderCyl, entryAssumptions);

  const cutoutRuns = buildCutoutRuns(bands, tol, ctol);
  const remainderPrisms = emitCutoutOps(cutoutRuns, nb, levels, rawRel, allAir, book, levelTol, addParam, snapInfo, notRepresented, ops);

  emitDrillOps(drills, remainderCyl, book, levelTol, pass, addParam, snapInfo, notRepresented, ops, holeSummary);

  remainderCyl.forEach((c, i) => ops.push({ kind: 'subtractCylinder', name: `bore${i + 1}`, axis: c.axis, base: c.base, length: c.length, radius: c.radius }));
  ops.push(...remainderPrisms);

  return { pass, origin, body, ops, params, literalSnaps, entryAssumptions, notRepresented, holeSummary, sharpenedArcs };
}

function fitLoopsAndOrigin(
  an: MeshAnalysis,
  pass: PassParams,
  literalSnaps: SnapRecord[],
): { fitted: FittedLoop[][]; axisymmetric: boolean; origin: V3 } {
  // ---- fit loops (canonical, unshifted) ---------------------------------------
  const fitted = an.bands.map((b) => b.section.loops.map((l) => fitLoop(l.xy, pass.eps, loopGuide(an, b.section.z, l.tris))));

  // ---- origin -----------------------------------------------------------------
  const outerCircles = fitted.map((loops) => {
    const polys = loops.map(loopPolygon);
    const depths = loops.map((_, i) => nestingDepth(polys, i));
    return { loops, depths };
  });
  const axisymmetric =
    outerCircles.length > 0 &&
    outerCircles.every(({ loops, depths }) => {
      const outer = loops.filter((_, i) => depths[i] === 0);
      return outer.length === 1 && outer[0].kind === 'circle';
    }) &&
    (() => {
      const centers = outerCircles.map(({ loops, depths }) => loops.find((_, i) => depths[i] === 0) as Extract<FittedLoop, { kind: 'circle' }>);
      return centers.every((c) => Math.hypot(c.cx - centers[0].cx, c.cy - centers[0].cy) <= Math.max(2 * pass.eps, 0.01 * c.r));
    })();

  let ox: number;
  let oy: number;
  if (axisymmetric) {
    const centers = outerCircles.map(({ loops, depths }) => loops.find((_, i) => depths[i] === 0) as Extract<FittedLoop, { kind: 'circle' }>);
    ox = centers.reduce((s, c) => s + c.cx, 0) / centers.length;
    oy = centers.reduce((s, c) => s + c.cy, 0) / centers.length;
  } else {
    ox = Infinity;
    oy = Infinity;
    outerCircles.forEach(({ loops, depths }) =>
      loops.forEach((l, i) => {
        if (depths[i] !== 0) return;
        const poly = loopPolygon(l);
        for (let k = 0; k < poly.length; k += 2) {
          ox = Math.min(ox, poly[k]);
          oy = Math.min(oy, poly[k + 1]);
        }
      }),
    );
    if (!Number.isFinite(ox)) {
      ox = 0;
      oy = 0;
    }
  }
  const oxs = snapValue(ox, pass.snapTol);
  const oys = snapValue(oy, pass.snapTol);
  const ozs = snapValue(an.zMin, pass.snapTol);
  for (const [what, m, s] of [['origin.x', ox, oxs], ['origin.y', oy, oys], ['origin.z', an.zMin, ozs]] as const) {
    if (s.snapped) literalSnaps.push({ what, measured: m, value: s.value, grid: s.grid });
  }
  const origin: V3 = [oxs.value, oys.value, ozs.value];
  return { fitted, axisymmetric, origin };
}

function buildBands(
  an: MeshAnalysis,
  pass: PassParams,
  fitted: FittedLoop[][],
  origin: V3,
  literalSnaps: SnapRecord[],
): { bands: BandLoops[]; nb: number; levels: number[]; rawRel: number[]; sharpenedArcs: number } {
  let sharpenedArcs = 0;
  // ---- shift + snap -----------------------------------------------------------
  const rawLevels = an.bands.map((b) => b.z0).concat([an.bands.length > 0 ? an.bands[an.bands.length - 1].z1 : an.zMax]);
  const levelSnaps = rawLevels.map((z) => snapValue(z - origin[2], pass.snapTol));
  const levels = levelSnaps.map((s) => s.value);
  const rawRel = rawLevels.map((z) => z - origin[2]);
  const bands: BandLoops[] = fitted.map((loops, bi) => {
    const raw = loops.map((l) => {
      const c = cloneLoop(l);
      shiftLoop(c, origin[0], origin[1]);
      return c;
    });
    const snapped = raw.map((l, li) => {
      const c = cloneLoop(l);
      const recs = snapLoop(c, { tol: pass.snapTol, angleTolDeg: pass.angleTolDeg, label: `band${bi}.loop${li}` });
      literalSnaps.push(...recs);
      return c;
    });
    let polys = snapped.map(loopPolygon);
    let bandSharpened = 0;
    if (pass.sharpenCorners) {
      const depths = snapped.map((_, i) => nestingDepth(polys, i));
      let changed = 0;
      snapped.forEach((l, i) => {
        if (depths[i] === 0) changed += sharpenFilletArcs(l);
      });
      if (changed > 0) {
        sharpenedArcs += changed;
        bandSharpened = changed;
        polys = snapped.map(loopPolygon);
      }
    }
    return {
      z0: levels[bi],
      z1: levels[bi + 1],
      loops: snapped,
      raw,
      polys,
      depth: snapped.map((_, i) => nestingDepth(polys, i)),
      sharpened: bandSharpened,
    };
  });
  const nb = bands.length;
  return { bands, nb, levels, rawRel, sharpenedArcs };
}

export function withFillets(
  plan: FeaturePlan,
  groups: Array<{ radius: number; measured: number; snapped: boolean; grid: number; edges: number[]; selectors: Array<EdgeQueryOut | undefined> }>,
): FeaturePlan {
  const params = [...plan.params];
  const single = groups.length === 1;
  const opGroups = groups.map((g, i) => {
    const name = single ? 'filletRadius' : `fillet${i + 1}Radius`;
    params.push({
      name,
      value: g.radius,
      measured: g.measured,
      snapped: g.snapped,
      grid: g.grid,
      description: `Constant-radius blend on ${g.edges.length} edge(s).`,
    });
    return { radius: g.radius, radiusParam: name, edgeCount: g.edges.length, selectors: g.selectors };
  });
  return { ...plan, params, ops: [...plan.ops, { kind: 'fillet', groups: opGroups }] };
}

export const _internal = { decomposeRun, DEG };
