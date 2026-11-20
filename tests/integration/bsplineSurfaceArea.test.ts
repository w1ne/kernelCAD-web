// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A non-uniform scale turns analytic faces into rational B-spline faces, and
// the fixed-order OCCT area integration read them 0.05 % to 0.39 % high:
// `sphere(1).scale([1, 1, 2])` measured 21.5618 mm² instead of 21.4784 mm².
// Strongly rational shapes now take the adaptive integration. Its residual
// is shape-dependent (1e-9 to 4e-6), so the bound here is 1e-5: every old
// value fails it.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, type OcctBackend } from '../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../src/modeling/backends/occt/occtLowerer';

async function lower(code: string): Promise<OcctBackend> {
  const run = await runScript({ code, fileName: 'test.kcad.ts' });
  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const r = await engine.run(run.records, { paramTable: run.paramTable });
  const errors = r.diagnostics.filter((d) => d.severity === 'error');
  expect(errors).toEqual([]);
  return r.shapes.get(run.records[run.records.length - 1].id) as OcctBackend;
}

beforeAll(async () => {
  await initOcct();
}, 120_000);

const PI = Math.PI;
// Perimeter of the ellipse with semi-axes 2 and 1 (complete elliptic integral).
const ELLIPSE_2_1_PERIMETER = 9.688448220547677;
// Prolate spheroid, semi-axes 1, 1, 2: 2π(1 + 2·asin(e)/e), e = √3/2.
const E = Math.sqrt(3) / 2;
const PROLATE_1_1_2 = 2 * PI * (1 + (2 * Math.asin(E)) / E);
const REL = 1e-5;
const close = (actual: number, expected: number) =>
  expect(Math.abs(actual - expected) / expected).toBeLessThan(REL);

describe('surface area of non-uniformly scaled curved solids', () => {
  it.each([
    // Old fixed-order values: 22.26672 (5.3e-4), 25.17324 (1.6e-3), 21.56179 (3.9e-3).
    ['cylinder stretched across its axis', 'return cylinder(1, 1).scale([2, 1, 1]);', ELLIPSE_2_1_PERIMETER + 4 * PI],
    ['cylinder stretched along its axis', 'return cylinder(1, 1).scale([1, 1, 3]);', 6 * PI + 2 * PI],
    ['prolate spheroid from a sphere', 'return sphere(1).scale([1, 1, 2]);', PROLATE_1_1_2],
    ['moved, then stretched cylinder', 'return cylinder(1, 1).translate(5, 0, 0).scale([2, 1, 1]);', ELLIPSE_2_1_PERIMETER + 4 * PI],
  ])('%s', async (_name, code, expected) => {
    close((await lower(code)).surfaceArea(), expected);
  });

  it('analytic solids keep their exact area', async () => {
    expect((await lower('return cylinder(1, 1);')).surfaceArea()).toBeCloseTo(4 * PI, 12);
    expect((await lower('return torus(10, 2);')).surfaceArea()).toBeCloseTo(4 * PI * PI * 20, 9);
    expect((await lower('return box(1, 1, 1).scale([2, 3, 4]);')).surfaceArea()).toBeCloseTo(52, 12);
  });
});
