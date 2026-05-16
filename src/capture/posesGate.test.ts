import { describe, expect, it } from 'vitest';
import { CaptureSession } from './captureSession';
import { createApi } from '../modeling/api';

function makeArm() {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  return { arm: kcad.assembly('rig'), kcad };
}

/**
 * Task 6 — `posesGate` option on `Assembly.solvedModel`.
 *
 * `posesGate: 'envelope'` runs `reviewPoseEnvelope` after the existing
 * default-pose validation and folds its diagnostics into the gate. Default
 * remains `'default'` (today's behavior — envelope review NOT run).
 *
 * Failure mode chosen for tests 2/3: a revolute mate whose capture-time pose
 * sits OUTSIDE its declared limits. `validateMatePoseLimits` (called inside
 * `reviewPoseEnvelope`) emits `assembly.pose.out-of-limits` at severity
 * `error` on the `current` sample. The existing default-pose validator does
 * NOT flag this, so the diagnostic is genuinely envelope-only — which is
 * exactly what `posesGate` is intended to gate on.
 */
describe('Assembly.solvedModel posesGate option', () => {
  it('posesGate defaults to "default" and does NOT run envelope review', async () => {
    const { arm, kcad } = makeArm();
    arm
      .part('base', kcad.box(10, 10, 10))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('link', kcad.box(5, 5, 5))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    // Pose sits OUTSIDE declared limits — would be flagged ONLY by the
    // envelope review. Default `posesGate: 'default'` must NOT run it.
    arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', {
      pose: 120,
      limitsDeg: [-90, 90],
    });

    const scene = await arm.solvedModel({});
    // Today's warn-mode behavior preserved: pose-envelope-only diagnostic
    // codes must NOT appear in scene.warnings when posesGate is unset.
    const codes = scene.warnings.map((w) => w.code);
    expect(codes).not.toContain('assembly.pose.out-of-limits');
    expect(codes).not.toContain('assembly.pose-envelope.interference');
    expect(codes).not.toContain('assembly.pose-envelope.solve-failed');
    expect(codes).not.toContain('assembly.pose-envelope.connector-unresolved');
  });

  it('posesGate=envelope + validate=error throws when envelope sample has interference', async () => {
    const { arm, kcad } = makeArm();
    arm
      .part('base', kcad.box(10, 10, 10))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('link', kcad.box(5, 5, 5))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', {
      pose: 120,
      limitsDeg: [-90, 90],
    });

    await expect(
      arm.solvedModel({}, { validate: 'error', posesGate: 'envelope' }),
    ).rejects.toThrow(/pose-envelope|out-of-limits/);
  });

  it('posesGate=envelope + validate=warn does NOT throw', async () => {
    const { arm, kcad } = makeArm();
    arm
      .part('base', kcad.box(10, 10, 10))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('link', kcad.box(5, 5, 5))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', {
      pose: 120,
      limitsDeg: [-90, 90],
    });

    const scene = await arm.solvedModel({}, { validate: 'warn', posesGate: 'envelope' });
    // Diagnostics surface on scene.warnings; the gate does not throw.
    const codes = scene.warnings.map((w) => w.code);
    expect(codes).toContain('assembly.pose.out-of-limits');
  });

  it('posesGate=default does NOT throw even with envelope-only errors', async () => {
    const { arm, kcad } = makeArm();
    arm
      .part('base', kcad.box(10, 10, 10))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('link', kcad.box(5, 5, 5))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', {
      pose: 120,
      limitsDeg: [-90, 90],
    });

    // Default posesGate ('default') keeps today's behavior: envelope-only
    // errors do not gate the call, even under `validate: 'error'`.
    await expect(arm.solvedModel({}, { validate: 'error' })).resolves.toBeDefined();
  });
});
