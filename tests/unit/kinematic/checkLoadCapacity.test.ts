// tests/unit/kinematic/checkLoadCapacity.test.ts
//
// T6.5 — closed-form beam dispatch + K6 / K7 / K8 emit paths.
//
// Hand calc for the 50 (w) × 5 (h) × 200 (L) mm rectangle:
//   I  = w·h^3/12 = 50·125/12 mm^4 = 520.833 mm^4 = 5.2083e-10 m^4
//   c  = h/2 = 2.5 mm = 0.0025 m
//   L  = 200 mm = 0.2 m
//
// Case A — steel 50 N tip load (bending about the 5 mm depth):
//   M  = F·L = 50·0.2 = 10 N·m
//   σ  = M·c/I = 10·0.0025 / 5.2083e-10 = 4.8e7 Pa = 48 MPa
//   SF = 250 MPa / 48 MPa ≈ 5.208
//
// Case B — PLA 500 N tip load:
//   M  = 100 N·m, σ = 480 MPa → SF = 50 / 480 ≈ 0.104 (fails K6)
//
// Bending sense: we drive the load straight into the thin-axis direction
// (force in [0, 0, F]) so the 5 mm depth carries the bending — this is the
// regime where the closed-form rectangle has c = h/2 = 2.5 mm.

import { describe, it, expect } from 'vitest';
import { beforeAll } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { checkLoadCapacity } from '../../../src/kinematic/checkLoadCapacity';
import { buildCantileverBracket } from './fixtures/cantileverBracket';

describe('checkLoadCapacity — T6 closed-form Euler-Bernoulli', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('steel cantilever 50×5×200 mm + 50 N → SF ≈ 5.2, ok=true', async () => {
    const { arm, partName } = buildCantileverBracket();
    const r = await checkLoadCapacity(
      arm,
      { [partName]: { force: [0, 0, 50] } },
      { materials: { [partName]: { material: 'steel' } } },
    );
    expect(r.source).toBe('local');
    expect(r.ok).toBe(true);
    expect(r.failures).toHaveLength(0);
    expect(r.elements).toHaveLength(1);
    const el = r.elements[0]!;
    expect(el.partName).toBe(partName);
    // Hand calc: σ = 4.8e7 Pa.
    expect(el.stressPa).toBeCloseTo(4.8e7, -3);
    expect(el.yieldPa).toBe(250e6);
    expect(el.safetyFactor).toBeCloseTo(5.208, 2);
    expect(r.safetyFactor).toBeCloseTo(5.208, 2);
  });

  it('PLA cantilever same geometry + 500 N → SF ≈ 0.10, fires K6 + ok=false', async () => {
    const { arm, partName } = buildCantileverBracket();
    const r = await checkLoadCapacity(
      arm,
      { [partName]: { force: [0, 0, 500] } },
      { materials: { [partName]: { material: 'pla' } } },
    );
    expect(r.ok).toBe(false);
    expect(r.failures).toHaveLength(1);
    const failure = r.failures[0]!;
    expect(failure.element).toBe(partName);
    expect(failure.elementKind).toBe('part');
    expect(failure.reason).toBe('stress-exceeds-yield');
    expect(failure.yieldStress).toBe(50e6);
    expect(failure.stress).toBeCloseTo(4.8e8, -5);
    const codes = r.diagnostics.map((d) => d.code);
    expect(codes).toContain('kinematic.load-exceeds-yield');
    const k6 = r.diagnostics.find(
      (d) => d.code === 'kinematic.load-exceeds-yield',
    );
    expect(k6?.severity).toBe('error');
    expect(k6?.source).toBe('local');
    expect(k6?.element).toBe(partName);
    expect(r.safetyFactor).toBeLessThan(1.5);
  });

  it('missing material declaration → K8, no compute, ok=false', async () => {
    const { arm, partName } = buildCantileverBracket();
    const r = await checkLoadCapacity(arm, {
      [partName]: { force: [0, 0, 50] },
    });
    expect(r.ok).toBe(false);
    expect(r.elements).toHaveLength(0);
    expect(r.failures).toHaveLength(0);
    const codes = r.diagnostics.map((d) => d.code);
    expect(codes).toContain('kinematic.no-material-declared');
    const k8 = r.diagnostics.find(
      (d) => d.code === 'kinematic.no-material-declared',
    );
    expect(k8?.severity).toBe('error');
    expect(k8?.source).toBe('local');
    expect(k8?.nextAction.kind).toBe('fix-arg');
  });

  it('part without crossSection → K7 beam-not-applicable, no K6', async () => {
    const { arm, partName } = buildCantileverBracket({
      withCrossSection: false,
    });
    const r = await checkLoadCapacity(
      arm,
      { [partName]: { force: [0, 0, 50] } },
      { materials: { [partName]: { material: 'steel' } } },
    );
    expect(r.ok).toBe(true); // K7 is severity:warn, not a failure
    expect(r.elements).toHaveLength(0);
    expect(r.failures).toHaveLength(0);
    const codes = r.diagnostics.map((d) => d.code);
    expect(codes).toContain('kinematic.load.beam-not-applicable');
    expect(codes).not.toContain('kinematic.load-exceeds-yield');
    const k7 = r.diagnostics.find(
      (d) => d.code === 'kinematic.load.beam-not-applicable',
    );
    expect(k7?.severity).toBe('warn');
    expect(k7?.element).toBe(partName);
    expect(k7?.source).toBe('local');
  });

  it('custom material with explicit yield + modulus rounds-trips', async () => {
    const { arm, partName } = buildCantileverBracket();
    const r = await checkLoadCapacity(
      arm,
      { [partName]: { force: [0, 0, 50] } },
      {
        materials: {
          [partName]: {
            material: 'custom',
            yieldStressMPa: 600,
            youngsModulusGPa: 210,
          },
        },
      },
    );
    expect(r.ok).toBe(true);
    expect(r.elements[0]!.yieldPa).toBe(6e8);
    expect(r.elements[0]!.safetyFactor).toBeCloseTo(600 / 48, 2);
  });

  it('mode: stub re-exports the v0.7.4 substrate (joint-load magnitude)', async () => {
    const { arm } = buildCantileverBracket();
    const r = await checkLoadCapacity(
      arm,
      {},
      { mode: 'stub' },
    );
    expect(r.source).toBe('local');
    // Empty externalLoads on the substrate → empty diagnostics envelope.
    expect(r.ok).toBe(true);
    expect(r.failures).toHaveLength(0);
  });

  it('honours opts.safetyFactorThreshold — failing a borderline pass', async () => {
    // Steel 50 N → SF ≈ 5.21. Raising the threshold to 10 should fail it.
    const { arm, partName } = buildCantileverBracket();
    const r = await checkLoadCapacity(
      arm,
      { [partName]: { force: [0, 0, 50] } },
      {
        materials: { [partName]: { material: 'steel' } },
        safetyFactorThreshold: 10,
      },
    );
    expect(r.ok).toBe(false);
    expect(r.failures).toHaveLength(1);
    expect(r.failures[0]!.reason).toBe('stress-exceeds-yield');
  });

  it('empty loads → empty-success envelope with safetyFactor = Infinity', async () => {
    const { arm } = buildCantileverBracket();
    const r = await checkLoadCapacity(arm);
    expect(r.ok).toBe(true);
    expect(r.elements).toHaveLength(0);
    expect(r.failures).toHaveLength(0);
    expect(r.safetyFactor).toBe(Number.POSITIVE_INFINITY);
  });
});
