// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { pressureDropKPa, TUBE_FLUIDS } from '../../../src/shared/tube/pressureDrop';

describe('pressureDropKPa', () => {
  it('laminar straight tube matches Hagen–Poiseuille', () => {
    // water, 1 L/min, 10 mm bore, 1 m: Re ≈ 2122 (laminar)
    const got = pressureDropKPa({ idMm: 10, lengthMm: 1000, bendAnglesDeg: [], flowLpm: 1, fluid: TUBE_FLUIDS.water });
    const q = 1 / 60000; const mu = 1000 * 1e-6; const d = 0.01;
    const want = ((128 * mu * 1 * q) / (Math.PI * d ** 4)) / 1000;
    expect(got).toBeCloseTo(want, 6);
  });

  it('bends add loss and zero flow gives zero', () => {
    const base = { idMm: 7.7, lengthMm: 800, flowLpm: 12, fluid: TUBE_FLUIDS['mil-prf-83282'] };
    const straight = pressureDropKPa({ ...base, bendAnglesDeg: [] });
    const bent = pressureDropKPa({ ...base, bendAnglesDeg: [90, 90, 45] });
    expect(bent).toBeGreaterThan(straight);
    expect(pressureDropKPa({ ...base, flowLpm: 0, bendAnglesDeg: [90] })).toBe(0);
  });
});
