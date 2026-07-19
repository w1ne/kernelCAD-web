// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/tangencySolver.test.ts
//
// Tests for the Geom2dGcc tangency constructions exposed as
// `PathBuilder.tangentCircle` / `.tangentLine`.
//
// Everything here asserts against CLOSED-FORM geometry, never "it produced
// something": a circle of radius r tangent to the x and y axes has its centre
// at (±r, ±r), and tangency itself is checkable — the distance from the centre
// to each line must equal r. A test that only checked `IsDone()` would pass
// against a solver returning the wrong quadrant, which is the exact failure
// this feature's selection rule exists to prevent.

import { describe, it, expect, beforeAll } from 'vitest';
import { buildModel } from '../../../modeling/buildModel';
import { initOcct } from './occtBackend';
import { CaptureSession } from '../../../modeling/capture/captureSession';
import { createApi } from '../../../modeling/api';
import { KernelError } from '../../../shared/intent/kernelError';
import { solveTangentCircle, solveTangentLine, TangencyError } from './tangencySolver';
import type { TangentEntitySpec } from '../../../shared/capture/tangency';
import type { TangentSide } from '../../../shared/capture/tangency';

const mm = (v: number) => ({ expression: String(v), unit: 'mm' as const, evaluated: v });

const line = (x1: number, y1: number, x2: number, y2: number, side: TangentSide = 'outside'): TangentEntitySpec =>
  ({ kind: 'line', x1: mm(x1), y1: mm(y1), x2: mm(x2), y2: mm(y2), side });

const circ = (cx: number, cy: number, r: number, side: TangentSide = 'outside'): TangentEntitySpec =>
  ({ kind: 'circle', cx: mm(cx), cy: mm(cy), r: mm(r), side });

/** Perpendicular distance from a point to the infinite line through a->b. */
function distPointLine(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  return Math.abs((px - ax) * dy - (py - ay) * dx) / Math.hypot(dx, dy);
}

const X_AXIS = { a: [0, 0] as const, b: [1, 0] as const };
const Y_AXIS = { a: [0, 0] as const, b: [0, 1] as const };

describe('tangency solver — circle tangent to two entities with a given radius', () => {
  beforeAll(async () => { await initOcct(); });

  it('places the centre at the closed-form (r, -r) and is genuinely tangent to both axes', () => {
    const R = 5;
    // side:'outside' on a LINE means "right of the directed line". Both axes
    // point along +X and +Y respectively, so outside/outside is the fourth
    // quadrant. This is the whole reason `from`->`to` order is documented.
    const c = solveTangentCircle([line(0, 0, 1, 0), line(0, 0, 0, 1)], R, undefined);

    expect(c.r).toBeCloseTo(R, 9);
    expect(c.cx).toBeCloseTo(R, 9);
    expect(c.cy).toBeCloseTo(-R, 9);

    // Tangency, checked rather than assumed: the centre must sit exactly one
    // radius from each line.
    expect(distPointLine(c.cx, c.cy, ...X_AXIS.a, ...X_AXIS.b)).toBeCloseTo(R, 9);
    expect(distPointLine(c.cx, c.cy, ...Y_AXIS.a, ...Y_AXIS.b)).toBeCloseTo(R, 9);
  });

  it('follows the side qualifiers into a different quadrant', () => {
    const R = 5;
    const c = solveTangentCircle([line(0, 0, 1, 0, 'enclosed'), line(0, 0, 0, 1)], R, undefined);
    expect(c.cx).toBeCloseTo(R, 9);
    expect(c.cy).toBeCloseTo(R, 9);
    expect(distPointLine(c.cx, c.cy, ...X_AXIS.a, ...X_AXIS.b)).toBeCloseTo(R, 9);
    expect(distPointLine(c.cx, c.cy, ...Y_AXIS.a, ...Y_AXIS.b)).toBeCloseTo(R, 9);
  });

  it('is tangent to two circles of unequal radius at the closed-form centre', () => {
    // Circles r=10 at (0,0) and r=4 at (30,0); solution circle r=12 outside
    // both, so its centre is 22 from one and 16 from the other. 22+16 > 30,
    // so the two mirror solutions straddle the x-axis and `near` must choose.
    const up = solveTangentCircle([circ(0, 0, 10), circ(30, 0, 4)], 12, [15, 100]);
    expect(up.r).toBeCloseTo(12, 9);
    expect(Math.hypot(up.cx, up.cy)).toBeCloseTo(22, 9);
    expect(Math.hypot(up.cx - 30, up.cy)).toBeCloseTo(16, 9);
    expect(up.cy).toBeGreaterThan(0);

    // Mirror hint ⇒ mirror solution. Same tangency invariants, opposite side.
    const down = solveTangentCircle([circ(0, 0, 10), circ(30, 0, 4)], 12, [15, -100]);
    expect(Math.hypot(down.cx, down.cy)).toBeCloseTo(22, 9);
    expect(down.cy).toBeCloseTo(-up.cy, 9);
    expect(down.cx).toBeCloseTo(up.cx, 9);
  });
});

describe('tangency solver — the multi-solution selection rule', () => {
  beforeAll(async () => { await initOcct(); });

  // Both axes unqualified: four solutions, one per quadrant, all radius 5.
  const FOUR_WAY = () => [line(0, 0, 1, 0, 'unqualified'), line(0, 0, 0, 1, 'unqualified')];

  it('refuses to guess when several solutions survive and no hint is given', () => {
    let err: unknown;
    try { solveTangentCircle(FOUR_WAY(), 5, undefined); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(TangencyError);
    const e = err as TangencyError;
    expect(e.failureKind).toBe('ambiguous');
    expect(e.message).toMatch(/4 solutions/);
    // Every candidate is named, so the author can copy the one they wanted.
    expect(e.message).toMatch(/centre \(-5\.000000, 5\.000000\)/);
    expect(e.message).toMatch(/near/);
  });

  it('picks the nearest-centre solution for an ASYMMETRIC hint', () => {
    // near = (-100, 3). Distances to the four centres:
    //   (-5,  5) -> 95.021    <- winner
    //   (-5, -5) -> 95.335    <- runner-up, only 0.31 away
    //   ( 5,  5) -> 105.019
    //   ( 5, -5) -> 105.307
    // The two left-hand candidates are nearly tied, so this fails loudly if
    // the rule degrades to "pick by sign of x" or "take solution 1" — OCCT
    // enumerates this case as (-5,5) (5,5) (-5,-5) (5,-5), and solution 1
    // happens to be the right answer, so the hint is checked the other way
    // round below too.
    const c = solveTangentCircle(FOUR_WAY(), 5, [-100, 3]);
    expect(c.cx).toBeCloseTo(-5, 9);
    expect(c.cy).toBeCloseTo(5, 9);

    // Same construction, hint on the opposite side: must move to a different
    // quadrant. If the implementation ignored `near` and returned
    // ThisSolution(1), this assertion is the one that catches it.
    const other = solveTangentCircle(FOUR_WAY(), 5, [100, -3]);
    expect(other.cx).toBeCloseTo(5, 9);
    expect(other.cy).toBeCloseTo(-5, 9);
  });

  it('reports ambiguity rather than letting float noise break a tie', () => {
    // near = origin is exactly equidistant from all four centres.
    let err: unknown;
    try { solveTangentCircle(FOUR_WAY(), 5, [0, 0]); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(TangencyError);
    expect((err as TangencyError).failureKind).toBe('ambiguous');
    expect((err as TangencyError).message).toMatch(/equidistant/);
  });
});

describe('tangency solver — no solution', () => {
  beforeAll(async () => { await initOcct(); });

  it('names the geometric reason when the radius cannot bridge two parallel lines', () => {
    // Two parallel lines 20 apart; a radius-5 circle cannot touch both.
    // NOTE the OCCT behaviour this guards: the solver reports IsDone()==true
    // with NbSolutions()==0 here. Checking IsDone() alone would sail past it
    // and then throw on ThisSolution(1).
    let err: unknown;
    try {
      solveTangentCircle([line(0, 0, 1, 0), line(0, 20, 1, 20)], 5, undefined);
    } catch (e) { err = e; }
    expect(err).toBeInstanceOf(TangencyError);
    const e = err as TangencyError;
    expect(e.failureKind).toBe('no-solution');
    expect(e.message).toMatch(/no circle of radius 5 is tangent/);
    expect(e.message).toMatch(/2\*radius/);
    // Also true at a radius that would geometrically fit: OCCT's
    // Circ2d2TanRad has no parallel-line branch. Recorded so the next reader
    // does not spend an afternoon hunting for the qualifier that "works".
    for (const r of [10, 40]) {
      expect(() => solveTangentCircle(
        [line(0, 0, 1, 0, 'unqualified'), line(0, 20, 1, 20, 'unqualified')], r, [0, 10],
      )).toThrow(TangencyError);
    }
  });

  it('has no circle small enough to span two separated circles, but solves once it is large enough', () => {
    // Counter-test proving the failure above is geometry, not plumbing.
    // Two r=5 circles 40 apart: a radius-5 solution would need its centre 10
    // from each, impossible across a 40 gap.
    let err: unknown;
    try { solveTangentCircle([circ(0, 0, 5), circ(40, 0, 5)], 5, undefined); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(TangencyError);
    expect((err as TangencyError).failureKind).toBe('no-solution');

    // At radius 15 the centre sits 20 from each — exactly the midpoint, one
    // solution, no hint needed.
    const c = solveTangentCircle([circ(0, 0, 5), circ(40, 0, 5)], 15, undefined);
    expect(c.r).toBeCloseTo(15, 9);
    expect(c.cx).toBeCloseTo(20, 6);
    expect(c.cy).toBeCloseTo(0, 6);
  });

  it('converts a raw OCCT abort into a diagnosable failure', () => {
    // `enclosing` is meaningless for a line (no interior) and OCCT does not
    // reject it politely — it aborts out of C++ and JS sees a bare NUMBER,
    // not an Error. Unhandled, that reaches the agent as an anonymous crash.
    let err: unknown;
    try {
      solveTangentCircle([line(0, 0, 1, 0), line(0, 20, 1, 20, 'enclosing')], 10, undefined);
    } catch (e) { err = e; }
    expect(err).toBeInstanceOf(TangencyError);
    expect((err as TangencyError).message).toMatch(/rejected this construction outright/);
    expect((err as TangencyError).message).toMatch(/'enclosing' is meaningless for a line/);
  });
});

describe('tangency solver — circle tangent to three entities', () => {
  beforeAll(async () => { await initOcct(); });

  it('finds the incircle of a 30-40-50 right triangle in closed form', () => {
    // Triangle (0,0), (30,0), (0,40): legs 30 and 40, hypotenuse 50.
    // Incircle radius = (a + b - c) / 2 = 10, centre (10, 10).
    // Unqualified on all three sides yields FOUR circles (incircle + three
    // excircles); `near` inside the triangle — but deliberately NOT at the
    // answer — selects the incircle.
    const c = solveTangentCircle(
      [
        line(0, 0, 1, 0, 'unqualified'),
        line(0, 0, 0, 1, 'unqualified'),
        line(30, 0, 0, 40, 'unqualified'),
      ],
      undefined,
      [12, 8],
    );
    expect(c.r).toBeCloseTo(10, 6);
    expect(c.cx).toBeCloseTo(10, 6);
    expect(c.cy).toBeCloseTo(10, 6);
    // Tangent to all three sides, verified independently of the solver.
    expect(distPointLine(c.cx, c.cy, 0, 0, 1, 0)).toBeCloseTo(10, 6);
    expect(distPointLine(c.cx, c.cy, 0, 0, 0, 1)).toBeCloseTo(10, 6);
    expect(distPointLine(c.cx, c.cy, 30, 0, 0, 40)).toBeCloseTo(10, 6);
  });
});

describe('tangency solver — line tangent to two circles (belt/pulley)', () => {
  beforeAll(async () => { await initOcct(); });

  it('returns the external tangent of two equal pulleys at the closed-form points', () => {
    // Equal radii ⇒ the external tangent is parallel to the centre line and
    // offset by exactly r.
    const { t1, t2 } = solveTangentLine(circ(0, 0, 5), circ(40, 0, 5), undefined);
    expect(t1[0]).toBeCloseTo(0, 6);
    expect(Math.abs(t1[1])).toBeCloseTo(5, 6);
    expect(t2[0]).toBeCloseTo(40, 6);
    expect(t2[1]).toBeCloseTo(t1[1], 6);

    // Tangency: each centre sits exactly one radius from the solved line.
    expect(distPointLine(0, 0, t1[0], t1[1], t2[0], t2[1])).toBeCloseTo(5, 6);
    expect(distPointLine(40, 0, t1[0], t1[1], t2[0], t2[1])).toBeCloseTo(5, 6);
  });

  it('is tangent to unequal pulleys (the tangent line is no longer parallel)', () => {
    const { t1, t2 } = solveTangentLine(circ(0, 0, 10), circ(50, 0, 4), [0, 100]);
    expect(distPointLine(0, 0, t1[0], t1[1], t2[0], t2[1])).toBeCloseTo(10, 6);
    expect(distPointLine(50, 0, t1[0], t1[1], t2[0], t2[1])).toBeCloseTo(4, 6);
    // External tangent on the +Y side, per the hint.
    expect(t1[1]).toBeGreaterThan(0);
    expect(t2[1]).toBeGreaterThan(0);
    // Unequal radii ⇒ the tangent line must slope.
    expect(Math.abs(t2[1] - t1[1])).toBeGreaterThan(1e-3);
  });

  it('has no outside/outside tangent when one circle contains the other', () => {
    let err: unknown;
    try { solveTangentLine(circ(0, 0, 20), circ(2, 0, 3), undefined); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(TangencyError);
    expect((err as TangencyError).failureKind).toBe('no-solution');
    expect((err as TangencyError).message).toMatch(/no line is tangent to both/);
  });
});

describe('PathBuilder tangency capture-time validation', () => {
  const api = () => createApi({ session: new CaptureSession() });

  it('rejects two entities without a radius and three entities with one', () => {
    const l1 = { kind: 'line' as const, from: [0, 0] as [number, number], to: [1, 0] as [number, number] };
    const l2 = { kind: 'line' as const, from: [0, 0] as [number, number], to: [0, 1] as [number, number] };
    const l3 = { kind: 'line' as const, from: [30, 0] as [number, number], to: [0, 40] as [number, number] };
    expect(() => api().path().tangentCircle([l1, l2])).toThrow(/needs opts\.radius/);
    expect(() => api().path().tangentCircle([l1, l2, l3], { radius: 5 })).toThrow(/over-constrains/);
    expect(() => api().path().tangentCircle([l1])).toThrow(/expected 2 or 3/);
  });

  it('rejects a line entity for tangentLine, naming the reason', () => {
    const l = { kind: 'line' as const, from: [0, 0] as [number, number], to: [1, 0] as [number, number] };
    const c = { kind: 'circle' as const, center: [0, 0] as [number, number], radius: 5 };
    try {
      api().path().tangentLine(l, c);
      throw new Error('expected a KernelError');
    } catch (e) {
      expect(e).toBeInstanceOf(KernelError);
      expect((e as KernelError).message).toMatch(/must be circles/);
    }
  });

  it('rejects tangentCircle chained after other path commands', () => {
    const l1 = { kind: 'line' as const, from: [0, 0] as [number, number], to: [1, 0] as [number, number] };
    const l2 = { kind: 'line' as const, from: [0, 0] as [number, number], to: [0, 1] as [number, number] };
    expect(() => api().path().moveTo(0, 0).tangentCircle([l1, l2], { radius: 5 }))
      .toThrow(/only operation on a fresh path/);
  });
});

describe('tangency end-to-end through buildModel', () => {
  beforeAll(async () => { await initOcct(); });

  it('extrudes a tangent circle to a solid of the exact analytic volume', async () => {
    const m = await buildModel({
      fileName: 'tangent-circle.kcad.ts',
      code: `
        return path().tangentCircle(
          [{ kind: 'line', from: [0, 0], to: [1, 0], side: 'enclosed' },
           { kind: 'line', from: [0, 0], to: [0, 1] }],
          { radius: 5 },
        ).extrude(10);
      `,
    });
    expect(m.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    // Two exact semicircular arcs, not a polyline approximation — so the
    // volume is π·r²·h to within kernel tolerance, not within 2%.
    expect(m.tailShape!.volume()).toBeCloseTo(Math.PI * 25 * 10, 3);
  });

  it('builds a profile from a belt tangent line and extrudes it', async () => {
    // Tangent line across two equal pulleys spans (0, 5) -> (40, 5); closing
    // it down to the x-axis gives a 40x5 rectangle. Volume = 40*5*2 = 400.
    const m = await buildModel({
      fileName: 'tangent-line.kcad.ts',
      code: `
        return path()
          .tangentLine(
            { kind: 'circle', center: [0, 0], radius: 5 },
            { kind: 'circle', center: [40, 0], radius: 5 },
            { near: [20, 50] },
          )
          .lineTo(40, 0)
          .lineTo(0, 0)
          .close()
          .extrude(2);
      `,
    });
    expect(m.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(m.tailShape!.volume()).toBeCloseTo(400, 6);
  });

  it('surfaces an impossible construction as sketch.tangency.no-solution', async () => {
    const m = await buildModel({
      fileName: 'tangent-impossible.kcad.ts',
      code: `
        return path().tangentCircle(
          [{ kind: 'line', from: [0, 0], to: [1, 0] },
           { kind: 'line', from: [0, 20], to: [1, 20] }],
          { radius: 5 },
        ).extrude(10);
      `,
    });
    const errs = m.diagnostics.filter((d) => d.severity === 'error');
    expect(errs.length).toBeGreaterThan(0);
    expect(errs[0].code).toBe('sketch.tangency.no-solution');
    // The diagnostic must name WHY, not just that something failed.
    expect(errs[0].message).toMatch(/no circle of radius 5 is tangent/);
    expect(errs[0].hint.length).toBeGreaterThan(0);
  });

  it('surfaces an under-specified construction as sketch.tangency.ambiguous', async () => {
    const m = await buildModel({
      fileName: 'tangent-ambiguous.kcad.ts',
      code: `
        return path().tangentCircle(
          [{ kind: 'line', from: [0, 0], to: [1, 0], side: 'unqualified' },
           { kind: 'line', from: [0, 0], to: [0, 1], side: 'unqualified' }],
          { radius: 5 },
        ).extrude(10);
      `,
    });
    const errs = m.diagnostics.filter((d) => d.severity === 'error');
    expect(errs.length).toBeGreaterThan(0);
    expect(errs[0].code).toBe('sketch.tangency.ambiguous');
    expect(errs[0].message).toMatch(/4 solutions/);
  });
});
