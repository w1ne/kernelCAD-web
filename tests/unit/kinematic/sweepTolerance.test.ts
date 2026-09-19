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
import { sweepScriptEvaluator } from '../../../src/agent/cli/commands/evaluate';

// The sweep takes its script evaluator by injection; the agent layer owns the
// implementation. Direct callers bind it once here.
const sweepTolerance = (input: Parameters<typeof runSweepTolerance>[0]) =>
  runSweepTolerance(input, sweepScriptEvaluator);

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
  const b = box(20, 20, 5).hole('bottom', { u: 0, v: 0, diameter: 6, depth: 'through' });
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
      params: { HoleDia: { values: [5, 6] } },
      gates: { interference: false, mountingHoles: true, jointAxis: false },
    });
    expect(r.combosEvaluated).toBe(2);
    const verdictByDia = new Map(
      r.results.map((row) => [row.combo['HoleDia'], row.gates['mounting-holes']]),
    );
    expect(verdictByDia.get(5)).toBe('pass');
    expect(verdictByDia.get(6)).toBe('fail');
    expect(r.ok).toBe(false);
    const firstFail = r.firstFailure['mounting-holes'];
    expect(firstFail).toBeDefined();
    expect(firstFail!.combo['HoleDia']).toBe(6);
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
    expect((err as Error).message).toMatch(/not numeric/);
  });
});
