// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../capture/captureSession';
import { createApi } from '../api';
import type { Assembly } from '../capture/assembly';
import { makePhysicalUseCaseRecord, type PhysicalUseCaseRecord } from './physicalUseCase';
import { assessPhysicalUseCaseReachability } from './physicalUseCaseReachability';
import { reviewPhysicalUseCaseStatics } from './physicalUseCaseStatics';

function makeSymmetricHoldRig(opts: {
  loadAt?: string;
  loadForce?: readonly [number, number, number];
  loadTorque?: readonly [number, number, number];
  maxTorqueNmm?: number;
  coupleRight?: boolean;
  transmissionRatio?: number;
  omitRightActuator?: boolean;
} = {}): { arm: Assembly; useCase: PhysicalUseCaseRecord } {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  const arm = kcad.assembly('symmetric hold rig');

  arm
    .part('base', kcad.box(50, 20, 8))
    .connector('left-axis', {
      type: 'axis',
      origin: { kind: 'vec3', value: [-20, 0, 0] },
      axis: [0, 1, 0],
    })
    .connector('right-axis', {
      type: 'axis',
      origin: { kind: 'vec3', value: [20, 0, 0] },
      axis: [0, 1, 0],
    });
  arm
    .part('left-finger', kcad.box(10, 4, 4))
    .connector('axis', {
      type: 'axis',
      origin: { kind: 'vec3', value: [-20, 0, 0] },
      axis: [0, 1, 0],
    })
    .connector('tip', {
      type: 'frame',
      origin: { kind: 'vec3', value: [-10, 0, 0] },
    });
  arm
    .part('right-finger', kcad.box(10, 4, 4))
    .connector('axis', {
      type: 'axis',
      origin: { kind: 'vec3', value: [20, 0, 0] },
      axis: [0, 1, 0],
    })
    .connector('tip', {
      type: 'frame',
      origin: { kind: 'vec3', value: [10, 0, 0] },
    });
  arm
    .part('held', kcad.box(20, 10, 10), { role: 'contact-target' })
    .connector('center', {
      type: 'frame',
      origin: { kind: 'vec3', value: [0, 0, 0] },
    })
    .connector('left-contact', {
      type: 'frame',
      origin: { kind: 'vec3', value: [-10, 0, 0] },
    })
    .connector('right-contact', {
      type: 'frame',
      origin: { kind: 'vec3', value: [10, 0, 0] },
    });

  arm.mate('left-curl', 'base.left-axis', 'left-finger.axis', 'revolute', { limitsDeg: [0, 1] });
  arm.mate('right-curl', 'base.right-axis', 'right-finger.axis', 'revolute', { limitsDeg: [0, 1] });
  if (opts.coupleRight === true) {
    arm.coupleMates('right-curl', { source: 'left-curl', ratio: 1 });
    if (opts.transmissionRatio !== undefined) {
      arm.transmission('finger-coupling', {
        kind: 'link-rod',
        sourceMate: 'left-curl',
        drivenMates: ['right-curl'],
        path: ['left-finger', 'base', 'right-finger'],
        ratio: opts.transmissionRatio,
      });
    }
  }

  const maxTorqueNmm = opts.maxTorqueNmm ?? 100;
  const useCase = makePhysicalUseCaseRecord('symmetric-hold', {
    stableParts: ['base'],
    loads: [{
      part: 'held',
      ...(opts.loadAt === undefined ? {} : { at: opts.loadAt }),
      force: opts.loadForce ?? [0, 0, -6],
      ...(opts.loadTorque === undefined ? {} : { torque: opts.loadTorque }),
    }],
    contacts: [
      {
        a: 'left-finger.tip',
        b: 'held.left-contact',
        normal: [-1, 0, 0],
        friction: 0.5,
        normalForceN: 8,
      },
      {
        a: 'right-finger.tip',
        b: 'held.right-contact',
        normal: [1, 0, 0],
        friction: 0.5,
        normalForceN: 8,
      },
    ],
    actuatorLimits: opts.coupleRight === true
      ? [{ mate: 'left-curl', maxTorqueNmm }]
      : opts.omitRightActuator === true
        ? [{ mate: 'left-curl', maxTorqueNmm }]
        : [
          { mate: 'left-curl', maxTorqueNmm },
          { mate: 'right-curl', maxTorqueNmm },
        ],
    criteria: {
      maxSlipMm: 0.01,
      maxForceResidualN: 0.01,
      maxTorqueResidualNmm: 0.1,
    },
  });
  return { arm, useCase };
}

function makeOffsetContactRig(): { arm: Assembly; useCase: PhysicalUseCaseRecord } {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  const arm = kcad.assembly('offset contact rig');

  arm
    .part('base', kcad.box(30, 20, 8))
    .connector('axis', {
      type: 'axis',
      origin: { kind: 'vec3', value: [20, 0, 0] },
      axis: [0, 1, 0],
    });
  arm
    .part('finger', kcad.box(10, 4, 4))
    .connector('axis', {
      type: 'axis',
      origin: { kind: 'vec3', value: [20, 0, 0] },
      axis: [0, 1, 0],
    })
    .connector('tip', {
      type: 'frame',
      origin: { kind: 'vec3', value: [10, 0, 0] },
    });
  arm
    .part('held', kcad.box(20, 10, 10), { role: 'contact-target' })
    .connector('center', {
      type: 'frame',
      origin: { kind: 'vec3', value: [0, 0, 0] },
    })
    .connector('contact', {
      type: 'frame',
      origin: { kind: 'vec3', value: [10, 0, 0] },
    });
  arm.mate('curl', 'base.axis', 'finger.axis', 'revolute', { limitsDeg: [0, 1] });

  const useCase = makePhysicalUseCaseRecord('offset-hold', {
    stableParts: ['base'],
    loads: [{ part: 'held', at: 'held.center', force: [0, 0, -1] }],
    contacts: [{
      a: 'finger.tip',
      b: 'held.contact',
      normal: [0, 0, -1],
      friction: 0.2,
      normalForceN: 2,
    }],
    actuatorLimits: [{ mate: 'curl', maxTorqueNmm: 100 }],
    criteria: {
      maxSlipMm: 0.01,
      maxForceResidualN: 0.01,
      maxTorqueResidualNmm: 0.1,
    },
  });
  return { arm, useCase };
}

function makeRotatedNormalRig(): { arm: Assembly; useCase: PhysicalUseCaseRecord } {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  const arm = kcad.assembly('rotated normal rig');

  arm
    .part('base', kcad.box(20, 20, 8))
    .connector('axis', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 0] },
      axis: [0, 0, 1],
    });
  arm
    .part('finger', kcad.box(10, 4, 4))
    .connector('axis', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 0] },
      axis: [0, 0, 1],
    })
    .connector('tip', {
      type: 'frame',
      origin: { kind: 'vec3', value: [10, 0, 0] },
    });
  arm
    .part('held', kcad.box(4, 4, 4), { role: 'contact-target' })
    .connector('contact', {
      type: 'frame',
      origin: { kind: 'vec3', value: [0, 10, 0] },
    });
  arm.mate('turn', 'base.axis', 'finger.axis', 'revolute', { limitsDeg: [90, 91] });

  const useCase = makePhysicalUseCaseRecord('rotated-normal-hold', {
    stableParts: ['base'],
    loads: [{ part: 'held', at: 'held.contact', force: [-1, 0, 0] }],
    contacts: [{
      a: 'finger.tip',
      b: 'held.contact',
      normal: [0, 1, 0],
      normalFrame: 'a',
      friction: 0.2,
      normalForceN: 2,
    }],
    actuatorLimits: [{ mate: 'turn', maxTorqueNmm: 20 }],
    criteria: {
      maxSlipMm: 0.01,
      maxForceResidualN: 0.01,
      maxTorqueResidualNmm: 0.1,
    },
  });
  return { arm, useCase };
}

async function reviewRig(arm: Assembly, useCase: PhysicalUseCaseRecord) {
  const reachability = await assessPhysicalUseCaseReachability(arm, useCase, { samplesPerMate: 1 });
  expect(reachability.findings).toEqual([]);
  expect(reachability.commonPoseSamples.length).toBeGreaterThan(0);
  return reviewPhysicalUseCaseStatics(arm, useCase, reachability.commonPoseSamples);
}

describe('physical use case statics', () => {
  it('rejects a force load without an explicit application connector', async () => {
    const { arm, useCase } = makeSymmetricHoldRig();

    const result = await reviewRig(arm, useCase);

    expect(result.certificates).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        kind: 'static-input-incomplete',
        useCaseName: 'symmetric-hold',
      }),
    ]);
  });

  it('rejects a supplied non-finite load vector instead of treating it as zero', async () => {
    const { arm, useCase } = makeSymmetricHoldRig({
      loadAt: 'held.center',
      loadTorque: [Number.NaN, 0, 0],
    });

    const result = await reviewRig(arm, useCase);

    expect(result.certificates).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        kind: 'static-input-incomplete',
        useCaseName: 'symmetric-hold',
        message: expect.stringMatching(/finite Vec3/),
      }),
    ]);
  });

  it('certifies a pure applied torque when load.at supplies the reference point', async () => {
    const { arm, useCase } = makeSymmetricHoldRig({
      loadAt: 'held.center',
      loadForce: [0, 0, 0],
      loadTorque: [0, 0, 4],
    });

    const result = await reviewRig(arm, useCase);

    expect(result.issues).toEqual([]);
    expect(result.certificates).toHaveLength(1);
    expect(result.certificates[0].forceResidualN).toBeLessThanOrEqual(0.01);
    expect(result.certificates[0].torqueResidualNmm).toBeLessThanOrEqual(0.1);
  });

  it('rejects coupled motion without declared physical transmission evidence', async () => {
    const { arm, useCase } = makeSymmetricHoldRig({
      loadAt: 'held.center',
      coupleRight: true,
    });

    const result = await reviewRig(arm, useCase);

    expect(result.certificates).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        kind: 'static-input-incomplete',
        message: expect.stringMatching(/arm\.transmission/),
      }),
    ]);
  });

  it('rejects transmission evidence whose ratio contradicts the kinematic coupling', async () => {
    const { arm, useCase } = makeSymmetricHoldRig({
      loadAt: 'held.center',
      coupleRight: true,
      transmissionRatio: 2,
    });

    const result = await reviewRig(arm, useCase);

    expect(result.certificates).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        kind: 'static-input-incomplete',
        message: expect.stringMatching(/ratio/),
      }),
    ]);
  });

  it('rejects duplicate connector pairs instead of multiplying contact capacity', async () => {
    const { arm, useCase } = makeSymmetricHoldRig({ loadAt: 'held.center' });
    const duplicatedUseCase: PhysicalUseCaseRecord = {
      ...useCase,
      contacts: [...useCase.contacts, { ...useCase.contacts[0] }],
    };

    const result = await reviewRig(arm, duplicatedUseCase);

    expect(result.certificates).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        kind: 'static-input-incomplete',
        message: expect.stringMatching(/duplicate contact/i),
      }),
    ]);
  });

  it('rejects an independent contact-path hinge with no actuator limit', async () => {
    const { arm, useCase } = makeSymmetricHoldRig({
      loadAt: 'held.center',
      omitRightActuator: true,
    });

    const result = await reviewRig(arm, useCase);

    expect(result.certificates).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        kind: 'static-input-incomplete',
        message: expect.stringMatching(/right-curl.*actuatorLimits/),
      }),
    ]);
  });

  it('rejects force balance that leaves an unbalanced moment', async () => {
    const { arm, useCase } = makeOffsetContactRig();

    const result = await reviewRig(arm, useCase);

    expect(result.certificates).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        kind: 'static-equilibrium-unmet',
        useCaseName: 'offset-hold',
        bestForceResidualN: expect.any(Number),
        bestTorqueResidualNmm: expect.any(Number),
      }),
    ]);
    const issue = result.issues[0];
    if (issue.kind !== 'static-equilibrium-unmet') throw new Error('expected equilibrium issue');
    expect(issue.bestForceResidualN!).toBeGreaterThan(0.1);
    expect(issue.bestTorqueResidualNmm!).toBeGreaterThan(1);
  });

  it('certifies a symmetric contact allocation that balances force and moment', async () => {
    const { arm, useCase } = makeSymmetricHoldRig({ loadAt: 'held.center' });

    const result = await reviewRig(arm, useCase);

    expect(result.issues).toEqual([]);
    expect(result.certificates).toHaveLength(1);
    expect(result.certificates[0]).toMatchObject({
      useCaseName: 'symmetric-hold',
      heldPart: 'held',
      forceResidualN: expect.any(Number),
      torqueResidualNmm: expect.any(Number),
      contactForces: expect.arrayContaining([
        expect.objectContaining({
          contactA: 'left-finger.tip',
          contactB: 'held.left-contact',
          pointWorldMm: [-10, 0, 0],
          mechanismPart: 'left-finger',
          forceOnHeldWorldN: expect.any(Array),
        }),
        expect.objectContaining({
          contactA: 'right-finger.tip',
          contactB: 'held.right-contact',
          pointWorldMm: [10, 0, 0],
          mechanismPart: 'right-finger',
          forceOnHeldWorldN: expect.any(Array),
        }),
      ]),
    });
    expect(result.certificates[0].forceResidualN).toBeLessThanOrEqual(0.01);
    expect(result.certificates[0].torqueResidualNmm).toBeLessThanOrEqual(0.1);
    expect(
      result.certificates[0].contactForces.reduce(
        (sum, contact) => sum + contact.forceOnHeldWorldN[2],
        0,
      ),
    ).toBeCloseTo(6, 2);
  });

  it('rotates a contact normal from its endpoint frame into world space', async () => {
    const { arm, useCase } = makeRotatedNormalRig();

    const result = await reviewRig(arm, useCase);

    expect(result.issues).toEqual([]);
    expect(result.certificates).toHaveLength(1);
    expect(result.certificates[0].contactForces[0].mechanismPart).toBe('finger');
    expect(result.certificates[0].contactForces[0].pointWorldMm[0]).toBeCloseTo(0, 8);
    expect(result.certificates[0].contactForces[0].pointWorldMm[1]).toBeCloseTo(10, 8);
    expect(result.certificates[0].contactForces[0].pointWorldMm[2]).toBeCloseTo(0, 8);
    expect(result.certificates[0].contactForces[0].forceOnHeldWorldN[0]).toBeCloseTo(1, 2);
    expect(Math.abs(result.certificates[0].contactForces[0].forceOnHeldWorldN[1])).toBeLessThan(0.01);
    expect(result.certificates[0].actuatorTorques[0]).toMatchObject({
      mateName: 'turn',
      maxTorqueNmm: 20,
    });
    expect(result.certificates[0].actuatorTorques[0].requiredTorqueNmm).toBeCloseTo(10, 1);
  });

  it('rejects a balanced allocation that exceeds actuator torque limits', async () => {
    const { arm, useCase } = makeSymmetricHoldRig({
      loadAt: 'held.center',
      maxTorqueNmm: 25,
    });

    const result = await reviewRig(arm, useCase);

    expect(result.certificates).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        kind: 'static-actuator-torque-insufficient',
        useCaseName: 'symmetric-hold',
        actuatorTorques: expect.arrayContaining([
          expect.objectContaining({ mateName: 'left-curl', maxTorqueNmm: 25 }),
          expect.objectContaining({ mateName: 'right-curl', maxTorqueNmm: 25 }),
        ]),
      }),
    ]);
  });

  it('certifies the same allocation when actuator torque limits are sufficient', async () => {
    const { arm, useCase } = makeSymmetricHoldRig({
      loadAt: 'held.center',
      maxTorqueNmm: 35,
    });

    const result = await reviewRig(arm, useCase);

    expect(result.issues).toEqual([]);
    expect(result.certificates).toHaveLength(1);
    expect(result.certificates[0].actuatorTorques).toHaveLength(2);
    for (const actuator of result.certificates[0].actuatorTorques) {
      expect(actuator.requiredTorqueNmm).toBeCloseTo(30, 1);
      expect(actuator.maxTorqueNmm).toBe(35);
    }
  });
});
