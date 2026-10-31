// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Loop solver against closed forms: Freudenstein's equation for a four-bar,
// the slider-crank piston position, the input limit of a non-Grashof
// four-bar (lockup), the over-center point of a slider-crank (pinned
// branch flip) and the change point of a parallelogram (unpinned flip).
// Every assertion compares to the analytic value, not to solver output.

import { describe, expect, it } from 'vitest';
import { Transform } from '../../runtime/se3';
import { solveLoops } from './index';
import type { LoopBranchState, LoopModel, LoopPin, LoopSolveResult } from './types';

const DEG = Math.PI / 180;
const Z: [number, number, number] = [0, 0, 1];

/** Planar four-bar: ground pivots O2=(0,0), O4=(d,0); crank a, coupler b,
 *  rocker c. Tree ground→crank→coupler and ground→rocker; cut at the
 *  coupler–rocker pin. crank and rocker coordinates are absolute angles. */
function fourBar(a: number, b: number, c: number, d: number): LoopModel {
  return {
    roots: [{ body: 'ground', placement: Transform.identity() }],
    tree: [
      { name: 'crank', kind: 'revolute', a: 'ground', b: 'crankLink', aOrigin: [0, 0, 0], bOrigin: [0, 0, 0], axis: Z },
      { name: 'rocker', kind: 'revolute', a: 'ground', b: 'rockerLink', aOrigin: [d, 0, 0], bOrigin: [0, 0, 0], axis: Z },
      { name: 'coupler', kind: 'revolute', a: 'crankLink', b: 'couplerLink', aOrigin: [a, 0, 0], bOrigin: [0, 0, 0], axis: Z },
    ],
    cuts: [
      { name: 'pinC', kind: 'revolute', a: 'couplerLink', b: 'rockerLink', aOrigin: [b, 0, 0], bOrigin: [c, 0, 0], axis: Z },
    ],
  };
}

/** Closed-form rocker angle (rad) for crank angle t2 (rad); `open` picks the
 *  root. Derived from |C − B| = b with C = O4 + c(cos t4, sin t4). */
function rockerAngle(a: number, b: number, c: number, d: number, t2: number, open: boolean): number {
  const bx = a * Math.cos(t2), by = a * Math.sin(t2);
  // (d + c cos t4 − bx)² + (c sin t4 − by)² = b²  →  P cos t4 + Q sin t4 = R
  const P = 2 * c * (d - bx);
  const Q = -2 * c * by;
  const R = b * b - c * c - (d - bx) ** 2 - by * by;
  const base = Math.atan2(Q, P);
  const spread = Math.acos(R / Math.hypot(P, Q));
  return open ? base + spread : base - spread;
}

function fourBarSeed(a: number, b: number, c: number, d: number, t2: number, open: boolean): Record<string, number> {
  const t4 = rockerAngle(a, b, c, d, t2, open);
  const C = [d + c * Math.cos(t4), c * Math.sin(t4)];
  const t3 = Math.atan2(C[1] - a * Math.sin(t2), C[0] - a * Math.cos(t2));
  return { crank: t2 / DEG, coupler: (t3 - t2) / DEG, rocker: t4 / DEG };
}

function freudenstein(a: number, b: number, c: number, d: number, t2: number, t4: number): number {
  const K1 = d / a, K2 = d / c, K3 = (a * a - b * b + c * c + d * d) / (2 * a * c);
  return K1 * Math.cos(t4) - K2 * Math.cos(t2) + K3 - Math.cos(t2 - t4);
}

function wrap(x: number): number {
  return x - 2 * Math.PI * Math.round(x / (2 * Math.PI));
}

/** Sweep one driven joint with continuation, like the swept checks do. */
function sweep(model: LoopModel, joint: string, seed: Record<string, number>, values: number[], pins: LoopPin[] = []): LoopSolveResult[] {
  const out: LoopSolveResult[] = [];
  let coords: Record<string, number | readonly [number, number, number]> = { ...seed };
  let previous: LoopBranchState | undefined;
  for (const v of values) {
    const r = solveLoops({ model, driven: { [joint]: v }, seed: coords, previous, pins });
    out.push(r);
    if (r.status !== 'solved') break;
    coords = r.coordinates;
    previous = r.state;
  }
  return out;
}

function range(lo: number, hi: number, step: number): number[] {
  const n = Math.round((hi - lo) / step);
  return Array.from({ length: n + 1 }, (_, i) => lo + i * step);
}

describe('solveLoops — four-bar vs Freudenstein', () => {
  const [a, b, c, d] = [40, 120, 80, 100]; // Grashof crank-rocker
  const model = fourBar(a, b, c, d);
  const seed = fourBarSeed(a, b, c, d, 60 * DEG, true);

  it('a full crank revolution stays on the open branch and satisfies Freudenstein', () => {
    const results = sweep(model, 'crank', seed, range(60, 420, 10));
    expect(results.every((r) => r.status === 'solved')).toBe(true);
    for (const r of results) {
      const t2 = (r.reachedDriven.crank as number) * DEG;
      const t4 = (r.coordinates.rocker as number) * DEG;
      expect(Math.abs(freudenstein(a, b, c, d, t2, t4))).toBeLessThan(1e-7);
      expect(Math.abs(wrap(t4 - rockerAngle(a, b, c, d, t2, true)))).toBeLessThan(1e-7);
      expect(r.residualMm).toBeLessThan(1e-6);
    }
  });

  it('one solve far from the seed marches and lands on the seed branch', () => {
    const r = solveLoops({ model, driven: { crank: 250 }, seed });
    expect(r.status).toBe('solved');
    expect(Math.abs(wrap((r.coordinates.rocker as number) * DEG - rockerAngle(a, b, c, d, 250 * DEG, true)))).toBeLessThan(1e-7);
  });

  it('reports mobility 1 from the rank, Grübler −2 (planar redundancy 3), one driven DOF', () => {
    const r = solveLoops({ model, driven: { crank: 70 }, seed });
    expect(r.loops).toEqual([{ name: 'pinC', cutJoint: 'pinC', joints: ['pinC', 'rocker', 'crank', 'coupler'] }]);
    expect(r.mobility).toEqual([
      { loops: ['pinC'], coordinates: 3, rank: 2, mobility: 1, gruebler: -2, redundantConstraints: 3, drivenDof: 1, independent: ['crank'] },
    ]);
    expect(r.diagnostics).toEqual([]);
  });

  it('is deterministic', () => {
    const r1 = solveLoops({ model, driven: { crank: 133 }, seed });
    const r2 = solveLoops({ model, driven: { crank: 133 }, seed });
    expect(r1.coordinates).toEqual(r2.coordinates);
  });

  it('flags an over-driven loop whose driven values disagree', () => {
    const r = solveLoops({ model, driven: { crank: 90, rocker: 10 }, seed });
    expect(r.status).toBe('over-driven');
    expect(r.diagnostics.map((x) => x.code)).toContain('kinematic.loop.mobility-mismatch');
  });

  it('accepts a driven cut joint (coupler–rocker angle) and closes the loop', () => {
    const at = fourBarSeed(a, b, c, d, 100 * DEG, true);
    // Interior angle at C on the open branch for crank = 100°.
    const t3 = (at.crank + at.coupler) * DEG;
    const t4 = at.rocker * DEG;
    const pinAngle = wrap(t4 - t3) / DEG;
    const r = solveLoops({ model, driven: { pinC: pinAngle }, seed });
    expect(r.status).toBe('solved');
    expect(Math.abs(wrap((r.coordinates.crank as number) * DEG - 100 * DEG))).toBeLessThan(1e-7);
  });
});

describe('solveLoops — slider-crank vs closed-form piston position', () => {
  const [r0, l, e] = [30, 100, 10];
  const model: LoopModel = {
    roots: [{ body: 'ground', placement: Transform.identity() }],
    tree: [
      { name: 'crank', kind: 'revolute', a: 'ground', b: 'crankLink', aOrigin: [0, 0, 0], bOrigin: [0, 0, 0], axis: Z },
      { name: 'slide', kind: 'prismatic', a: 'ground', b: 'piston', aOrigin: [0, e, 0], bOrigin: [0, 0, 0], axis: [1, 0, 0] },
      { name: 'wrist', kind: 'revolute', a: 'crankLink', b: 'rod', aOrigin: [r0, 0, 0], bOrigin: [0, 0, 0], axis: Z },
    ],
    cuts: [{ name: 'gudgeon', kind: 'revolute', a: 'rod', b: 'piston', aOrigin: [l, 0, 0], bOrigin: [0, 0, 0], axis: Z }],
  };
  const piston = (t: number): number => r0 * Math.cos(t) + Math.sqrt(l * l - (r0 * Math.sin(t) - e) ** 2);
  const seedAt = (t: number): Record<string, number> => {
    const x = piston(t);
    const psi = Math.atan2(e - r0 * Math.sin(t), x - r0 * Math.cos(t));
    return { crank: t / DEG, slide: x, wrist: (psi - t) / DEG };
  };

  it('tracks x = r cosθ + √(l² − (r sinθ − e)²) over a full revolution', () => {
    const results = sweep(model, 'crank', seedAt(0), range(0, 360, 5));
    expect(results.every((r) => r.status === 'solved')).toBe(true);
    for (const r of results) {
      const t = (r.reachedDriven.crank as number) * DEG;
      expect(Math.abs((r.coordinates.slide as number) - piston(t))).toBeLessThan(1e-6);
    }
    expect(results[0].mobility[0].mobility).toBe(1);
  });

  it('a pinned crank–rod elbow reports the over-center point as a branch flip', () => {
    const start = seedAt(30 * DEG);
    const first = solveLoops({ model, driven: { crank: 30 }, seed: start });
    const sign = first.elbows['gudgeon/wrist'] === 1 ? '+' : '-';
    const results = sweep(model, 'crank', start, range(30, 360, 1), [{ loop: 'gudgeon', joint: 'wrist', sign }]);
    const last = results[results.length - 1];
    expect(last.status).toBe('branch-flip');
    const flip = last.diagnostics.find((x) => x.code === 'kinematic.loop.branch-flip')!;
    expect(flip.joint).toBe('wrist');
    // Folded collinear (bottom dead centre): crank opposite the pin direction.
    const tBdc = 180 + Math.asin(e / (l - r0)) / DEG;
    const flipAt = flip.pose!.crank as number;
    expect(flipAt).toBeGreaterThan(tBdc);
    expect(flipAt - 1).toBeLessThan(tBdc);
    expect(last.reachedDriven.crank as number).toBeLessThan(tBdc);
  });
});

describe('solveLoops — lockup on a non-Grashof four-bar', () => {
  const [a, b, c, d] = [80, 60, 50, 100]; // s + l = 150 > p + q = 140
  const model = fourBar(a, b, c, d);
  const seed = fourBarSeed(a, b, c, d, 0, true);
  // Input limit: coupler and rocker collinear, |B − O4| = b + c.
  const limit = Math.acos((a * a + d * d - (b + c) ** 2) / (2 * a * d)) / DEG;

  it('stops at the input limit with kinematic.loop.lockup', () => {
    const results = sweep(model, 'crank', seed, range(0, 90, 1));
    const last = results[results.length - 1];
    expect(last.status).toBe('lockup');
    const diag = last.diagnostics.find((x) => x.code === 'kinematic.loop.lockup')!;
    expect(diag.loop).toBe('pinC');
    const failedAt = diag.pose!.crank as number;
    expect(failedAt).toBeGreaterThan(limit);
    expect(failedAt - 1).toBeLessThan(limit);
    expect(results[results.length - 2].reachedDriven.crank as number).toBeLessThan(limit);
  });
});

describe('solveLoops — parallelogram change point', () => {
  const model = fourBar(50, 100, 50, 100);
  const seed = { crank: 60, coupler: -60, rocker: 60 };

  it('reports a branch flip at the flat configuration instead of switching silently', () => {
    const results = sweep(model, 'crank', seed, range(60, -60, -5));
    const last = results[results.length - 1];
    expect(last.status).toBe('branch-flip');
    const flip = last.diagnostics.find((x) => x.code === 'kinematic.loop.branch-flip')!;
    const at = flip.pose!.crank as number;
    expect(at).toBeLessThanOrEqual(0);
    expect(at).toBeGreaterThanOrEqual(-5);
  });

  it('a pin picks the branch when the as-built pose is flat', () => {
    const flat = { crank: 0, coupler: 0, rocker: 0 };
    const pinned = solveLoops({
      model, driven: { crank: 20 }, seed: flat, pins: [{ loop: 'pinC', joint: 'coupler', sign: '-' }],
    });
    expect(pinned.status).toBe('solved');
    expect(pinned.elbows['pinC/coupler']).toBe(-1);
    // Parallelogram branch: rocker parallel to the crank.
    expect(Math.abs((pinned.coordinates.rocker as number) - 20)).toBeLessThan(1e-6);
    const unpinned = solveLoops({ model, driven: { crank: 20 }, seed: flat });
    expect(unpinned.diagnostics.map((x) => x.code)).toContain('kinematic.loop.branch-ambiguous');
  });
});
