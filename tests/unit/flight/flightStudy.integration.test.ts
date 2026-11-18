// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// arm.flightStudy end to end on real geometry (examples/flight/
// pathfinder-rocket.kcad.ts): fin planform and nose read off the lowered
// parts, mass and CG from the part materials, the evaluate-time stability
// gate, and run_flight with an inline override reproducing the reference
// trajectory.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { evaluateScript } from '../../../src/agent/cli/commands/evaluate';
import { runFlightTool } from '../../../src/agent/mcp/tools/runFlight';

const EXAMPLE = new URL('../../../examples/flight/pathfinder-rocket.kcad.ts', import.meta.url);
const CODE = readFileSync(EXAMPLE, 'utf8');

describe('arm.flightStudy on the Pathfinder geometry', () => {
  it('derives the fin planform, nose and stability from the parts', async () => {
    const r = await runFlightTool({ code: CODE, series: 'none' });
    expect(r.summary, r.error).toBeDefined();
    const s = r.summary!;
    const fins = s.aero!.fins!;
    expect(fins.source).toBe('geometry');
    expect(fins.rootChordMm).toBeCloseTo(80, 0);
    expect(fins.tipChordMm).toBeCloseTo(40, 0);
    expect(fins.spanMm).toBeCloseTo(45, 0);
    expect(fins.sweepMm).toBeCloseTo(40, 0);
    expect(fins.leadingEdgeFromNoseMm).toBeCloseTo(450, 0);
    expect(Math.abs(s.aero!.noseLengthMm - 130)).toBeLessThan(5);
    expect(s.refDiameterMm).toBeCloseTo(42, 0);
    expect(s.lengthMm).toBeCloseTo(530, 0);
    // The motor part is replaced by the declared motor; PLA parts carry density mass.
    expect(s.massBreakdown.find(p => p.part === 'motor')!.source).toBe('motor.totalMassKg');
    expect(s.massBreakdown.find(p => p.part === 'fins')!.source).toBe('material');
    // CG moves forward as the propellant (in the tail) burns.
    expect(s.stability!.cgBurnoutFromNoseMm).toBeLessThan(s.stability!.cgLiftoffFromNoseMm);
    expect(s.stability!.minCal).toBeGreaterThan(1);
    expect(s.apogeeM).toBeGreaterThan(200);
    expect(r.animation!.tracks.map(t => t.param)).toEqual([
      'flight_altitude_mm', 'flight_downrange_mm', 'flight_chute', 'flight_separation_mm',
    ]);
  }, 300_000);

  it('reproduces the reference trajectory with the reference dry mass', async () => {
    const r = await runFlightTool({ code: CODE, dry_mass_kg: 0.285, aero: { cd: 0.55, refDiameterMm: 42, nose: { part: 'ogive-nose-cone' }, fins: { count: 3, part: 'fins' } }, series: 'csv', sample_dt_s: 1 });
    const s = r.summary!;
    expect(s.liftoffMassKg).toBeCloseTo(0.347, 6);
    expect(Math.abs(s.apogeeM - 368)).toBeLessThan(3.7);
    expect(Math.abs(s.apogeeTimeS - 8.9)).toBeLessThan(0.1);
    expect(Math.abs(s.maxSpeedMs - 87)).toBeLessThan(1);
    expect(Math.abs(s.railExitSpeedMs - 15.1)).toBeLessThan(0.2);
    expect(Math.abs(s.descentRateMs - 4.6)).toBeLessThan(0.1);
    expect((r.series as { csv: string }).csv.split('\n')[0]).toMatch(/^t,x_m,z_m/);
  }, 300_000);

  it('passes evaluate at a 1-caliber minimum and fails it at 5 calibers', async () => {
    const pass = await evaluateScript({ code: CODE });
    expect(pass.diagnostics.filter(d => d.code.startsWith('flight.stability'))).toEqual([]);
    expect(pass.exitCode).toBe(0);

    const fail = await evaluateScript({ code: CODE.replace('minStabilityCal: 1.0', 'minStabilityCal: 5') });
    expect(fail.exitCode).toBe(1);
    const d = fail.diagnostics.find(x => x.code === 'flight.stability.below-min');
    expect(d?.severity).toBe('error');
    expect(d?.message).toMatch(/static margin \d+\.\d\d cal is below minStabilityCal 5/);
  }, 300_000);

  it('names the missing part instead of guessing', async () => {
    const r = await runFlightTool({ code: CODE.replace("fins: { count: 3, part: 'fins' }", "fins: { count: 3, part: 'fin-can' }"), series: 'none' });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('flight.study.part-unresolved');
    expect(r.error).toMatch(/'fin-can'/);
  }, 300_000);

  it('runs an inline study on a one-solid rocket returned by the script', async () => {
    const r = await runFlightTool({
      code: 'return cylinder(400, 21);',
      motor: { thrustCurve: [[0, 0], [0.05, 18], [0.15, 30], [0.25, 31], [0.4, 24], [0.6, 20], [1.0, 18.5], [1.4, 18], [1.7, 17], [1.9, 12], [2.05, 4], [2.12, 0]], totalMassKg: 0.062, propellantKg: 0.03 },
      aero: { cd: 0.55, refDiameterMm: 42 },
      launch: { railM: 1.5, siteAltitudeM: 120 },
      recovery: [{ cd: 1.5, diameterMm: 450, deploy: 'apogee+1' }],
      dry_mass_kg: 0.285,
      series: 'json',
    });
    expect(r.ok, r.error).toBe(true);
    expect(Math.abs(r.summary!.apogeeM - 368)).toBeLessThan(3.7);
    expect((r.series as { columns: string[] }).columns).toContain('p_static_hpa');
  }, 300_000);
});
