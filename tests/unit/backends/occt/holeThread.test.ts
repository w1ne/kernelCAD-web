// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `hole({ thread })` / `holes({ thread })`: an internal ISO metric thread.
// Required-suite checks, kept short: one thin M3 modeled thread must be a valid
// solid whose removed volume equals the bore at the ISO minor diameter plus the
// helical groove (screw-sweep Pappus); cosmetic threads drill only the minor
// diameter and record the thread; author mistakes fail at capture with the
// valid range named. Larger modeled threads (M8, blind, holes()) and the
// bolt-in-nut fit run in tests/integration/modeling/modeledThreadProofs.test.ts.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, type OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import { callMcpTool } from '../../../../src/agent/mcp/toolRegistry';
import { isoMinorRadius } from '../../../../src/kernel/backends/occt/isoThread';
import { brepValid, tappedRemoval } from '../../../threadGeometryHelpers';

async function lower(code: string) {
  const run = await runScript({ code, fileName: 'tap.kcad.ts' });
  const r = await new RecomputeEngine(createOcctLowerer(run.session)).run(run.records, { paramTable: run.paramTable });
  return { run, result: r, shape: r.shapes.get(run.records[run.records.length - 1].id) as OcctBackend | undefined };
}

describe('hole({ thread }) — internal ISO metric thread', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('M3 modeled through thread: valid solid, analytic removed volume', async () => {
    const [D, P, c, h, side] = [3, 0.5, 0.05, 0.5, 9];
    const code = `return box(${side}, ${side}, ${h}, true).hole('top', { u: 0, v: 0, diameter: ${D}, depth: 'through', thread: { pitch: ${P}, modeled: true, clearance: ${c} } });`;
    const { result, shape } = await lower(code);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
    expect(brepValid(shape!)).toBe(true);
    const expected = tappedRemoval(D, P, c, h);
    expect(Math.abs(side * side * h - shape!.volume() - expected) / expected).toBeLessThan(1e-4);
  });

  it('cosmetic thread drills the ISO minor diameter and records the thread', async () => {
    const code = `return box(20, 20, 5, true).hole('top', { u: 0, v: 0, diameter: 6, depth: 'through', thread: { pitch: 1 } });`;
    const { run, shape } = await lower(code);
    const rMinor = isoMinorRadius(6, 1);
    expect(rMinor * 2).toBeCloseTo(6 - 1.0825318, 6);
    expect(shape!.volume()).toBeCloseTo(20 * 20 * 5 - Math.PI * rMinor * rMinor * 5, 4);
    const hole = run.records.find((r) => r.kind === 'hole')!;
    expect(hole.params.threadPitch.evaluated).toBe(1);
    expect(hole.params.threadModeled.evaluated).toBe(0);
    expect(hole.params.threadClearance.evaluated).toBe(0);
    expect(hole.params.diameter.evaluated).toBe(6);
    // The same through the public dispatcher.
    const out = (await callMcpTool('inspect', { of: 'shape', code })) as { ok: boolean; shape: { volume: number } };
    expect(out.shape.volume).toBeCloseTo(20 * 20 * 5 - Math.PI * rMinor * rMinor * 5, 4);
  });

  it('threads every position of holes() cosmetically', async () => {
    const code = `return box(40, 20, 3, true).holes('top', { positions: [{ u: -10, v: 0 }, { u: 10, v: 0 }], diameter: 4, depth: 'through', thread: { pitch: 0.7 } });`;
    const { result, shape } = await lower(code);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
    const rMinor = isoMinorRadius(4, 0.7);
    expect(shape!.volume()).toBeCloseTo(40 * 20 * 3 - 2 * Math.PI * rMinor * rMinor * 3, 4);
  });

  it('keeps a ParamRef clearance live at lower time', async () => {
    const code = `
      const c = param('c', 0);
      return box(12, 12, 2.4, true).hole('top', { u: 0, v: 0, diameter: 4, depth: 'through', thread: { pitch: 0.7, clearance: c } });
    `;
    const run = await runScript({ code, fileName: 'c.kcad.ts' });
    for (const clearance of [0, 0.08]) {
      run.paramTable.set('c', clearance);
      const r = await new RecomputeEngine(createOcctLowerer(run.session)).run(run.records, { paramTable: run.paramTable });
      const rBore = isoMinorRadius(4, 0.7) + clearance;
      expect(r.shapes.get(run.records[run.records.length - 1].id)!.volume()).toBeCloseTo(12 * 12 * 2.4 - Math.PI * rBore * rBore * 2.4, 4);
    }
  });

  it.each([
    [`thread: { pitch: 2 }`, 'diameter: 6', /thread.pitch \(2\) must be > 0 and ≤ diameter \/ 4/],
    [`thread: { pitch: 1, clearance: 0.2 }`, 'diameter: 6', /thread.clearance \(0.2\) must be in \[0, pitch\/8\]/],
    [`thread: { pitch: 1, modeled: true }`, 'diameter: 6, depth: 1.5', /modeled thread needs depth ≥ 2 × pitch/],
  ])('rejects %s at capture', async (thread, dims, message) => {
    const depth = dims.includes('depth') ? '' : ", depth: 'through'";
    await expect(
      runScript({ code: `return box(20, 20, 10).hole('top', { u: 0, v: 0, ${dims}${depth}, ${thread} });`, fileName: 'bad.kcad.ts' }),
    ).rejects.toThrow(message);
  });
});
