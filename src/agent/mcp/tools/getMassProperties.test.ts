// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Checks inspect({ of: 'mass' }) against closed-form solutions, not against our
// own prior output — a snapshot of a wrong tensor is still wrong.
import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import { getMassPropertiesTool } from './getMassProperties';

const STEEL = 7850; // kg/m^3
const SIDE_MM = 10;

describe('inspect({ of: "mass" })', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('matches the closed form for a steel cube', async () => {
    const r = await getMassPropertiesTool({
      code: `return box(${SIDE_MM}, ${SIDE_MM}, ${SIDE_MM}, true);`,
      density: STEEL,
    });

    expect(r.ok, r.error).toBe(true);
    const mp = r.massProperties!;

    // m = V * rho. 1000 mm^3 = 1e-6 m^3; * 7850 = 7.85e-3 kg.
    const sideM = SIDE_MM * 1e-3;
    const expectedMass = sideM ** 3 * STEEL;
    expect(mp.mass).toBeCloseTo(expectedMass, 6);
    expect(mp.volume).toBeCloseTo(SIDE_MM ** 3, 3);

    // Centered box → CoM at the origin.
    for (const c of mp.com) expect(c).toBeCloseTo(0, 6);

    // Solid cube about its centroid: I = m*s^2/6 on every principal axis,
    // products of inertia zero by symmetry.
    const expectedI = (expectedMass * sideM ** 2) / 6;
    const [ixx, ixy, ixz, iyy, iyz, izz] = mp.inertia6;
    expect(ixx).toBeCloseTo(expectedI, 9);
    expect(iyy).toBeCloseTo(expectedI, 9);
    expect(izz).toBeCloseTo(expectedI, 9);
    expect(ixy).toBeCloseTo(0, 9);
    expect(ixz).toBeCloseTo(0, 9);
    expect(iyz).toBeCloseTo(0, 9);

    expect(mp.density).toBe(STEEL);
    expect(mp.densityDefaulted).toBe(false);
    expect(r.warning).toBeUndefined();
  });

  it('defaults density to water and says so, rather than silently guessing', async () => {
    const r = await getMassPropertiesTool({ code: 'return box(10, 10, 10);' });

    expect(r.ok, r.error).toBe(true);
    expect(r.massProperties!.density).toBe(1000);
    expect(r.massProperties!.densityDefaulted).toBe(true);
    // The whole point: a defaulted density must be visible, or an agent will
    // report a water-density mass for a steel bracket and never know.
    expect(r.warning).toMatch(/default density/i);
  });

  it('reports CoM offset for an off-origin part', async () => {
    // Uncentered box spans 0..10 on each axis → centroid at (5, 5, 5).
    const r = await getMassPropertiesTool({ code: 'return box(10, 10, 10);' });

    expect(r.ok, r.error).toBe(true);
    for (const c of r.massProperties!.com) expect(c).toBeCloseTo(5, 6);
  });

  it('scales mass linearly with density', async () => {
    const code = 'return box(10, 10, 10);';
    const water = await getMassPropertiesTool({ code, density: 1000 });
    const steel = await getMassPropertiesTool({ code, density: STEEL });

    expect(steel.massProperties!.mass / water.massProperties!.mass).toBeCloseTo(7.85, 6);
  });

  it('rejects a non-positive density instead of returning a nonsense mass', async () => {
    const r = await getMassPropertiesTool({ code: 'return box(10, 10, 10);', density: 0 });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('feature.invalid-args');
  });
});
