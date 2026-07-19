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

  it('surfaces the inertia matrix, principal moments/axes and symmetry flags', async () => {
    const r = await getMassPropertiesTool({ code: 'return box(20, 10, 30);', density: 1000 });
    expect(r.ok).toBe(true);
    const mp = r.massProperties!;

    // The matrix must agree with the 6-vector the tool already returned, so an
    // agent reading either representation gets the same physics.
    const [ixx, ixy, ixz, iyy, iyz, izz] = mp.inertia6;
    expect(mp.inertiaMatrix).toEqual([
      [ixx, ixy, ixz],
      [ixy, iyy, iyz],
      [ixz, iyz, izz],
    ]);

    expect(mp.principalMoments).toHaveLength(3);
    expect(mp.principalAxes).toHaveLength(3);
    for (const ax of mp.principalAxes) expect(Math.hypot(...ax)).toBeCloseTo(1, 9);
    // Three distinct side lengths => no degenerate axis.
    expect(mp.hasSymmetryAxis).toBe(false);
    expect(mp.hasSymmetryPoint).toBe(false);
  });

  it('omits radiusOfGyration unless gyration_axis is supplied', async () => {
    const r = await getMassPropertiesTool({ code: 'return box(20, 10, 30);' });
    expect(r.massProperties!.radiusOfGyration).toBeUndefined();
  });

  it('returns the radius of gyration in mm about a requested axis', async () => {
    const [a, b, c] = [20, 10, 30];
    const r = await getMassPropertiesTool({
      code: `return box(${a}, ${b}, ${c});`,
      gyration_axis: { origin: [a / 2, b / 2, c / 2], direction: [0, 0, 1] },
    });
    expect(r.ok).toBe(true);
    // k_z = sqrt((a^2 + b^2)/12) for a rectangular prism about its centroidal Z.
    expect(r.massProperties!.radiusOfGyration).toBeCloseTo(
      Math.sqrt((a * a + b * b) / 12),
      6,
    );
  });

  it('accepts a named material as an alternative to a raw density', async () => {
    const r = await getMassPropertiesTool({
      code: `return box(${SIDE_MM}, ${SIDE_MM}, ${SIDE_MM}, true);`,
      material: 'steel',
    });
    expect(r.ok, r.error).toBe(true);
    const mp = r.massProperties!;
    // Same mass as passing density: 7850 directly.
    const sideM = SIDE_MM * 1e-3;
    expect(mp.mass).toBeCloseTo(sideM ** 3 * STEEL, 6);
    expect(mp.density).toBe(STEEL);
    // A material-seeded density is a REAL number, not a default.
    expect(mp.densitySource).toBe('material');
    expect(mp.densityDefaulted).toBe(false);
    expect(mp.material).toBe('steel');
    expect(r.warning).toBeUndefined();
  });

  it('resolves the aluminium (UK) spelling to the canonical material + density', async () => {
    const r = await getMassPropertiesTool({ code: 'return box(10, 10, 10);', material: 'aluminium' });
    expect(r.ok, r.error).toBe(true);
    expect(r.massProperties!.density).toBe(2700);
    expect(r.massProperties!.material).toBe('aluminum');
    expect(r.massProperties!.densityDefaulted).toBe(false);
  });

  it('marks a raw density as source "raw", not defaulted', async () => {
    const r = await getMassPropertiesTool({ code: 'return box(10, 10, 10);', density: STEEL });
    expect(r.massProperties!.densitySource).toBe('raw');
    expect(r.massProperties!.densityDefaulted).toBe(false);
    expect(r.massProperties!.material).toBeUndefined();
  });

  it('marks the water fallback as source "default" and still warns', async () => {
    const r = await getMassPropertiesTool({ code: 'return box(10, 10, 10);' });
    expect(r.massProperties!.densitySource).toBe('default');
    expect(r.massProperties!.densityDefaulted).toBe(true);
    expect(r.warning).toMatch(/default density/i);
  });

  it('rejects an unknown material naming the valid ones, never silently water', async () => {
    const r = await getMassPropertiesTool({ code: 'return box(10, 10, 10);', material: 'kryptonite' });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('feature.invalid-args');
    expect(r.error).toMatch(/kryptonite.*not a known material/i);
    expect(r.error).toMatch(/steel/);
  });

  it('rejects a finish-only token as a material with a .finish hint', async () => {
    const r = await getMassPropertiesTool({ code: 'return box(10, 10, 10);', material: 'brass' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/\.finish\('brass'\)/);
  });

  it('rejects passing both density and material', async () => {
    const r = await getMassPropertiesTool({
      code: 'return box(10, 10, 10);',
      density: STEEL,
      material: 'steel',
    });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('feature.invalid-args');
    expect(r.error).toMatch(/either.*density.*or.*material|not both/i);
  });

  it('rejects a malformed or zero-length gyration axis', async () => {
    const code = 'return box(10, 10, 10);';
    const zero = await getMassPropertiesTool({
      code,
      gyration_axis: { origin: [0, 0, 0], direction: [0, 0, 0] },
    });
    expect(zero.ok).toBe(false);
    expect(zero.errorCode).toBe('feature.invalid-args');

    const malformed = await getMassPropertiesTool({
      code,
      // Two components instead of three — an easy agent mistake.
      gyration_axis: { origin: [0, 0], direction: [0, 0, 1] } as never,
    });
    expect(malformed.ok).toBe(false);
    expect(malformed.errorCode).toBe('feature.invalid-args');
  });
});
