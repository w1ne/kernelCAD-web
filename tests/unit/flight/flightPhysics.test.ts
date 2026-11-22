// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Flight-study physics, pinned against the LabWired Pathfinder reference
// (labwired-rocket/physics/flight_sim.py: 1-D point mass, RK4 at 1 ms, ISA,
// Cd 0.55 on a 42 mm body, 450 mm Cd 1.5 chute at apogee + 1 s). The
// reference script prints apogee 368.1 m at 8.92 s, max 87.2 m/s, rail exit
// 15.09 m/s, descent 4.64 m/s, landing 87.4 s.

import { describe, expect, it } from 'vitest';
import { isa } from '../../../src/kernel/flight/atmosphere';
import { barrowmanCp, estimateCd } from '../../../src/kernel/flight/barrowman';
import { Motor, parseEngFile } from '../../../src/kernel/flight/motor';
import { runFlightStudy, seriesCsv } from '../../../src/kernel/flight/runFlight';
import { simulateFlight } from '../../../src/kernel/flight/simulate';
import { normalizeFlightStudy } from '../../../src/kernel/flight/studySpec';

const CURVE: Array<[number, number]> = [[0, 0], [0.05, 18], [0.15, 30], [0.25, 31], [0.4, 24], [0.6, 20], [1.0, 18.5],
  [1.4, 18], [1.7, 17], [1.9, 12], [2.05, 4], [2.12, 0]];

const REFERENCE_SPEC = {
  motor: { thrustCurve: CURVE, totalMassKg: 0.062, propellantKg: 0.030 },
  aero: { cd: 0.55, refDiameterMm: 42 },
  launch: { railM: 1.5, angleDeg: 0, siteAltitudeM: 120, windMs: 0 },
  recovery: [{ cd: 1.5, diameterMm: 450, deploy: 'apogee+1s' as const }],
  dryMassKg: 0.285,
};

describe('ISA atmosphere', () => {
  it('matches the standard table at sea level and 1000 m', () => {
    expect(isa(0).pressurePa).toBeCloseTo(101325, 0);
    expect(isa(0).density).toBeCloseTo(1.225, 3);
    expect(isa(1000).pressurePa).toBeCloseTo(89875, -1);
    expect(isa(1000).temperatureK).toBeCloseTo(281.65, 2);
  });
});

describe('motor', () => {
  it('integrates the thrust table and burns propellant with impulse', () => {
    const m = new Motor(CURVE, 0.062, 0.030);
    expect(m.totalImpulseNs).toBeCloseTo(38.915, 3);
    expect(m.impulseClass()).toBe('E');
    expect(m.massAt(0)).toBeCloseTo(0.062, 9);
    expect(m.massAt(5)).toBeCloseTo(0.032, 9);
    expect(m.thrust(0.2)).toBeCloseTo(30.5, 9);
  });

  it('parses a RASP .eng file', () => {
    const eng = parseEngFile('; test\nF30 24 70 4-8 0.030 0.062 Test\n0.05 18\n0.15 30\n2.12 0\n');
    expect(eng.designation).toBe('F30');
    expect(eng.thrustCurve[0]).toEqual([0, 0]);
    expect(eng.propellantKg).toBe(0.03);
    expect(eng.totalMassKg).toBe(0.062);
  });
});

describe('trajectory vs the Pathfinder reference', () => {
  const r = runFlightStudy(normalizeFlightStudy(REFERENCE_SPEC), []);
  const s = r.summary!;

  it('reproduces apogee, speeds, rail exit and descent', () => {
    expect(r.ok).toBe(true);
    expect(s.liftoffMassKg).toBeCloseTo(0.347, 9);
    expect(s.apogeeM).toBeGreaterThan(368 * 0.99);
    expect(s.apogeeM).toBeLessThan(368 * 1.01);
    expect(Math.abs(s.apogeeTimeS - 8.9)).toBeLessThan(0.1);
    expect(Math.abs(s.maxSpeedMs - 87)).toBeLessThan(1);
    expect(Math.abs(s.railExitSpeedMs - 15.1)).toBeLessThan(0.2);
    expect(Math.abs(s.descentRateMs - 4.6)).toBeLessThan(0.1);
    expect(Math.abs(s.landingTimeS - 87.4)).toBeLessThan(1);
    expect(s.landed).toBe(true);
  });

  it('orders the flight events and opens the chute 1 s after apogee', () => {
    const names = s.events.map(e => e.name);
    expect(names).toEqual(['ignition', 'liftoff', 'rail-exit', 'burnout', 'apogee', 'deploy', 'landing']);
    const apogee = s.events.find(e => e.name === 'apogee')!;
    const deploy = s.events.find(e => e.name === 'deploy')!;
    expect(deploy.t - apogee.t).toBeCloseTo(1, 2);
  });

  it('exports a series with static pressure and a 1 g pad accelerometer reading', () => {
    const csv = seriesCsv(r.rows, 0.5).trim().split('\n');
    expect(csv[0]).toBe('t,x_m,z_m,v_ms,vz_ms,a_ms2,a_axial_ms2,p_static_hpa,temp_c,mass_kg,thrust_n,chute');
    const first = csv[1].split(',').map(Number);
    expect(first[6]).toBeCloseTo(9.80665, 3);
    expect(first[7]).toBeCloseTo(isa(120).pressurePa / 100, 2);
    expect(csv.length).toBeGreaterThan(150);
  });

  it('drifts downrange with wind and a tilted rail, and still lands', () => {
    const tilted = runFlightStudy(normalizeFlightStudy({ ...REFERENCE_SPEC, launch: { ...REFERENCE_SPEC.launch, angleDeg: 5, windMs: 3 } }), []);
    expect(tilted.summary!.downrangeM).toBeGreaterThan(10);
    expect(tilted.summary!.apogeeM).toBeLessThan(s.apogeeM);
    expect(tilted.summary!.landed).toBe(true);
  });

  it('reports no liftoff when thrust never beats weight', () => {
    const heavy = runFlightStudy(normalizeFlightStudy({ ...REFERENCE_SPEC, dryMassKg: 5 }), []);
    expect(heavy.ok).toBe(false);
    expect(heavy.diagnostics.map(d => d.code)).toContain('flight.sim.no-liftoff');
  });

  it('pure simulator agrees with the study runner', () => {
    const sim = simulateFlight({
      dryMassKg: 0.285, motor: new Motor(CURVE, 0.062, 0.03), cdA: 0.55 * Math.PI * 0.021 ** 2,
      recovery: [], railM: 1.5, angleDeg: 0, siteAltitudeM: 120, windMs: 0, maxTimeS: 30, dtS: 0.001,
    });
    expect(sim.apogeeM).toBeCloseTo(s.apogeeM, 6);
  });
});

describe('Barrowman', () => {
  it('puts a cone CP at 2/3 and an ogive CP at 0.466 of the nose length', () => {
    expect(barrowmanCp({ refDiameterM: 0.04, lengthM: 0.5, nose: { shape: 'cone', lengthM: 0.12 } }).xM).toBeCloseTo(0.08, 9);
    expect(barrowmanCp({ refDiameterM: 0.04, lengthM: 0.5, nose: { shape: 'ogive', lengthM: 0.1 } }).xM).toBeCloseTo(0.0466, 9);
  });

  it('matches the closed form for four square fins (span = diameter)', () => {
    // CNa = (1 + R/(s+R)) * 16 (s/d)^2 / (1 + sqrt(1 + (2 lf/(cr+ct))^2)), lf = s, cr = ct = s:
    // (4/3) * 16 / (1 + sqrt 2) = 8.837; fin CP at LE + c/4.
    const d = 0.04;
    const r = barrowmanCp({
      refDiameterM: d, lengthM: 0.5, nose: { shape: 'cone', lengthM: 0.1 },
      fins: { count: 4, rootChordM: d, tipChordM: d, spanM: d, sweepM: 0, leadingEdgeM: 0.4, thicknessM: 0.003 },
    });
    const fins = r.components.find(c => c.name === 'fins')!;
    expect(fins.cnAlpha).toBeCloseTo(((4 / 3) * 16) / (1 + Math.SQRT2), 9);
    expect(fins.xM).toBeCloseTo(0.4 + d / 4, 9);
  });

  it("estimates a plausible model-rocket Cd for 'auto'", () => {
    const est = estimateCd({
      refDiameterM: 0.042, lengthM: 0.53, nose: { shape: 'ogive', lengthM: 0.13 },
      fins: { count: 3, rootChordM: 0.08, tipChordM: 0.04, spanM: 0.045, sweepM: 0.04, leadingEdgeM: 0.45, thicknessM: 0.003 },
    });
    expect(est.cd).toBeGreaterThan(0.3);
    expect(est.cd).toBeLessThan(0.7);
  });
});

describe('study validation', () => {
  it('rejects a propellant mass at or above the motor mass', () => {
    expect(() => normalizeFlightStudy({ ...REFERENCE_SPEC, motor: { ...REFERENCE_SPEC.motor, propellantKg: 0.07 } }))
      .toThrow(/motor\.propellantKg/);
  });

  it('rejects an unparseable deploy event', () => {
    expect(() => normalizeFlightStudy({ ...REFERENCE_SPEC, recovery: [{ cd: 1.5, diameterMm: 450, deploy: 'later' as never }] }))
      .toThrow(/recovery\[0\]\.deploy/);
  });

  it("parses 'apogee', 'apogee+2' and { atS }", () => {
    const m = normalizeFlightStudy({ ...REFERENCE_SPEC, recovery: [
      { cd: 1, diameterMm: 300, deploy: 'apogee' },
      { cd: 1, diameterMm: 300, deploy: 'apogee+2' },
      { cd: 1, diameterMm: 300, deploy: { atS: 12 } },
    ] });
    expect(m.recovery.map(r => r.deploy)).toEqual([
      { kind: 'apogee', delayS: 0 }, { kind: 'apogee', delayS: 2 }, { kind: 'time', atS: 12 },
    ]);
  });

  it('fails a declared minStabilityCal it cannot compute instead of passing it', () => {
    const r = runFlightStudy(normalizeFlightStudy({ ...REFERENCE_SPEC, minStabilityCal: 1 }), []);
    expect(r.ok).toBe(false);
    expect(r.diagnostics.map(d => d.code)).toContain('flight.stability.unresolved');
  });
});
