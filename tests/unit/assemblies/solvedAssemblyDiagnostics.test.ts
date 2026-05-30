// tests/unit/assemblies/solvedAssemblyDiagnostics.test.ts
//
// Capture-time diagnostic codes for `Assembly.solvedModel(poses)`. The spec
// defines two hint codes that fire as `KernelError` throws at capture time:
//
//   - invalid-args.solvedModel.unknown-joint
//   - invalid-args.solvedModel.pose-shape
//
// See spec: ~/projects/kernelCAD-private/docs/specs/2026-05-10-paramref-poses-on-solvedmodel-design.md
//
// G0 (2026-05-31, mechanism-delivery): rewritten to use the v0.6 mate API
// (arm.connector + arm.mate) — the legacy v0.5 `arm.revolute(...)` /
// `arm.fixed(...)` methods were removed. The pose-name/shape diagnostics
// still apply: both joint names AND mate names are walked in the unknown-
// pose check, and capture-time pose-shape validation runs identically for
// scalar vs ball mates.
//
// The recompute-time `missing-pose` / `bad-pose` diagnostics still live in
// the OCCT lowerer (`src/modeling/backends/occt/occtLowerer.ts`), but they
// only fire over v0.5 joints (the `joints` array in the solvedAssembly
// record). With the public revolute/fixed API removed, those diagnostics
// are unreachable from script callers; their unit coverage will move to
// future kinematic-grounding slices when the recompute-time mate-pose path
// grows its own pose-validation gate.

import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';
import { KernelError, isKernelError } from '../../../src/shared/intent/kernelError';

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
    base.connector('yawAxis', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 0] },
      axis: [0, 0, 1],
    });
    upper.connector('yawAxis', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 0] },
      axis: [0, 0, 1],
    });
    arm.mate('yaw', 'base.yawAxis', 'upper.yawAxis', 'revolute');
    upper.connector('wristBall', {
      type: 'ball',
      origin: { kind: 'vec3', value: [0, 0, 10] },
    });
    tip.connector('wristBall', {
      type: 'ball',
      origin: { kind: 'vec3', value: [0, 0, 0] },
    });
    arm.mate('wrist', 'upper.wristBall', 'tip.wristBall', 'ball');
    return { session, kcad, arm };
  };

  it('unknown-joint: pose name not in declared joints/mates', () => {
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

  it('pose-shape: scalar passed to ball mate', () => {
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

  it('pose-shape: ball pose passed to scalar mate', () => {
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
