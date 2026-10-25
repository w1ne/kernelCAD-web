// tests/unit/kinematic/sweepTolerance.test.ts
//
// Parameter-space tolerance sweep.
//
// Primary fixture: two boxes with a swept clearance gap ('GapMm', driving
// a translate offset — a standard param-driven dimension). At gap >= 0 the
// boxes clear; past a negative gap they overlap, flipping the interference
// gate. This is the classic tolerance-stackup scenario sweep_tolerance
// targets: "does this design still clear once the real part is 0.5 mm
// oversized".
//
// Secondary fixture: two fastened parts with a LITERAL (non-swept) hole
// diameter mismatch, confirming the mounting-holes gate reuse wires
// through the same combo loop while the swept param (box height, unrelated
// to the hole) varies.
//
// Tertiary fixture: the swept quantity IS the hole diameter, bound through
// a ParamRef (`.hole({ diameter: someParamRef })`). The mounting-hole gate
// resolves ParamRef diameters against the live param table, so the envelope
// flips pass→fail once the swept side leaves the ±0.05 mm match window.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { sweepTolerance as runSweepTolerance, SWEEP_COMBO_CAP } from '../../../src/kinematic/sweepTolerance';
import { defaultSweepEvaluator } from '../../../src/composition/scriptEvaluation';
import { sweepToleranceTool } from '../../../src/agent/mcp/tools/sweepTolerance';

// The sweep takes its script evaluator by injection; the composition layer
// owns the implementation. Direct callers bind it once here.
const sweepTolerance = (input: Parameters<typeof runSweepTolerance>[0]) =>
  runSweepTolerance(input, defaultSweepEvaluator);

const CLEARANCE_CODE = `
  const arm = assembly('sweep-clearance');
  const gap = param('GapMm', 10);
  const a = box(20, 20, 20, true);
  const b = box(20, 20, 20, true).translate(gap.add(20), 0, 0);
  arm.part('a', a);
  arm.part('b', b);
  return arm.solvedModel({});
`;

const HOLE_MISMATCH_CODE = `
  const arm = assembly('sweep-bracket');
  const h = param('HeightMm', 5);
  const a = box(20, 20, h).hole('top', { u: 0, v: 0, diameter: 5, depth: 'through' });
  const b = box(20, 20, 5).hole('bottom', { u: 0, v: 0, diameter: 12, depth: 'through' });
  arm.part('a', a).connector('h', {
    type: 'frame',
    origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } },
  });
  arm.part('b', b).connector('h', {
    type: 'frame',
    origin: { kind: 'topology', query: { kind: 'face-center', name: 'bottom' } },
  });
  arm.mate('screw', 'a.h', 'b.h', 'fastened');
  return arm.solvedModel({});
`;

const HOLE_PARAM_CODE = `
  const arm = assembly('sweep-hole-dia');
  const d = param('HoleDia', 5);
  const a = box(20, 20, 5).hole('top', { u: 0, v: 0, diameter: d, depth: 'through' });
  const b = box(20, 20, 5).hole('bottom', { u: 0, v: 0, diameter: 5, depth: 'through' });
  arm.part('a', a).connector('h', {
    type: 'frame',
    origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } },
  });
  arm.part('b', b).connector('h', {
    type: 'frame',
    origin: { kind: 'topology', query: { kind: 'face-center', name: 'bottom' } },
  });
  arm.mate('screw', 'a.h', 'b.h', 'fastened');
  return arm.solvedModel({});
`;

// S3 fixture: two unrelated ledger requirements flip at different parameter
// values. `wall` is a bbox band [2,5] on a swept plate thickness (fails below
// 2); `bolt-clearance` is a maximum gap of 3 mm between two blocks (fails
// above 3). Both are ordinary S2 `require()` declarations, not mechanism gates.
const RANGE_REQUIREMENTS_CODE = `
  const arm = assembly('s3-range-proofs');
  const wall = param('Wall', 3);
  const gap = param('Gap', 2);
  const plate = box(20, 20, wall);
  const plateTop = wall.divide(2);
  const a = box(20, 20, 20).translate(0, 0, plateTop.add(10));
  const b = box(20, 20, 20).translate(0, 0, plateTop.add(30).add(gap));
  arm.part('plate', plate);
  arm.part('a', a);
  arm.part('b', b);
  require('wall', bbox(plate).within({ z: [2, 5] }));
  require('bolt-clearance', clearance(a, b).lte(3));
  return arm.model();
`;

const NO_GATES = { interference: false, mountingHoles: false, jointAxis: false } as const;

describe('sweepTolerance', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('interference gate flips pass->fail as the swept clearance closes', async () => {
    const r = await sweepTolerance({
      code: CLEARANCE_CODE,
      params: { GapMm: { values: [10, 2, 0, -5] } },
      gates: { interference: true, mountingHoles: false, jointAxis: false },
    });
    expect(r.source).toBe('local');
    expect(r.combosEvaluated).toBe(4);
    expect(r.combosCapped).toBe(false);

    const verdictByCombo = new Map(
      r.results.map((row) => [row.combo['GapMm'], row.gates['interference']]),
    );
    expect(verdictByCombo.get(10)).toBe('pass');
    expect(verdictByCombo.get(2)).toBe('pass');
    expect(verdictByCombo.get(-5)).toBe('fail');

    expect(r.ok).toBe(false);
    const firstFail = r.firstFailure['interference'];
    expect(firstFail).toBeDefined();
    expect(firstFail!.combo['GapMm']).toBe(-5);
    expect(
      firstFail!.diagnostics.some((d) => d.code === 'assembly.interference.overlap'),
    ).toBe(true);
  });

  it('min/max/steps range expands to an inclusive linspace', async () => {
    const r = await sweepTolerance({
      code: CLEARANCE_CODE,
      params: { GapMm: { min: 0, max: 10, steps: 3 } },
      gates: { interference: true, mountingHoles: false, jointAxis: false },
    });
    expect(r.combosEvaluated).toBe(3);
    const values = r.results.map((row) => row.combo['GapMm']);
    expect(values).toEqual([0, 5, 10]);
  });

  it('sweeps a ParamRef hole diameter and flips the mounting-holes gate at the mismatch threshold', async () => {
    const r = await sweepTolerance({
      code: HOLE_PARAM_CODE,
      params: { HoleDia: { values: [5, 12] } },
      gates: { interference: false, mountingHoles: true, jointAxis: false },
    });
    expect(r.combosEvaluated).toBe(2);
    const verdictByDia = new Map(
      r.results.map((row) => [row.combo['HoleDia'], row.gates['mounting-holes']]),
    );
    expect(verdictByDia.get(5)).toBe('pass');
    expect(verdictByDia.get(12)).toBe('fail');
    expect(r.ok).toBe(false);
    const firstFail = r.firstFailure['mounting-holes'];
    expect(firstFail).toBeDefined();
    expect(firstFail!.combo['HoleDia']).toBe(12);
    expect(
      firstFail!.diagnostics.some((d) => d.code === 'assembly.mounting-hole.mismatch'),
    ).toBe(true);
    expect(
      firstFail!.diagnostics.some((d) => /no hole feature/i.test(d.message)),
    ).toBe(false);
  });

  it('mounting-holes gate fires on every combo of an unrelated sweep, wiring proven', async () => {
    const r = await sweepTolerance({
      code: HOLE_MISMATCH_CODE,
      params: { HeightMm: { values: [5, 8, 12] } },
      gates: { interference: false, mountingHoles: true, jointAxis: false },
    });
    expect(r.combosEvaluated).toBe(3);
    expect(r.ok).toBe(false);
    for (const row of r.results) {
      expect(row.gates['mounting-holes']).toBe('fail');
      expect(
        row.diagnostics.some((d) => d.code === 'assembly.mounting-hole.mismatch'),
      ).toBe(true);
    }
  });

  it('caps the cartesian product at 64 combos and emits the cap diagnostic', async () => {
    const code = `
      const p1 = param('P1', 1);
      const p2 = param('P2', 1);
      const p3 = param('P3', 1);
      const p4 = param('P4', 1);
      const p5 = param('P5', 1);
      return box(p1.add(p2).add(p3).add(p4).add(p5).add(10), 10, 10);
    `;
    const values = [1, 2, 3, 4];
    const r = await sweepTolerance({
      code,
      params: {
        P1: { values }, P2: { values }, P3: { values }, P4: { values }, P5: { values },
      },
      gates: { interference: false, mountingHoles: false, jointAxis: false },
    });
    expect(r.combosCapped).toBe(true);
    expect(r.combosEvaluated).toBe(SWEEP_COMBO_CAP);
    expect(
      r.diagnostics.some((d) => d.code === 'kinematic.sweep-tolerance.combo-cap-exceeded'),
    ).toBe(true);
  });

  it('no params returns a vacuous pass with zero combos', async () => {
    const r = await sweepTolerance({ code: CLEARANCE_CODE, params: {} });
    expect(r.ok).toBe(true);
    expect(r.combosEvaluated).toBe(0);
    expect(r.results).toHaveLength(0);
    expect(r.boundaries).toHaveLength(0);
    expect(r.coverage).toMatchObject({ points: 0, boundaries: 0, proven: false });
  });

  it('evaluates every ledger requirement and reports measured / limit / margin per combo', async () => {
    const r = await sweepTolerance({
      code: RANGE_REQUIREMENTS_CODE,
      params: { Wall: { values: [1, 4] } },
      gates: NO_GATES,
      boundaryTolerance: 0.01,
    });

    expect(r.combosEvaluated).toBe(2);
    expect(r.results[0]!.requirements.map((e) => e.name)).toEqual(['wall', 'bolt-clearance']);
    const failingWall = r.results[0]!.requirements.find((e) => e.name === 'wall')!;
    expect(failingWall).toMatchObject({ status: 'fail', limit: { z: [2, 5] } });
    expect(failingWall.measured).toEqual(expect.any(Array));
    expect(failingWall.margin).toBeLessThan(0);
    expect(r.firstRequirementFailure['wall']?.combo['Wall']).toBe(1);
    expect(r.results[1]!.verdict).toBe('pass');
  });

  it('bisects a wall-thickness pass/fail transition and names the binding requirement', async () => {
    const r = await sweepTolerance({
      code: RANGE_REQUIREMENTS_CODE,
      params: { Wall: { values: [1, 4] } },
      gates: NO_GATES,
      boundaryTolerance: 0.01,
    });

    expect(r.ok).toBe(false);
    expect(r.boundaries).toHaveLength(1);
    const boundary = r.boundaries[0]!;
    expect(boundary.parameter).toBe('Wall');
    expect(boundary.direction).toBe('fail-to-pass');
    expect(boundary.failureSide).toBe('below');
    expect(boundary.value).toBeCloseTo(2, 1);
    expect(boundary.withinTolerance).toBe(true);
    expect(boundary.exhausted).toBe(false);
    expect(boundary.bindingRequirements).toEqual(['wall']);
    expect(boundary.bindingGates).toEqual([]);
    expect(boundary.message).toMatch(/wall fails below 1\.99\d? Wall/);
    expect(boundary.message).toMatch(/binding: wall/);
    expect(r.coverage.statement).toMatch(/Checked at 2 points plus 1 boundary/);
    expect(r.coverage.proven).toBe(false);
  });

  it('finds a second requirement binding at a different boundary', async () => {
    const r = await sweepTolerance({
      code: RANGE_REQUIREMENTS_CODE,
      params: { Gap: { values: [0, 4] } },
      gates: NO_GATES,
      boundaryTolerance: 0.01,
    });

    expect(r.boundaries).toHaveLength(1);
    const boundary = r.boundaries[0]!;
    expect(boundary.parameter).toBe('Gap');
    expect(boundary.direction).toBe('pass-to-fail');
    expect(boundary.failureSide).toBe('above');
    expect(boundary.value).toBeCloseTo(3, 1);
    expect(boundary.bindingRequirements).toEqual(['bolt-clearance']);
    expect(boundary.message).toMatch(/bolt-clearance fails above 3\.00\d? Gap/);
  });

  it('measures ledger requirements on a part-only script when gates are off', async () => {
    const code = `
      const width = param('Width', 20);
      const part = box(width, 10, 5);
      require('width-band', bbox(part).within({ x: [10, 30] }));
      return part;
    `;
    const r = await sweepTolerance({
      code,
      params: { Width: { values: [15, 20] } },
      gates: NO_GATES,
    });
    expect(r.ok).toBe(true);
    expect(r.results.map((row) => row.requirements[0]?.status)).toEqual(['pass', 'pass']);
    expect(r.results[0]?.requirements[0]?.measured).toEqual([15, 10, 5]);
  });

  it('reports no boundaries for a fully passing sweep', async () => {
    const r = await sweepTolerance({
      code: RANGE_REQUIREMENTS_CODE,
      params: { Wall: { values: [3, 4] } },
      gates: NO_GATES,
    });

    expect(r.ok).toBe(true);
    expect(r.boundaries).toHaveLength(0);
    expect(r.boundaryEvaluations).toBe(0);
    expect(r.coverage).toMatchObject({ points: 2, boundaries: 0, boundaryEvaluations: 0, proven: false });
  });

  it('reports an exhausted boundary interval when the bisection budget runs out', async () => {
    const r = await sweepTolerance({
      code: RANGE_REQUIREMENTS_CODE,
      params: { Wall: { values: [1, 4] } },
      gates: NO_GATES,
      boundaryTolerance: 1e-9,
      boundaryBudget: 2,
    });

    expect(r.boundaryEvaluations).toBe(2);
    expect(r.boundaries).toHaveLength(1);
    const boundary = r.boundaries[0]!;
    expect(boundary.exhausted).toBe(true);
    expect(boundary.withinTolerance).toBe(false);
    expect(boundary.evaluations).toBe(2);
    expect(boundary.bindingRequirements).toEqual(['wall']);
    expect(boundary.message).toMatch(/boundary budget exhausted/);
    expect(r.coverage.statement).toMatch(/exhausted/);
    expect(
      r.diagnostics.some((d) => d.code === 'kinematic.sweep-tolerance.boundary-budget-exhausted'),
    ).toBe(true);
  });

  it('exposes the ledger and boundaries through the MCP sweep_tolerance tool', async () => {
    const r = await sweepToleranceTool({
      code: RANGE_REQUIREMENTS_CODE,
      params: { Gap: { values: [0, 4] } },
      gates: NO_GATES,
      boundaryTolerance: 0.01,
    });

    expect(r.ok).toBe(false);
    if (!('results' in r)) throw new Error('expected a sweep result');
    expect(r.results[0]!.requirements.map((e) => [e.name, e.status])).toEqual([
      ['wall', 'pass'],
      ['bolt-clearance', 'pass'],
    ]);
    expect(r.results[1]!.requirements.find((e) => e.name === 'bolt-clearance')?.status).toBe('fail');
    expect(r.boundaries[0]!.bindingRequirements).toEqual(['bolt-clearance']);
    expect(r.firstRequirementFailure['bolt-clearance']?.combo['Gap']).toBe(4);
  });

  it('rejects sweeping a non-numeric (boolean) param with a clear diagnostic', async () => {
    const code = `
      const arm = assembly('sweep-lid');
      const hasLid = param('HasLid', true);
      const a = box(20, 20, 20, true);
      arm.part('a', a);
      return arm.solvedModel({});
    `;
    let err: unknown;
    try {
      await sweepTolerance({
        code,
        params: { HasLid: { values: [true, false] } as unknown as { values: number[] } },
        gates: { interference: false, mountingHoles: false, jointAxis: false },
      });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    expect((err as { hint?: string }).hint).toContain('invalid-args.param.type-mismatch');
    expect((err as Error).message).toMatch(/not sweepable/);
  });
});
