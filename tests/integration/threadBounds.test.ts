// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The helical faces of `threadedRod` are rational B-splines with weights
// near 1, so the exact-box gate for strongly rational faces skips them. The
// default `Bnd_Box` then follows their pole hull: an M6 rod read 6.70 x 7.32
// mm across instead of 6 x 6 mm. B-spline faces are now refined to 1e-3 mm,
// and the result must still contain OCCT's exact box. Extruded spline faces
// had the same fault: a straight spline prism read 52.2 mm wide, not 29.6.

import { describe, it, expect, beforeAll } from 'vitest';
import { getOC } from 'replicad';
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

/** OCCT's exact, tolerance-inclusive box (about 1 s on a thread). */
function exactBox(shape: OcctBackend): number[] {
  const oc = getOC() as any;
  const box = new oc.Bnd_Box_1();
  try {
    oc.BRepBndLib.AddOptimal((shape as any).shape.wrapped, box, false, true);
    const lo = box.CornerMin();
    const hi = box.CornerMax();
    return [lo.X(), lo.Y(), lo.Z(), hi.X(), hi.Y(), hi.Z()];
  } finally {
    box.delete();
  }
}

beforeAll(async () => {
  await initOcct();
}, 120_000);

const REFINE = 1e-3 + 1e-6; // refinement tolerance plus shape tolerances

// The default box removes the shape-tolerance gap (1e-7 mm) on flat ends.
const GAP = 1e-6;

function expectTightOuter(shape: OcctBackend) {
  const { min, max } = shape.boundingBox();
  const exact = exactBox(shape);
  for (let a = 0; a < 3; a++) {
    expect(min[a]).toBeLessThanOrEqual(exact[a] + GAP);
    expect(min[a]).toBeGreaterThan(exact[a] - REFINE);
    expect(max[a]).toBeGreaterThanOrEqual(exact[a + 3] - GAP);
    expect(max[a]).toBeLessThan(exact[a + 3] + REFINE);
  }
}

describe('bounding box of threaded rods', () => {
  it.each([
    ['M6 x 20', "return threadedRod({ spec: 'M6', length: 20 });", 6, 20],
    ['M3 x 10', "return threadedRod({ spec: 'M3', length: 10 });", 3, 10],
  ])('%s reads its major diameter, not the pole hull', async (_name, code, d, length) => {
    const shape = await lower(code);
    const { min, max } = shape.boundingBox();
    for (const a of [0, 1]) {
      expect(max[a] - min[a]).toBeGreaterThanOrEqual(d - 1e-6);
      expect(max[a] - min[a]).toBeLessThan(d + 2 * REFINE);
    }
    expect(max[2] - min[2]).toBeCloseTo(length, 6);
    expectTightOuter(shape);
  }, 60_000);

  it('a rotated, moved rod still contains the exact box', async () => {
    expectTightOuter(await lower("return threadedRod({ spec: 'M6', length: 20 }).rotate([1, 1, 0], 30).translate(5, 7, -3);"));
  }, 60_000);

  it('evaluate_script scene summary reports the major diameter', async () => {
    clearActiveMcpSession();
    const out = await evaluateScriptTool({ code: "return threadedRod({ spec: 'M6', length: 20 });" });
    expect(out.ok).toBe(true);
    const size = out.sceneSummary.size!;
    expect(size[0]).toBeLessThan(6 + 2 * REFINE);
    expect(size[1]).toBeLessThan(6 + 2 * REFINE);
    expect(size[0]).toBeGreaterThanOrEqual(6 - 1e-6);
  }, 120_000);

  it('analytic solids keep their gap-corrected box', async () => {
    const { min, max } = (await lower('return box(40, 30, 10).fillet(2);')).boundingBox();
    expect([0, 1, 2].map((a) => max[a] - min[a])).toEqual([40, 30, 10]);
  });
});

describe('bounding box of extruded splines', () => {
  const prism = 'return path().moveTo(0, -5).spline([[0, -5], [30, -5], [30, 5], [0, 5]]).close().extrude(60);';

  it('a straight spline prism reads its outline, not the pole hull', async () => {
    const shape = await lower(prism);
    const { min, max } = shape.boundingBox();
    // Exact extremes of the cubic through the four points: x 30.625, y +/-14.789.
    expect(max[0]).toBeCloseTo(30.625, 3);
    expect(max[1] - min[1]).toBeCloseTo(29.578, 2);
    expect(max[2] - min[2]).toBeCloseTo(60, 6);
    expectTightOuter(shape);
  }, 60_000);

  it('a rotated, moved prism still contains the exact box', async () => {
    expectTightOuter(await lower(prism.replace(/;$/, '.rotate([1, 0, 1], 25).translate(-4, 9, 2);')));
  }, 60_000);
});
