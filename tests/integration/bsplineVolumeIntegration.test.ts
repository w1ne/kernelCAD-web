// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A non-uniform scale turns analytic faces into rational B-spline faces.
// The fixed-order OCCT volume integration read `cylinder(1, 1).scale([2, 1, 1])`
// as 6.3373 mm³ (2π = 6.2832, 0.86 % high) and `sphere(1).scale([2, 1, 1])`
// as 8.3739 mm³ (8π/3 = 8.3776). Reported volume, step evidence and mass
// properties now use adaptive integration.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, type OcctBackend } from '../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../src/modeling/backends/occt/occtLowerer';
import { evaluateScriptTool } from '../../src/agent/mcp/tools/evaluateScript';
import { clearActiveMcpSession } from '../../src/agent/mcp/activeSession';

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
// Relative tolerance well below the 0.86 % and 0.044 % fixed-order errors.
const REL = 1e-8;
const close = (actual: number, expected: number) =>
  expect(Math.abs(actual - expected) / expected).toBeLessThan(REL);

describe('volume of non-uniformly scaled curved solids', () => {
  it.each([
    ['cylinder stretched across its axis', 'return cylinder(1, 1).scale([2, 1, 1]);', 2 * PI],
    ['cylinder stretched along its axis', 'return cylinder(1, 1).scale([1, 1, 3]);', 3 * PI],
    ['large elliptic cylinder', 'return cylinder(10, 20).scale([2, 1, 1]);', 2 * PI * 400 * 10],
    ['ellipsoid from a sphere', 'return sphere(1).scale([2, 1, 1]);', (8 / 3) * PI],
    ['torus stretched along its axis', 'return torus(10, 2).scale([1, 1, 2]);', 2 * PI * PI * 10 * 4 * 2],
  ])('%s', async (_name, code, expected) => {
    const shape = await lower(code);
    close(shape.volume(), expected);
    // Mass properties at 1000 kg/m³: 1 mm³ = 1e-6 kg.
    close(shape.massProperties(1000).mass, expected * 1e-6);
  });

  it('evaluate_script step evidence and scene summary report the closed-form volume', async () => {
    clearActiveMcpSession();
    const out = await evaluateScriptTool({ code: 'return cylinder(1, 1).scale([2, 1, 1]);' });
    expect(out.ok).toBe(true);
    close(out.step!.validity.volume!, 2 * PI);
    close(out.sceneSummary.volume!, 2 * PI);
  });

  it('analytic solids keep their exact volume', async () => {
    close((await lower('return cylinder(10, 5);')).volume(), PI * 25 * 10);
    // Rounded box: inner box (8, 18, 28) grown by a 1 mm sphere.
    const [a, b, c] = [8, 18, 28];
    const rounded = a * b * c + 2 * (a * b + b * c + a * c) + PI * (a + b + c) + (4 / 3) * PI;
    close((await lower('return box(10, 20, 30).fillet(1);')).volume(), rounded);
  });
});
