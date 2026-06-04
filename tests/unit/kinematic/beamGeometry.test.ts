// tests/unit/kinematic/beamGeometry.test.ts
//
// T6.4 — closed-form cross-section properties.
//
// Bending stress = M·c/I where:
//   - c = distance from the neutral axis to the extreme fibre (m)
//   - I = second moment of area about the neutral axis (m^4)
// All call sites take section dimensions in millimetres and SI-convert
// internally; this test asserts the SI outputs hand-derived from the
// closed-form formulas.

import { describe, it, expect } from 'vitest';
import { sectionProperties } from '../../../src/kinematic/beamGeometry';

const MM_TO_M = 1e-3;
const MM_TO_M_3 = MM_TO_M ** 3;
const MM_TO_M_4 = MM_TO_M ** 4;

describe('sectionProperties — T6.4 closed-form', () => {
  it('computes a 50 (w) × 5 (h) × 200 (L) mm rectangle: c = 2.5 mm, I = 520.833 mm^4', () => {
    const r = sectionProperties({
      kind: 'rectangle',
      widthMm: 50,
      heightMm: 5,
      lengthMm: 200,
    });
    // c = h/2 = 2.5 mm = 0.0025 m
    expect(r.cM).toBeCloseTo(0.0025, 9);
    // I = w · h^3 / 12 = 50 · 125 / 12 ≈ 520.8333 mm^4
    const expectedIMm4 = (50 * 5 ** 3) / 12;
    expect(r.iM4).toBeCloseTo(expectedIMm4 * MM_TO_M_4, 18);
    // length round-trip
    expect(r.lengthM).toBeCloseTo(0.2, 9);
    // bend axis tracks h (bending about the width axis).
    expect(r.appliesFor).toBe('cantilever');
  });

  it('computes a 5 (w) × 50 (h) × 200 (L) mm rectangle: c = 25 mm, I = 52083.33 mm^4', () => {
    const r = sectionProperties({
      kind: 'rectangle',
      widthMm: 5,
      heightMm: 50,
      lengthMm: 200,
    });
    expect(r.cM).toBeCloseTo(0.025, 9);
    const expectedIMm4 = (5 * 50 ** 3) / 12;
    expect(expectedIMm4).toBeCloseTo(52083.333, 3);
    expect(r.iM4).toBeCloseTo(expectedIMm4 * MM_TO_M_4, 18);
  });

  it('computes a circle r=10 mm: c = 10 mm, I = π·r^4/4 = 7853.98 mm^4', () => {
    const r = sectionProperties({
      kind: 'circle',
      radiusMm: 10,
      lengthMm: 100,
    });
    expect(r.cM).toBeCloseTo(0.01, 9);
    const expectedIMm4 = (Math.PI * 10 ** 4) / 4;
    expect(expectedIMm4).toBeCloseTo(7853.98, 2);
    expect(r.iM4).toBeCloseTo(expectedIMm4 * MM_TO_M_4, 18);
    expect(r.lengthM).toBeCloseTo(0.1, 9);
  });

  it('computes an i-beam (flange 50×5, web 40×3, L=300 mm) by parallel-axis composition', () => {
    // Two flanges 50×5 plus a 3×40 web. Total height = 40 + 2·5 = 50 mm,
    // c = 25 mm. I = I_web + 2 · (I_flange + A_flange · d^2) where d is the
    // distance from the i-beam's neutral axis to each flange's own neutral
    // axis = (h_web + t_flange)/2 = 22.5 mm.
    const r = sectionProperties({
      kind: 'i-beam',
      flangeWidthMm: 50,
      flangeThicknessMm: 5,
      webHeightMm: 40,
      webThicknessMm: 3,
      lengthMm: 300,
    });
    expect(r.cM).toBeCloseTo(0.025, 9);

    const iWeb = (3 * 40 ** 3) / 12; // = 16000 mm^4
    const iFlangeOwn = (50 * 5 ** 3) / 12; // = 520.833 mm^4
    const aFlange = 50 * 5; // = 250 mm^2
    const d = (40 + 5) / 2; // = 22.5 mm
    const iFlangeShifted = iFlangeOwn + aFlange * d * d;
    const expectedIMm4 = iWeb + 2 * iFlangeShifted;
    expect(r.iM4).toBeCloseTo(expectedIMm4 * MM_TO_M_4, 18);
    expect(r.lengthM).toBeCloseTo(0.3, 9);
  });

  it('reports the section modulus c·I^-1 inverse (Z = I/c) for the rectangle in m^3', () => {
    const r = sectionProperties({
      kind: 'rectangle',
      widthMm: 50,
      heightMm: 5,
      lengthMm: 200,
    });
    // Z = w · h^2 / 6 = 50 · 25 / 6 ≈ 208.333 mm^3
    const expectedZMm3 = (50 * 5 ** 2) / 6;
    expect(r.sectionModulusM3).toBeCloseTo(expectedZMm3 * MM_TO_M_3, 18);
  });
});
