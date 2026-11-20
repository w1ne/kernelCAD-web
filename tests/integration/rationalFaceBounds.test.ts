// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A non-uniform scale turns analytic faces into rational B-spline faces. The
// default `Bnd_Box` follows their weighted control hull, so
// `cylinder(1, 1).scale([2, 1, 1])` reported a 6 x 3.46 x 1 mm box and scene
// summary size instead of 4 x 2 x 1 mm. Those shapes now get OCCT's exact,
// tolerance-inclusive box.

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

// Shape tolerances (1e-7 mm) may widen the box; the control hull adds 0.5 mm or more.
const TOL = 1e-5;
function expectSize(size: readonly number[], expected: readonly number[]) {
  expected.forEach((e, i) => {
    expect(size[i]).toBeGreaterThanOrEqual(e - 1e-9);
    expect(size[i]).toBeLessThan(e + TOL);
  });
}
const sizeOf = (b: { min: readonly number[]; max: readonly number[] }) =>
  [0, 1, 2].map((i) => b.max[i] - b.min[i]);

describe('bounding box of non-uniformly scaled curved solids', () => {
  it.each([
    ['elliptic cylinder', 'return cylinder(1, 1).scale([2, 1, 1]);', [4, 2, 1]],
    ['ellipsoid', 'return sphere(1).scale([2, 1, 1]);', [4, 2, 2]],
    ['torus stretched along its axis', 'return torus(10, 2).scale([1, 1, 2]);', [24, 24, 8]],
  ])('%s', async (_name, code, expected) => {
    expectSize(sizeOf((await lower(code)).boundingBox()), expected);
  });

  it('keeps the exact box at its translated position', async () => {
    const base = (await lower('return cylinder(1, 1).scale([2, 1, 1]);')).boundingBox();
    const moved = (await lower('return cylinder(1, 1).scale([2, 1, 1]).translate(10, -5, 3);')).boundingBox();
    [10, -5, 3].forEach((d, i) => {
      expect(moved.min[i]).toBeCloseTo(base.min[i] + d, 6);
      expect(moved.max[i]).toBeCloseTo(base.max[i] + d, 6);
    });
  });

  it('evaluate_script scene summary reports the true size', async () => {
    clearActiveMcpSession();
    const out = await evaluateScriptTool({ code: 'return cylinder(1, 1).scale([2, 1, 1]);' });
    expect(out.ok).toBe(true);
    expectSize(out.sceneSummary.size!, [4, 2, 1]);
  });

  it('analytic solids keep their gap-corrected box', async () => {
    expect(sizeOf((await lower('return cylinder(1, 1);')).boundingBox())).toEqual([2, 2, 1]);
    expect(sizeOf((await lower('return box(40, 30, 10);')).boundingBox())).toEqual([40, 30, 10]);
  });
});
