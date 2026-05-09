// tests/integration/lowering/solvedAssemblyReactive.test.ts
//
// Lowering integration for the `solvedAssembly` FeatureKind. The lowerer
// reconstructs AssemblyPartStored / AssemblyJointStored from FeatureRecords,
// resolves the encoded poses to numeric values via Param.evaluated (the
// recompute pipeline updates these before lowering), runs forwardKinematics,
// applies the per-part SE(3) transform to the pre-lowered part Shape, and
// unions the posed parts. Studio-driven param edits re-pose the rendered
// scene reactively without re-running the script.

import { describe, it, expect, beforeAll } from 'vitest';
import { initOcct, OcctBackend } from '../../../src/backends/occt/occtBackend';
import { runScript } from '../../../src/script-runtime/runScript';
import { RecomputeEngine } from '../../../src/compute/recomputeEngine';
import { OcctLowerer } from '../../../src/backends/occt/occtLowerer';
import type { CompilerDiagnostic } from '../../../src/diagnostics/diagnostic';

interface LowerResult {
  shape: OcctBackend | undefined;
  diagnostics: CompilerDiagnostic[];
}

async function lowerScript(code: string): Promise<LowerResult> {
  const { records } = await runScript({ code, fileName: 'test.kcad.ts' });
  const engine = new RecomputeEngine(new OcctLowerer());
  const r = await engine.run(records);
  const last = records[records.length - 1];
  return {
    shape: r.shapes.get(last.id) as OcctBackend | undefined,
    diagnostics: r.diagnostics,
  };
}

describe('solvedAssembly lowering', () => {
  beforeAll(async () => { await initOcct(); });

  it('produces posed bbox for literal poses (regression)', async () => {
    const { shape, diagnostics } = await lowerScript(`
      const arm = assembly('test');
      const base  = arm.part('base',  box(10, 10, 10));
      const upper = arm.part('upper', box(10, 10, 30));
      arm.revolute('yaw', base, upper, { axis: [0, 0, 1], origin: [0, 0, 10] });
      return arm.solvedModel({ yaw: 0 });
    `);
    expect(diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(shape).toBeDefined();
    const bb = shape!.boundingBox();
    // base (10×10×10, centered) + upper (10×10×30, centered) translated by
    // joint origin [0,0,10]. Upper's center sits at z=10, so it spans
    // z in [10 - 15, 10 + 15] = [-5, 25]. Base spans z in [-5, 5].
    // Top reaches z ~= 25.
    expect(bb.max[2]).toBeGreaterThan(20);
  });

  it('rotates the upper arm 90 degrees about Z (yaw)', async () => {
    // yaw=90° around Z: an upper arm shifted along +X by its own connector
    // ends up shifted along +Y after the rotation. Use a non-symmetric upper
    // box (offset via .translate) so a yaw rotation is observable in the bbox.
    const { shape, diagnostics } = await lowerScript(`
      const arm = assembly('test');
      const base  = arm.part('base',  box(10, 10, 10));
      // Upper arm extends 30mm along +X (so yaw=90° rotates it onto +Y).
      const upper = arm.part('upper', box(30, 10, 10).translate(15, 0, 0));
      arm.revolute('yaw', base, upper, { axis: [0, 0, 1], origin: [0, 0, 0] });
      return arm.solvedModel({ yaw: 90 });
    `);
    expect(diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(shape).toBeDefined();
    const bb = shape!.boundingBox();
    // After yaw=90, upper extends onto +Y. Top of upper bbox in Y is ~30.
    expect(bb.max[1]).toBeGreaterThan(25);
    // Upper no longer extends far along X — only the base remains there.
    expect(bb.max[0]).toBeLessThan(15);
  });
});
