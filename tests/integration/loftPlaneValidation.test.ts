// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `Sketch.loft({ planes })` needs a plane name and a 3D origin on every entry.
// A missing plane used to pass capture: the loft then failed in the lowerer as
// feature.empty-result ("the create degenerated"), which named no cause. A
// missing origin threw a raw TypeError. Valid entries build unchanged.

import { describe, it, expect, beforeAll } from 'vitest';
import { getOC, measureVolume } from 'replicad';
import { initOcct, type OcctBackend } from '../../src/kernel/backends/occt/occtBackend';
import { isValidShape } from '../../src/kernel/backends/occt/booleanRecovery';
import { runScript } from '../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../src/modeling/backends/occt/occtLowerer';
import type { CompilerDiagnostic } from '../../src/shared/diagnostics/diagnostic';
import { KernelError } from '../../src/shared/intent/kernelError';

type Failure = Pick<CompilerDiagnostic, 'code' | 'message'>;

async function lower(code: string): Promise<{ solid?: OcctBackend; errors: Failure[] }> {
  let run: Awaited<ReturnType<typeof runScript>>;
  try {
    run = await runScript({ code, fileName: 'test.kcad.ts' });
  } catch (e) {
    // Capture refusals throw; anything else (a raw TypeError) has no code.
    return { errors: [{ code: e instanceof KernelError ? e.code : 'uncaught', message: (e as Error).message }] };
  }
  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const r = await engine.run(run.records, { paramTable: run.paramTable });
  const errors = (r.diagnostics as CompilerDiagnostic[]).filter((d) => d.severity === 'error');
  const solid = r.shapes.get(run.records[run.records.length - 1].id) as OcctBackend | undefined;
  return { solid, errors };
}

beforeAll(async () => {
  await initOcct();
}, 120_000);

// Frustum: r1 = 10 mm at z = 0, r2 = 5 mm at z = H.
const R1 = 10;
const R2 = 5;
const H = 10;
const FRUSTUM = (Math.PI * H * (R1 * R1 + R1 * R2 + R2 * R2)) / 3;
const loftWith = (planes: string) =>
  `return path().circle(0, 0, ${R1}).loft(path().circle(0, 0, ${R2}), { planes: ${planes} });`;

describe('Sketch.loft planes[] entries', () => {
  it('a missing plane name is feature.invalid-args, not an empty result', async () => {
    const { solid, errors } = await lower(loftWith(`[{ origin: [0, 0, 0] }, { origin: [0, 0, ${H}] }]`));
    expect(solid).toBeUndefined();
    expect(errors.map((e) => e.code)).toEqual(['feature.invalid-args']);
    expect(errors[0]!.message).toContain("opts.planes[0].plane — got undefined; requires 'XY' | 'YZ' | 'XZ'");
  });

  it('a missing origin is feature.invalid-args, not a raw TypeError', async () => {
    const { errors } = await lower(loftWith(`[{ plane: 'XY', origin: [0, 0, 0] }, { plane: 'XY' }]`));
    expect(errors.map((e) => e.code)).toEqual(['feature.invalid-args']);
    expect(errors[0]!.message).toContain('opts.planes[1].origin — got undefined; requires an [x, y, z]');
  });

  it('valid entries build the exact frustum as a valid solid', async () => {
    const { solid, errors } = await lower(
      loftWith(`[{ plane: 'XY', origin: [0, 0, 0] }, { plane: 'XY', origin: [0, 0, ${H}] }]`),
    );
    expect(errors).toEqual([]);
    const shape = solid!.getReplicadShape();
    expect(isValidShape(getOC(), shape.wrapped)).toBe(true);
    expect(measureVolume(shape as never)).toBeCloseTo(FRUSTUM, 6);
  });
});
