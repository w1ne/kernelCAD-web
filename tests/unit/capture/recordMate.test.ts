// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Characterisation coverage for `recordMate` (src/modeling/capture/assemblyJoints.ts):
// pins the recorded `MateRecord` shape (present AND omitted optional keys) and
// every capture-time error message/hint/featureId. Written before the
// complexity split so the refactor is provably behaviour-preserving.

import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import { KernelError } from '../../../src/shared/intent/kernelError';

function makeRig() {
  const session = new CaptureSession();
  const kcad = createModelingApi({ session });
  const arm = kcad.assembly('rig');
  const base = arm.part('base', kcad.box(10, 10, 10));
  base.connector('ax', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
  base.connector('fr', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
  const child = arm.part('child', kcad.box(10, 10, 10));
  child.connector('ax', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
  child.connector('fr', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
  return { arm, base, child };
}

function kernelErrorFrom(run: () => void): KernelError {
  try {
    run();
  } catch (error) {
    if (error instanceof KernelError) return error;
    throw error;
  }
  throw new Error('expected KernelError');
}

function expectMateError(
  run: () => void,
  expected: { message: string; hint: string; featureId?: string },
): void {
  const error = kernelErrorFrom(run);
  expect(error.code).toBe('feature.invalid-args');
  expect(error.message).toBe(expected.message);
  expect(error.hint).toBe(expected.hint);
  expect(error.featureId).toBe(expected.featureId);
}

describe('recordMate characterisation', () => {
  it('records every optional field verbatim and omits absent keys', () => {
    const { arm } = makeRig();
    const capacity = { envelope: { maxResultantForceN: 120, maxResultantMomentNmm: 4000 } };
    arm.mate('hinge', 'base.ax', 'child.ax', 'revolute', {
      pose: 15,
      limitsDeg: [-45, 90],
      exposure: 'concealed',
      capacity,
    });
    arm.mate('slide', 'base.ax', 'child.ax', 'prismatic', {
      limitsMm: [0, 10],
      maxLoad: { force: 100, torque: 2 },
    });
    arm.mate('preload', 'base.ax', 'child.ax', 'prismatic', {
      maxLoad: { force: 100 },
    });
    arm.mate('fix', 'base.fr', 'child.fr', 'fastened');

    const mates = arm.model().mates;
    expect(mates).toStrictEqual([
      {
        name: 'hinge',
        a: 'base.ax',
        b: 'child.ax',
        type: 'revolute',
        pose: 15,
        limitsDeg: [-45, 90],
        exposure: 'concealed',
        capacity: { envelope: { maxResultantForceN: 120, maxResultantMomentNmm: 4000 } },
      },
      {
        name: 'slide',
        a: 'base.ax',
        b: 'child.ax',
        type: 'prismatic',
        limitsMm: [0, 10],
        maxLoad: { force: 100, torque: 2 },
      },
      {
        name: 'preload',
        a: 'base.ax',
        b: 'child.ax',
        type: 'prismatic',
        maxLoad: { force: 100 },
      },
      {
        name: 'fix',
        a: 'base.fr',
        b: 'child.fr',
        type: 'fastened',
      },
    ]);
    expect(mates?.[0].capacity).not.toBe(capacity);
  });

  it('rejects a malformed connector ref', () => {
    const { arm } = makeRig();
    expectMateError(
      () => arm.mate('bad', 'nofield', 'base.fr', 'fastened'),
      {
        message: "assembly.mate.connector-not-found: 'nofield' is not a 'partName.connectorName' reference.",
        hint: "invalid-args.assembly.mate-connector-not-found — pass refs of the form '<partName>.<connectorName>' where both names are declared on this assembly.",
      },
    );
  });

  it('rejects an unknown part ref', () => {
    const { arm } = makeRig();
    expectMateError(
      () => arm.mate('bad', 'ghost.fr', 'base.fr', 'fastened'),
      {
        message: "assembly.mate.connector-not-found: part 'ghost' (from ref 'ghost.fr') is not declared on assembly 'rig'.",
        hint: "invalid-args.assembly.mate-connector-not-found — declare the part via arm.part('ghost', ...) before referencing it in a mate.",
      },
    );
  });

  it('rejects an unknown connector ref and carries the part id', () => {
    const { arm, base } = makeRig();
    expectMateError(
      () => arm.mate('bad', 'base.ghost', 'child.fr', 'fastened'),
      {
        message: "assembly.mate.connector-not-found: connector 'ghost' is not declared on part 'base' (ref 'base.ghost').",
        hint: "invalid-args.assembly.mate-connector-not-found — register the connector via partRef.connector('ghost', { type, origin, ... }) before referencing it in a mate.",
        featureId: base.id,
      },
    );
  });

  it('rejects an incompatible connector pair', () => {
    const { arm } = makeRig();
    expectMateError(
      () => arm.mate('bad', 'base.fr', 'child.fr', 'revolute'),
      {
        message: "assembly.mate.type-mismatch: mate 'bad' type 'revolute' is not compatible with the connector pair (base.fr:frame, child.fr:frame).",
        hint: "invalid-args.assembly.mate-type-mismatch — 'revolute' mates require a specific connector-type pair; see the mate-type compatibility table in mateTypes.ts.",
      },
    );
  });

  it('rejects a pose on a zero-DOF mate', () => {
    const { arm } = makeRig();
    expectMateError(
      () => arm.mate('bad', 'base.fr', 'child.fr', 'fastened', { pose: 1 }),
      {
        message: "assembly.mate.pose-on-zero-dof-mate: mate 'bad' is type 'fastened' and accepts no pose; remove opts.pose.",
        hint: "invalid-args.assembly.mate-pose-on-zero-dof-mate — 'fastened' mates have no articulation DOF; drop opts.pose or change the mate type.",
      },
    );
  });

  it('rejects limitsDeg on a prismatic mate', () => {
    const { arm } = makeRig();
    expectMateError(
      () => arm.mate('bad', 'base.ax', 'child.ax', 'prismatic', { limitsDeg: [0, 10] }),
      {
        message: "assembly.mate.limit-type-mismatch: mate 'bad' type 'prismatic' does not accept limitsDeg.",
        hint: "invalid-args.assembly.mate-limit-type-mismatch — limitsDeg applies to revolute, cylindrical, and pin_slot mates.",
      },
    );
  });

  it('rejects limitsMm on a revolute mate', () => {
    const { arm } = makeRig();
    expectMateError(
      () => arm.mate('bad', 'base.ax', 'child.ax', 'revolute', { limitsMm: [0, 10] }),
      {
        message: "assembly.mate.limit-type-mismatch: mate 'bad' type 'revolute' does not accept limitsMm.",
        hint: "invalid-args.assembly.mate-limit-type-mismatch — limitsMm applies to prismatic mates.",
      },
    );
  });
});
