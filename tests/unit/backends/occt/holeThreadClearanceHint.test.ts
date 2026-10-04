// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A thread clearance above the pitch/8 cap is usually a print-tolerance
// request ("0.3 mm for FDM"). The error must say why the cap exists and give
// the numbers that DO work: keep clearance at the cap and grow the whole
// internal thread through the nominal diameter (a radial shift δ opens each
// 60° flank by δ/2, so the missing play `e` needs +4e on the diameter).

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, type OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import { KernelError } from '../../../../src/shared/intent/kernelError';
import { isoMinorRadius } from '../../../../src/kernel/backends/occt/isoThread';

async function captureError(code: string): Promise<KernelError> {
  try {
    await runScript({ code, fileName: 'tap.kcad.ts' });
  } catch (e) {
    if (e instanceof KernelError) return e;
    throw e;
  }
  throw new Error('expected the script to throw');
}

describe('thread clearance cap hint', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('names the cap for the pitch and the diameter that gives the requested FDM play', async () => {
    const e = await captureError(
      `return box(20, 20, 10).hole('top', { u: 0, v: 0, diameter: 6, depth: 'through', thread: { pitch: 1, clearance: 0.3 } });`,
    );
    expect(e.message).toMatch(/opts\.thread\.clearance — got 0\.3; requires a number in \[0, thread\.pitch \/ 8\] — thread\.pitch is 1 mm, so the cap is 0\.125 \(mm\)/);
    const hint = e.hint ?? '';
    expect(hint).toMatch(/past pitch\/8 = 0\.125 mm neighbouring groove turns would merge/);
    expect(hint).toMatch(/keep clearance: 0\.125/);
    expect(hint).toMatch(/add 0\.7 mm to the nominal diameter \(diameter: 6\.7\)/);
    expect(hint).toMatch(/0\.125 \+ 0\.175 = 0\.3 mm/);
  });

  it('the suggested fix builds: M6 nut at diameter 6.7 with the capped clearance', async () => {
    const run = await runScript({
      code: `return box(20, 20, 10).hole('top', { u: 0, v: 0, diameter: 6.7, depth: 'through', thread: { pitch: 1, clearance: 0.125 } });`,
      fileName: 'tap.kcad.ts',
    });
    const r = await new RecomputeEngine(createOcctLowerer(run.session)).run(run.records, { paramTable: run.paramTable });
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const shape = r.shapes.get(run.records[run.records.length - 1]!.id) as OcctBackend;
    // Cosmetic thread: the bore is the ISO minor diameter of the grown nominal
    // size plus the clearance — 0.35 mm wider in radius than an ISO M6 bore.
    const rBore = isoMinorRadius(6.7, 1) + 0.125;
    expect(rBore - (isoMinorRadius(6, 1) + 0.125)).toBeCloseTo(0.35, 6);
    expect(20 * 20 * 10 - shape.volume()).toBeCloseTo(Math.PI * rBore * rBore * 10, 0);
  });
});
