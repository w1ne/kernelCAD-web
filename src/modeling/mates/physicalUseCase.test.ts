// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../capture/captureSession';
import { createApi } from '../api';
import {
  makePhysicalUseCaseRecord,
  reviewPhysicalUseCasesWithReachability,
} from './physicalUseCase';

function makeStaticReviewRig(maxTorqueNmm: number) {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  const arm = kcad.assembly('static review rig');
  arm
    .part('base', kcad.box(50, 20, 8))
    .connector('left-axis', { type: 'axis', origin: { kind: 'vec3', value: [-20, 0, 0] }, axis: [0, 1, 0] })
    .connector('right-axis', { type: 'axis', origin: { kind: 'vec3', value: [20, 0, 0] }, axis: [0, 1, 0] });
  arm
    .part('left-finger', kcad.box(10, 4, 4))
    .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [-20, 0, 0] }, axis: [0, 1, 0] })
    .connector('tip', { type: 'frame', origin: { kind: 'vec3', value: [-10, 0, 0] } });
  arm
    .part('right-finger', kcad.box(10, 4, 4))
    .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [20, 0, 0] }, axis: [0, 1, 0] })
    .connector('tip', { type: 'frame', origin: { kind: 'vec3', value: [10, 0, 0] } });
  arm
    .part('held', kcad.box(20, 10, 10), { role: 'contact-target' })
    .connector('center', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } })
    .connector('left-contact', { type: 'frame', origin: { kind: 'vec3', value: [-10, 0, 0] } })
    .connector('right-contact', { type: 'frame', origin: { kind: 'vec3', value: [10, 0, 0] } });
  arm.mate('left-curl', 'base.left-axis', 'left-finger.axis', 'revolute', { limitsDeg: [0, 1] });
  arm.mate('right-curl', 'base.right-axis', 'right-finger.axis', 'revolute', { limitsDeg: [0, 1] });
  arm.physicalUseCase('hold-object', {
    stableParts: ['base'],
    loads: [{ part: 'held', at: 'held.center', force: [0, 0, -6] }],
    contacts: [
      { a: 'left-finger.tip', b: 'held.left-contact', normal: [-1, 0, 0], friction: 0.5, normalForceN: 8 },
      { a: 'right-finger.tip', b: 'held.right-contact', normal: [1, 0, 0], friction: 0.5, normalForceN: 8 },
    ],
    actuatorLimits: [
      { mate: 'left-curl', maxTorqueNmm },
      { mate: 'right-curl', maxTorqueNmm },
    ],
    criteria: { maxSlipMm: 0.01, maxForceResidualN: 0.01, maxTorqueResidualNmm: 0.1 },
  });
  return arm;
}

function makeStructurallyRatedClevisRig(
  opts: {
    envelopeForceN?: number;
    includeEnvelope?: boolean;
    includeStructure?: boolean;
    minJointSafetyFactor?: number;
  } = {},
) {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  const arm = kcad.assembly('rated clevis rig');
  const steel = {
    name: 'test steel',
    model: 'isotropic-ductile' as const,
    yieldStrengthMPa: 250,
    bearingStrengthMPa: 400,
  };
  const clevis = kcad.joint.clevis({
    parentBody: kcad.box(30, 30, 10, true),
    childBody: kcad.box(50, 6, 6, true).translate(25, 0, 0),
    axis: 'Z',
    pivotParent: [0, 0, 0],
    pivotChild: [0, 0, 0],
    liftPivot: false,
    style: {
      knuckleR: 10,
      forkGapY: 6,
      tongueY: 5,
      plateT: 4,
      pinR: 3,
      holeClearance: 0.2,
    },
    engineering: { pin: steel, fork: steel, tongue: steel },
  });

  arm
    .part('base', clevis.parentGeometry)
    .connector('axis', {
      type: 'axis',
      origin: { kind: 'vec3', value: clevis.parentConnector.origin },
      axis: clevis.parentConnector.axis,
      jointClearanceRadius: clevis.parentConnector.clearanceRadius,
    });
  arm
    .part('finger', clevis.childGeometry)
    .connector('axis', {
      type: 'axis',
      origin: { kind: 'vec3', value: clevis.childConnector.origin },
      axis: clevis.childConnector.axis,
      jointClearanceRadius: clevis.childConnector.clearanceRadius,
    })
    .connector('tip', {
      type: 'frame',
      origin: { kind: 'vec3', value: [50, 0, 0] },
    });
  arm
    .part('held', kcad.box(6, 6, 6, true), { role: 'contact-target' })
    .connector('contact', {
      type: 'frame',
      origin: { kind: 'vec3', value: [50, 0, 0] },
    })
    .connector('load-point', {
      type: 'frame',
      origin: { kind: 'vec3', value: [50, 0, 0] },
    });

  arm.mate('hinge', 'base.axis', 'finger.axis', 'revolute', {
    pose: 0,
    limitsDeg: [-1, 1],
    capacity: {
      ...(opts.includeEnvelope === false ? {} : {
        envelope: {
          maxResultantForceN: opts.envelopeForceN ?? 100,
          maxResultantMomentNmm: 1000,
        },
      }),
      ...(opts.includeStructure === false ? {} : { structure: clevis.structural }),
    },
  });
  arm.mechanicalJoint('hinge-drive', {
    mate: 'hinge',
    actuator: 'base',
    shaft: 'base',
    supports: ['base'],
    output: 'finger',
  });
  arm.physicalUseCase('hold-load', {
    stableParts: ['base'],
    loads: [{ part: 'held', at: 'held.load-point', force: [0, -10, 0] }],
    contacts: [{
      a: 'finger.tip',
      b: 'held.contact',
      normal: [0, -1, 0],
      normalFrame: 'world',
      friction: 0.5,
      normalForceN: 20,
    }],
    actuatorLimits: [{ mate: 'hinge', maxTorqueNmm: 1000 }],
    criteria: {
      maxSlipMm: 0.001,
      maxForceResidualN: 0.01,
      maxTorqueResidualNmm: 0.1,
      ...(opts.minJointSafetyFactor === undefined
        ? {}
        : { minJointSafetyFactor: opts.minJointSafetyFactor }),
    },
  });
  return arm;
}

describe('physical use case records', () => {
  it('deep-copies nested load, contact, actuator, criteria, and vector inputs', () => {
    const force: [number, number, number] = [1, 2, 3];
    const torque: [number, number, number] = [4, 5, 6];
    const normal: [number, number, number] = [0, 0, 1];
    const loads = [{ part: 'link', at: 'link.load-point', force, torque }];
    const contacts = [{
      a: 'link.tip',
      b: 'base.target',
      normal,
      normalFrame: 'a' as 'a' | 'b',
      friction: 0.5,
      normalForceN: 10,
    }];
    const actuatorLimits = [{ mate: 'yaw', maxTorqueNmm: 100 }];
    const criteria = {
      maxSlipMm: 2,
      settleTimeMs: 50,
      maxForceResidualN: 0.01,
      maxTorqueResidualNmm: 0.1,
    };

    const record = makePhysicalUseCaseRecord('touch-target', {
      stableParts: ['base'],
      loads,
      contacts,
      actuatorLimits,
      criteria,
    });

    loads[0].part = 'mutated-link';
    loads[0].at = 'mutated.load-point';
    force[0] = 99;
    torque[1] = 99;
    contacts[0].a = 'mutated.tip';
    contacts[0].normalFrame = 'b';
    normal[2] = 99;
    contacts[0].friction = 99;
    actuatorLimits[0].mate = 'mutated-yaw';
    actuatorLimits[0].maxTorqueNmm = 99;
    criteria.maxSlipMm = 99;

    expect(record.loads[0]).toEqual({
      part: 'link',
      at: 'link.load-point',
      force: [1, 2, 3],
      torque: [4, 5, 6],
    });
    expect(record.contacts[0]).toEqual({
      a: 'link.tip',
      b: 'base.target',
      normal: [0, 0, 1],
      normalFrame: 'a',
      friction: 0.5,
      normalForceN: 10,
    });
    expect(record.actuatorLimits[0]).toEqual({ mate: 'yaw', maxTorqueNmm: 100 });
    expect(record.criteria).toEqual({
      maxSlipMm: 2,
      settleTimeMs: 50,
      maxForceResidualN: 0.01,
      maxTorqueResidualNmm: 0.1,
    });
  });

  it('rejects invalid statics frames and residual tolerances at capture time', () => {
    expect(() => makePhysicalUseCaseRecord('bad-frame', {
      contacts: [{
        a: 'finger.tip',
        b: 'held.contact',
        normal: [1, 0, 0],
        normalFrame: 'part' as never,
        friction: 0.5,
      }],
    })).toThrow(/normalFrame/);

    for (const criteria of [
      { maxForceResidualN: 0 },
      { maxTorqueResidualNmm: -1 },
      { maxForceResidualN: Number.NaN },
    ]) {
      expect(() => makePhysicalUseCaseRecord('bad-tolerance', { criteria })).toThrow(
        /positive finite/,
      );
    }

    expect(() => makePhysicalUseCaseRecord('loose-force-tolerance', {
      criteria: { maxForceResidualN: 0.02 },
    })).toThrow(/cannot exceed/);
    expect(() => makePhysicalUseCaseRecord('loose-torque-tolerance', {
      criteria: { maxTorqueResidualNmm: 0.2 },
    })).toThrow(/cannot exceed/);

    for (const minJointSafetyFactor of [0, 1.99, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => makePhysicalUseCaseRecord('bad-safety-factor', {
        criteria: { minJointSafetyFactor },
      })).toThrow(/safety factor|at least 2/i);
    }
  });

  it('reports a blocking diagnostic when contacts require different actuator poses', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('split-pose-review');
    arm
      .part('base', kcad.box(10, 10, 10))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
      .connector('target-a', { type: 'frame', origin: { kind: 'vec3', value: [10, 0, 0] } })
      .connector('target-b', { type: 'frame', origin: { kind: 'vec3', value: [0, 10, 0] } });
    arm
      .part('finger', kcad.box(10, 2, 2))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
      .connector('a', { type: 'frame', origin: { kind: 'vec3', value: [10, 0, 0] } })
      .connector('b', { type: 'frame', origin: { kind: 'vec3', value: [10, 0, 0] } });
    arm.mate('yaw', 'base.axis', 'finger.axis', 'revolute', { limitsDeg: [0, 90] });
    arm.mechanicalJoint('yaw-drive', {
      mate: 'yaw',
      actuator: 'base',
      shaft: 'base',
      supports: ['base'],
      output: 'finger',
    });
    arm.physicalUseCase('split-pose-grasp', {
      stableParts: ['base'],
      loads: [{ part: 'finger', force: [0, 0, -1] }],
      contacts: [
        { a: 'finger.a', b: 'base.target-a', normal: [1, 0, 0], friction: 0.5 },
        { a: 'finger.b', b: 'base.target-b', normal: [0, 1, 0], friction: 0.5 },
      ],
      actuatorLimits: [{ mate: 'yaw', maxTorqueNmm: 10 }],
      criteria: { maxSlipMm: 0.1 },
    });

    const result = await reviewPhysicalUseCasesWithReachability(arm, {
      includeReachability: true,
      includeStatics: true,
      reachabilitySamplesPerMate: 2,
    });
    const diagnostic = result.diagnostics.find((candidate) =>
      String(candidate.code) === 'assembly.physical-use-case.simultaneous-contacts-unreachable');

    expect(diagnostic).toMatchObject({
      code: 'assembly.physical-use-case.simultaneous-contacts-unreachable',
      severity: 'error',
      useCaseName: 'split-pose-grasp',
      toleranceMm: 0.1,
      bestMaxDistanceMm: expect.any(Number),
      contactDistances: expect.arrayContaining([
        expect.objectContaining({ contactA: 'finger.a', contactB: 'base.target-a' }),
        expect.objectContaining({ contactA: 'finger.b', contactB: 'base.target-b' }),
      ]),
    });
    expect(result.diagnostics.some((candidate) =>
      candidate.code.startsWith('assembly.physical-use-case.static-'))).toBe(false);
    expect(result.staticCertificates).toEqual([]);
  });

  it('maps insufficient pose-bound actuator torque into a blocking review diagnostic', async () => {
    const result = await reviewPhysicalUseCasesWithReachability(makeStaticReviewRig(25), {
      includeReachability: true,
      includeStatics: true,
      reachabilitySamplesPerMate: 1,
    });

    expect(result.staticCertificates).toEqual([]);
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'assembly.physical-use-case.static-actuator-torque-insufficient',
        useCaseName: 'hold-object',
        actuatorTorques: expect.arrayContaining([
          expect.objectContaining({ mateName: 'left-curl', maxTorqueNmm: 25 }),
          expect.objectContaining({ mateName: 'right-curl', maxTorqueNmm: 25 }),
        ]),
      }),
    ]));
  });

  it('returns a pose-bound static certificate when wrench and actuator limits pass', async () => {
    const result = await reviewPhysicalUseCasesWithReachability(makeStaticReviewRig(35), {
      includeReachability: true,
      includeStatics: true,
      reachabilitySamplesPerMate: 1,
    });

    expect(result.diagnostics.some((diagnostic) =>
      diagnostic.code.startsWith('assembly.physical-use-case.static-'))).toBe(false);
    expect(result.staticCertificates).toEqual([
      expect.objectContaining({
        useCaseName: 'hold-object',
        heldPart: 'held',
        actuatorTorques: expect.arrayContaining([
          expect.objectContaining({ mateName: 'left-curl', requiredTorqueNmm: expect.any(Number) }),
          expect.objectContaining({ mateName: 'right-curl', requiredTorqueNmm: expect.any(Number) }),
        ]),
      }),
    ]);
  });

  it('returns reaction and structural certificates for a rated joint.clevis load path', async () => {
    const result = await reviewPhysicalUseCasesWithReachability(
      makeStructurallyRatedClevisRig(),
      { includeJointStructure: true, reachabilitySamplesPerMate: 3 },
    );

    expect(result.staticCertificates).toHaveLength(1);
    expect(result.jointReactionCertificates).toEqual([
      expect.objectContaining({
        useCaseName: 'hold-load',
        reactions: [expect.objectContaining({
          mateName: 'hinge',
          resultantForceN: expect.closeTo(10, 6),
          resultantMomentNmm: expect.closeTo(500, 4),
        })],
      }),
    ]);
    expect(result.jointStructuralCertificates).toEqual([
      expect.objectContaining({
        useCaseName: 'hold-load',
        joints: [expect.objectContaining({
          mateName: 'hinge',
          envelope: expect.objectContaining({ status: 'pass' }),
          structure: expect.objectContaining({ status: 'pass', minSafetyFactor: 2 }),
        })],
      }),
    ]);
    expect(result.diagnostics.filter((diagnostic) =>
      diagnostic.code.includes('joint-reaction') ||
      diagnostic.code.includes('joint-capacity') ||
      diagnostic.code.includes('joint-structure'))).toEqual([]);
  });

  it('blocks undeclared/exceeded envelopes and missing structural evidence', async () => {
    const undeclared = await reviewPhysicalUseCasesWithReachability(
      makeStructurallyRatedClevisRig({ includeEnvelope: false }),
      { includeJointStructure: true, reachabilitySamplesPerMate: 3 },
    );
    const exceeded = await reviewPhysicalUseCasesWithReachability(
      makeStructurallyRatedClevisRig({ envelopeForceN: 5 }),
      { includeJointStructure: true, reachabilitySamplesPerMate: 3 },
    );
    const missingStructure = await reviewPhysicalUseCasesWithReachability(
      makeStructurallyRatedClevisRig({ includeStructure: false }),
      { includeJointStructure: true, reachabilitySamplesPerMate: 3 },
    );

    expect(undeclared.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'assembly.physical-use-case.joint-capacity-undeclared', mateName: 'hinge' }),
    ]));
    expect(exceeded.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'assembly.physical-use-case.joint-capacity-exceeded', mateName: 'hinge' }),
    ]));
    expect(missingStructure.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'assembly.physical-use-case.joint-structure-input-incomplete', mateName: 'hinge' }),
    ]));
  });

  it('maps a geometry-derived safety-factor failure into a blocker with evidence', async () => {
    const result = await reviewPhysicalUseCasesWithReachability(
      makeStructurallyRatedClevisRig({ minJointSafetyFactor: 1000 }),
      { includeJointStructure: true, reachabilitySamplesPerMate: 3 },
    );

    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'assembly.physical-use-case.joint-structure-insufficient',
        mateName: 'hinge',
      }),
    ]));
    expect(result.jointStructuralCertificates[0].joints[0].structure).toMatchObject({
      status: 'failed',
      minSafetyFactor: 1000,
    });
  });
});
