// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/reconstruct/decomposeRunPhases.ts
//
// Phase helpers for decomposeRun (src/agent/reconstruct/planPhases.ts): the
// run-step partition, remainder emission, and drill emission. Split out of
// planPhases.ts purely to keep that file under the file-length ratchet;
// behaviour is unchanged.

import type { V2, V3 } from './geom';

export interface RunSeg {
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

export type RunRemainder = { axis: 'Z' | 'X' | 'Y'; base: V3; length: number; radius: number; source: string };

function runBasePoint(axis: 'Z' | 'X' | 'Y', center: V2, t0: number): V3 {
  return axis === 'Z' ? [center[0], center[1], t0] : axis === 'X' ? [t0, center[0], center[1]] : [center[0], t0, center[1]];
}

export function pushRunRemainders(
  steps: RunSeg[],
  axis: 'Z' | 'X' | 'Y',
  center: V2,
  source: string,
  remainder: RunRemainder[],
): void {
  for (const s of steps) remainder.push({ axis, base: runBasePoint(axis, center, s.t0), length: s.t1 - s.t0, radius: s.r, source });
}

export function partitionRunSteps(ordered: RunSeg[], rMin: number, through: boolean): { entrySteps: RunSeg[]; farSteps: RunSeg[]; interior: RunSeg[] } {
  let k = 0;
  const entrySteps: RunSeg[] = [];
  while (k < ordered.length && ordered[k].r > rMin + 1e-9) entrySteps.push(ordered[k++]);
  let m = ordered.length - 1;
  const farSteps: RunSeg[] = [];
  if (through) {
    while (m > k && ordered[m].r > rMin + 1e-9) farSteps.unshift(ordered[m--]);
  }
  const interior = ordered.slice(k, m + 1).filter((s) => s.r > rMin + 1e-9);
  return { entrySteps, farSteps, interior };
}

export function drillableSteps(steps: RunSeg[]): boolean {
  return steps.every((s, i) => i === 0 || s.r <= steps[i - 1].r + 1e-9);
}

export function makeRunDrill(
  ctx: {
    axis: 'Z' | 'X' | 'Y';
    fromHigh: boolean;
    center: V2;
    rMin: number;
    minSeg: RunSeg;
    tLow: number;
    tHigh: number;
    segs: RunSeg[];
    through: boolean;
    entryLevel: number;
    farLevel: number;
    source: string;
  },
  counterboreStep: RunSeg | undefined,
): Drill {
  return {
    axis: ctx.axis,
    fromHigh: ctx.fromHigh,
    center: ctx.center,
    diameter: 2 * ctx.rMin,
    measuredDiameter: 2 * ctx.minSeg.rawR,
    length: ctx.tHigh - ctx.tLow,
    rawLength: ctx.segs[ctx.segs.length - 1].rawT1 - ctx.segs[0].rawT0,
    through: ctx.through,
    ...(counterboreStep
      ? { counterbore: { r: counterboreStep.r, rawR: counterboreStep.rawR, depth: counterboreStep.t1 - counterboreStep.t0, rawDepth: counterboreStep.rawT1 - counterboreStep.rawT0 } }
      : {}),
    entryLevel: ctx.entryLevel,
    exitLevel: ctx.farLevel,
    rimR: counterboreStep ? counterboreStep.r : ctx.rMin,
    exitR: ctx.rMin,
    source: ctx.source,
  };
}

function pushBlindStepDrills(
  steps: RunSeg[],
  depthInit: number,
  rawDepthInit: number,
  opts: { axis: 'Z' | 'X' | 'Y'; fromHigh: boolean; center: V2; entryLevel: number; source: string },
  drills: Drill[],
): void {
  let depth = depthInit;
  let rawDepth = rawDepthInit;
  for (const s of steps) {
    depth += s.t1 - s.t0;
    rawDepth += s.rawT1 - s.rawT0;
    drills.push({
      axis: opts.axis,
      fromHigh: opts.fromHigh,
      center: opts.center,
      diameter: 2 * s.r,
      measuredDiameter: 2 * s.rawR,
      length: depth,
      rawLength: rawDepth,
      through: false,
      entryLevel: opts.entryLevel,
      exitLevel: opts.entryLevel,
      rimR: s.r,
      exitR: s.r,
      source: opts.source,
    });
  }
}

export function pushRunStepDrills(
  entrySteps: RunSeg[],
  farFromEnd: RunSeg[],
  entryOk: boolean,
  farOk: boolean,
  through: boolean,
  opts: { axis: 'Z' | 'X' | 'Y'; fromHigh: boolean; center: V2; entryLevel: number; farLevel: number; source: string },
  counterboreStep: RunSeg | undefined,
  drills: Drill[],
): void {
  if (entryOk) {
    const depth = counterboreStep ? counterboreStep.t1 - counterboreStep.t0 : 0;
    const rawDepth = counterboreStep ? counterboreStep.rawT1 - counterboreStep.rawT0 : 0;
    pushBlindStepDrills(entrySteps.slice(1), depth, rawDepth, { axis: opts.axis, fromHigh: opts.fromHigh, center: opts.center, entryLevel: opts.entryLevel, source: `${opts.source} step` }, drills);
  }
  if (through && farOk) {
    pushBlindStepDrills(farFromEnd, 0, 0, { axis: opts.axis, fromHigh: !opts.fromHigh, center: opts.center, entryLevel: opts.farLevel, source: `${opts.source} far step` }, drills);
  }
}
