// tests/unit/assemblies/solvedAssemblyDiagnostics.test.ts
//
// Diagnostic codes for `Assembly.solvedModel(poses)`. The spec defines four
// hint codes split between capture-time (KernelError throws) and recompute-
// time (lowerer pushes structured diagnostics):
//
//   capture-time (throw KernelError):
//     - invalid-args.solvedModel.unknown-joint
//     - invalid-args.solvedModel.pose-shape
//
//   recompute-time (diagnostics.push):
//     - invalid-args.solvedModel.missing-pose
//     - kernel-failed.solvedModel.bad-pose
//
// See spec: ~/projects/kernelCAD-private/docs/specs/2026-05-10-paramref-poses-on-solvedmodel-design.md

import { describe, it, expect, beforeAll } from 'vitest';
import { CaptureSession } from '../../../src/capture/captureSession';
import { createApi } from '../../../src/modules/api';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildModel } from '../../../src/kernel/buildModel';
import { KernelError, isKernelError } from '../../../src/intent/kernelError';

/** Run `fn` and assert it throws a KernelError whose `hint` matches `re`.
 *  toThrow(re) only matches against `error.message`; for our spec'd hint
 *  codes (which live in `KernelError.hint`) we need a richer assertion. */
function expectKernelHint(fn: () => unknown, re: RegExp): void {
  let thrown: unknown = undefined;
  try { fn(); } catch (e) { thrown = e; }
  expect(thrown).toBeDefined();
  expect(isKernelError(thrown)).toBe(true);
  const err = thrown as KernelError;
  expect(err.hint ?? '').toMatch(re);
}

describe('solvedAssembly capture-time diagnostics', () => {
  const setup = () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('test');
    const base = arm.part('base', kcad.box(10, 10, 10));
    const upper = arm.part('upper', kcad.box(10, 10, 10));
    const tip = arm.part('tip', kcad.box(10, 10, 10));
    arm.revolute('yaw', base, upper, { axis: [0, 0, 1], origin: [0, 0, 0] });
    arm.ball('wrist', upper, tip, { origin: [0, 0, 10] });
    return { session, kcad, arm };
  };

  it('unknown-joint: pose name not in declared joints', () => {
    const { arm } = setup();
    expectKernelHint(
      () =>
        arm.solvedModel({
          yaw: 30,
          wrist: [0, 0, 0],
          doesnotexist: 30,
        } as Parameters<typeof arm.solvedModel>[0]),
      /invalid-args\.solvedModel\.unknown-joint/,
    );
  });

  it('pose-shape: scalar passed to ball joint', () => {
    const { arm } = setup();
    expectKernelHint(
      () =>
        arm.solvedModel({
          yaw: 30,
          wrist: 30 as unknown as [number, number, number],
        }),
      /invalid-args\.solvedModel\.pose-shape/,
    );
  });

  it('pose-shape: ball pose passed to scalar joint', () => {
    const { arm } = setup();
    expectKernelHint(
      () =>
        arm.solvedModel({
          yaw: [10, 20, 30] as unknown as number,
          wrist: [0, 0, 0],
        }),
      /invalid-args\.solvedModel\.pose-shape/,
    );
  });

  it('capture allows missing-pose (validated at recompute time)', () => {
    const { arm } = setup();
    // Missing yaw and wrist — capture-time should NOT throw; recompute-time will.
    expect(() => arm.solvedModel({})).not.toThrow();
  });
});

describe('solvedAssembly recompute-time diagnostics', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('missing-pose: emits feature.invalid-args at recompute', async () => {
    const model = await buildModel({
      fileName: 'missing-pose.kcad.ts',
      code: `
        const arm = assembly('test');
        const base  = arm.part('base',  box(10, 10, 10));
        const upper = arm.part('upper', box(10, 10, 10));
        arm.revolute('yaw', base, upper, { axis: [0, 0, 1], origin: [0, 0, 0] });
        return arm.solvedModel({});
      `,
    });
    const errs = model.diagnostics.filter(d => d.severity === 'error');
    const missing = errs.find(d => /missing-pose/.test(d.hint));
    expect(missing).toBeDefined();
    expect(missing?.code).toBe('feature.invalid-args');
  });

  it('bad-pose: non-finite ParamRef value emits feature.kernel-failed', async () => {
    // Drive the pose param to NaN via updateModelParams. The capture-time
    // validation accepts a finite ParamRef; the lowerer must catch the
    // non-finite value at recompute time and emit kernel-failed.solvedModel.bad-pose.
    //
    // updateModelParams throws when the tail shape is missing — which is
    // exactly what happens when our diagnostic short-circuits. We harvest
    // the diagnostics off the engine's run by re-running it directly.
    const model = await buildModel({
      fileName: 'bad-pose.kcad.ts',
      code: `
        const yawDeg = param('yawDeg', 0, { min: -180, max: 180 });
        const arm = assembly('test');
        const base  = arm.part('base',  box(10, 10, 10));
        const upper = arm.part('upper', box(10, 10, 10));
        arm.revolute('yaw', base, upper, { axis: [0, 0, 1], origin: [0, 0, 0] });
        return arm.solvedModel({ yaw: yawDeg });
      `,
    });
    expect(model.diagnostics.filter(d => d.severity === 'error')).toEqual([]);

    model.session.paramTable.set('yawDeg', Number.NaN);
    const { RecomputeEngine } = await import('../../../src/compute/recomputeEngine');
    const { OcctLowerer } = await import('../../../src/kernel/backends/occt/occtLowerer');
    const engine = new RecomputeEngine(new OcctLowerer());
    const result = await engine.run(model.records, {
      paramTable: model.session.paramTable,
      gatedFeatureNames: model.session.gatedFeatureNames,
    });
    const errs = result.diagnostics.filter(d => d.severity === 'error');
    const bad = errs.find(d => /bad-pose/.test(d.hint));
    expect(bad).toBeDefined();
    expect(bad?.code).toBe('feature.kernel-failed');
  });
});
