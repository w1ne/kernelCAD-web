// tests/unit/assemblies/solvedModelValidate.test.ts
//
// v0.6 Task 9 — `solvedModel({validate})` gate. Default `warn` attaches
// validator diagnostics to `scene.warnings`; `error` throws on any error-
// severity diagnostic (or `over-constrained` / `did-not-converge` status);
// `off` skips validation. Env override `KERNELCAD_VALIDATE_DEFAULT=error`
// flips the default for opt-less calls (T10 will set it from the CLI).

import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../src/capture/captureSession';
import { createApi } from '../../../src/modules/api';

function makeArm() {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  return { arm: kcad.assembly('t'), kcad };
}

function makeTriangleArm() {
  // Inconsistent triangle: a-b distance constrained to 0, b-c distance 1,
  // c-a distance 2 — so 0 + 1 != 2. Solver flags this as over-constrained.
  const { arm, kcad } = makeArm();
  arm
    .part('a', kcad.box(1, 1, 1))
    .connector('p', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
  arm
    .part('b', kcad.box(1, 1, 1))
    .connector('q', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } })
    .connector('r', { type: 'frame', origin: { kind: 'vec3', value: [1, 0, 0] } });
  arm
    .part('c', kcad.box(1, 1, 1))
    .connector('s', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } })
    .connector('t', { type: 'frame', origin: { kind: 'vec3', value: [2, 0, 0] } });
  arm.mate('m1', 'a.p', 'b.q', 'fastened');
  arm.mate('m2', 'b.r', 'c.s', 'fastened');
  arm.mate('m3', 'c.t', 'a.p', 'fastened');
  return { arm, kcad };
}

describe('Assembly.solvedModel({validate})', () => {
  it('returns scene with warnings[] on validation issues when mode=warn (default)', async () => {
    const { arm, kcad } = makeArm();
    arm.part('orphan', kcad.box(1, 1, 1)); // no joint, no mate -> floating
    const scene = await arm.solvedModel({});
    expect(scene.warnings).toBeDefined();
    expect(scene.warnings.length).toBeGreaterThan(0);
    expect(scene.warnings.some((w) => w.code === 'assembly.part.floating')).toBe(true);
  });

  it('throws on validation issue when mode=error and an error-severity diagnostic exists', async () => {
    const { arm } = makeTriangleArm();
    await expect(arm.solvedModel({}, { validate: 'error' })).rejects.toThrow(
      /over-constrained|invalid-args/,
    );
  });

  it('does NOT throw on mode=warn even with error-severity diagnostics', async () => {
    const { arm } = makeTriangleArm();
    const scene = await arm.solvedModel({}, { validate: 'warn' });
    expect(scene.warnings.some((w) => w.severity === 'error')).toBe(true);
  });

  it('skips validation entirely when mode=off', async () => {
    const { arm, kcad } = makeArm();
    arm.part('orphan', kcad.box(1, 1, 1)); // would be floating
    const scene = await arm.solvedModel({}, { validate: 'off' });
    expect(scene.warnings).toHaveLength(0);
  });

  it('respects KERNELCAD_VALIDATE_DEFAULT=error env var', async () => {
    // Uses the inconsistent-triangle setup so the validator surfaces an
    // error-severity diagnostic (over-constrained). With no `opts` passed,
    // the env var flips the default mode from `'warn'` to `'error'` and
    // the resulting Promise rejects. A `warning`-only assembly (e.g. an
    // orphan part) would NOT throw under `error` mode by design — that's
    // covered by the explicit-mode tests above.
    const { arm } = makeTriangleArm();
    const prev = process.env.KERNELCAD_VALIDATE_DEFAULT;
    process.env.KERNELCAD_VALIDATE_DEFAULT = 'error';
    try {
      await expect(arm.solvedModel({})).rejects.toThrow();
    } finally {
      if (prev === undefined) delete process.env.KERNELCAD_VALIDATE_DEFAULT;
      else process.env.KERNELCAD_VALIDATE_DEFAULT = prev;
    }
  });
});

describe('Assembly.solvedModel — mate-driven placement (Pattern A)', () => {
  it('places parts via the mate solver when mates are declared', async () => {
    // Two parts in LOCAL frames (no `.translate(...)` for placement);
    // a revolute mate with pose=90° plants the child on the parent's
    // connector at z=5 and rotates it 90° about +Z. The Scene's
    // `worldTransform` for 'child' must reflect that placement.
    const { arm, kcad } = makeArm();
    arm
      .part('parent', kcad.box(10, 10, 10))
      .connector('out', {
        type: 'axis',
        origin: { kind: 'vec3', value: [0, 0, 5] },
        axis: [0, 0, 1],
      });
    arm
      .part('child', kcad.box(5, 5, 5))
      .connector('in', {
        type: 'axis',
        origin: { kind: 'vec3', value: [0, 0, 0] },
        axis: [0, 0, 1],
      });
    arm.mate('joint', 'parent.out', 'child.in', 'revolute', { pose: 90 });

    const scene = await arm.solvedModel({});
    const childPart = scene.part('child');
    // child's local [0,0,0] lands on parent's connector at world [0,0,5].
    const childOriginWorld = childPart.worldTransform.point([0, 0, 0]);
    expect(childOriginWorld[0]).toBeCloseTo(0);
    expect(childOriginWorld[1]).toBeCloseTo(0);
    expect(childOriginWorld[2]).toBeCloseTo(5);
    // child's local +X rotates 90° about +Z → world +Y at the same z.
    const childPlusXWorld = childPart.worldTransform.point([1, 0, 0]);
    expect(childPlusXWorld[0]).toBeCloseTo(0);
    expect(childPlusXWorld[1]).toBeCloseTo(1);
    expect(childPlusXWorld[2]).toBeCloseTo(5);
  });

  it('preserves v0.5 body-tree FK behavior when no mates are declared', async () => {
    // Pure v0.5: a single orphan part (no joints, no mates). Scene's
    // worldTransform must remain identity — the existing `.translate(...)`
    // chain on the source shape stays untouched, and the lowerer-side
    // body-tree FK on `solvedAssembly` is the source of truth at recompute
    // time. Capture-time Scene's per-part `worldTransform` is identity for
    // v0.5 (no body-tree FK runs at capture).
    const { arm, kcad } = makeArm();
    arm.part('orphan', kcad.box(1, 1, 1));
    const scene = await arm.solvedModel({}, { validate: 'off' });
    const part = scene.part('orphan');
    const { translate, rotateDeg } = part.worldTransform.decomposeToTranslateAndRotate();
    expect(translate[0]).toBeCloseTo(0);
    expect(translate[1]).toBeCloseTo(0);
    expect(translate[2]).toBeCloseTo(0);
    expect(Math.abs(rotateDeg)).toBeCloseTo(0);
  });
});
