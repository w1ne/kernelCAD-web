// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Oversized fillets: OCCT's MakeFillet can report IsDone() and hand back a
// broken body (more volume than the box it rounded, a topologically invalid
// solid that STEP export rejects) or the body unchanged (the blend silently
// dropped). Every constant fillet/chamfer result is now validated; an invalid
// or no-op result is a `feature.kernel-failed` error carrying the probed
// maxFeasibleRadius, never `ok` geometry.
//
// Separately, edge length vs 2 × radius is not a feasibility test: rounding a
// 5 mm plate's vertical corners with r = 4 is valid and must build.

import { describe, it, expect, beforeAll } from 'vitest';
import { getOC } from 'replicad';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildModel } from '../../../src/modeling/buildModel';
import { edgeFeatureResultProblem, isTopologicallyValid } from '../../../src/kernel/backends/occt/edgeFeatureValidity';
import { volumeOf } from '../../../src/kernel/backends/occt/booleanRecovery';

async function build(code: string) {
  return buildModel({ fileName: 'edge-validity.kcad.ts', code });
}

function failure(m: Awaited<ReturnType<typeof build>>) {
  const d = m.diagnostics.find((x) => x.code === 'feature.kernel-failed');
  expect(d, JSON.stringify(m.diagnostics)).toBeDefined();
  expect(d!.severity).toBe('error');
  return d!;
}

describe('fillet / chamfer result validation', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('box(20,20,10).fillet(6): the invalid, volume-growing result is an error with maxFeasibleRadius', async () => {
    const m = await build('return box(20, 20, 10).fillet(6);');
    const d = failure(m);
    expect(d.message).toMatch(/validity|volume/);
    const max = d.details?.maxFeasibleRadius as number;
    expect(max).toBeGreaterThan(4.9);
    expect(max).toBeLessThan(5);
    expect(d.hint).toContain(`${max} mm`);
    expect(m.tailShape).toBeUndefined();
  }, 120_000);

  it("box(40,40,10).fillet(12, { face: 'top' }) no longer returns the box unchanged with no diagnostic", async () => {
    const m = await build("return box(40, 40, 10).fillet(12, { face: 'top' });");
    const d = failure(m);
    expect(d.details?.maxFeasibleRadius).toBeGreaterThan(9);
    expect(d.details?.maxFeasibleRadius).toBeLessThan(10);
    expect(m.tailShape).toBeUndefined();
  }, 120_000);

  it('R6 top + R6 bottom on a 10 mm plate fails on the second fillet instead of a silent no-op', async () => {
    const m = await build("return box(40, 40, 10).fillet(6, { face: 'top' }).fillet(6, { face: 'bottom' });");
    const d = failure(m);
    expect(d.details?.maxFeasibleRadius).toBeLessThan(6);
    expect(m.tailShape).toBeUndefined();
  }, 120_000);

  it('a feasible face fillet still builds and is valid', async () => {
    const m = await build("return box(40, 40, 10).fillet(4, { face: 'top' });");
    expect(m.diagnostics.filter((x) => x.severity === 'error')).toEqual([]);
    const w = (m.tailShape as unknown as { getReplicadShape(): { wrapped: unknown } }).getReplicadShape().wrapped;
    expect(isTopologicallyValid(w)).toBe(true);
    const v = volumeOf(getOC(), w);
    expect(v).toBeLessThan(16000);
    expect(v).toBeGreaterThan(15000);
  }, 120_000);

  it("box(60,40,5).fillet(4, { parallel: [0, 0, 1] }) rounds the plate corners (r > thickness is fine)", async () => {
    const m = await build("return box(60, 40, 5).fillet(4, { parallel: [0, 0, 1] });");
    expect(m.diagnostics.filter((x) => x.severity !== 'info'), JSON.stringify(m.diagnostics)).toEqual([]);
    const expected = 60 * 40 * 5 - 4 * 16 * (1 - Math.PI / 4) * 5;
    expect(m.tailShape!.volume()).toBeCloseTo(expected, 0);
  }, 120_000);

  it('an oversized chamfer is reported, a feasible one builds', async () => {
    const bad = await build('return box(20, 20, 10).chamfer(6);');
    expect(failure(bad).details?.maxFeasibleDistance).toBeLessThan(6);
    const ok = await build("return box(60, 40, 5).chamfer(4, { parallel: [0, 0, 1] });");
    expect(ok.diagnostics.filter((x) => x.severity === 'error')).toEqual([]);
    expect(ok.tailShape!.volume()).toBeCloseTo(60 * 40 * 5 - 4 * 8 * 5, 0);
  }, 120_000);

  it('a result identical to the input is still reported as unchanged, on any body size', async () => {
    for (const code of ['return box(40, 40, 10);', 'return box(500, 400, 200);']) {
      const m = await build(code);
      const w = (m.tailShape as unknown as { getReplicadShape(): { wrapped: unknown } }).getReplicadShape().wrapped;
      expect(edgeFeatureResultProblem(w, w, 'decrease')).toMatch(/unchanged/);
    }
  }, 60_000);
});
