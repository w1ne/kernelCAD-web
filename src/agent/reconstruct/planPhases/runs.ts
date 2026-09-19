// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { distanceToPolygon, pointInPolygon, type V2, type V3 } from '../geom';
import { loopPrimitives, primitivesMoments, snapValue, type FittedLoop, type SnapRecord } from '../profileFit';
import { pointInsideMesh } from '../fidelity';
import type { MeshAnalysis } from '../analysis';
import {
  drillableSteps,
  makeRunDrill,
  partitionRunSteps,
  pushRunRemainders,
  pushRunStepDrills,
  type Drill,
  type RunRemainder,
  type RunSeg,
} from '../decomposeRunPhases';
import type { BandLoops, EntrySideAssumption, PassParams } from './shared';
import { maxBoundaryGap } from './body';
import { fmt } from './format';

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

export interface InnerRef {
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
  remainder: RunRemainder[],
  assumptions: EntrySideAssumption[],
): void {
  const tLow = segs[0].t0;
  const tHigh = segs[segs.length - 1].t1;
  if (!openLow && !openHigh) {
    pushRunRemainders(segs, axis, center, source, remainder);
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

  const { entrySteps, farSteps, interior } = partitionRunSteps(ordered, rMin, through);
  pushRunRemainders(interior, axis, center, source, remainder);

  // Entry steps must narrow going in; a widening step is an undercut.
  const entryOk = drillableSteps(entrySteps);
  if (!entryOk) pushRunRemainders(entrySteps, axis, center, source, remainder);
  const farFromEnd = [...farSteps].reverse();
  const farOk = drillableSteps(farFromEnd);
  if (!farOk) pushRunRemainders(farSteps, axis, center, source, remainder);

  const counterboreStep = entryOk && entrySteps.length > 0 ? entrySteps[0] : undefined;
  drills.push(makeRunDrill({ axis, fromHigh, center, rMin, minSeg, tLow, tHigh, segs, through, entryLevel, farLevel, source }, counterboreStep));
  pushRunStepDrills(entrySteps, farFromEnd, entryOk, farOk, through, { axis, fromHigh, center, entryLevel, farLevel, source }, counterboreStep, drills);
}
