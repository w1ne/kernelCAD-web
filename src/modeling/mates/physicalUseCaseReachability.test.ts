// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../capture/captureSession';
import { createApi } from '../api';
import { makePhysicalUseCaseRecord } from './physicalUseCase';
import {
  assessPhysicalUseCaseReachability,
  buildTargetedReachabilitySamples,
  reviewPhysicalUseCaseReachability,
} from './physicalUseCaseReachability';

function makeArm() {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  return { arm: kcad.assembly('reachability'), kcad };
}

function makeRotatingFingerRig(targetB: readonly [number, number, number]) {
  const { arm, kcad } = makeArm();
  arm
    .part('base', kcad.box(10, 10, 10))
    .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
    .connector('target-a', { type: 'frame', origin: { kind: 'vec3', value: [10, 0, 0] } })
    .connector('target-b', { type: 'frame', origin: { kind: 'vec3', value: targetB } });
  arm
    .part('finger', kcad.box(10, 2, 2))
    .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
    .connector('a', { type: 'frame', origin: { kind: 'vec3', value: [10, 0, 0] } })
    .connector('b', { type: 'frame', origin: { kind: 'vec3', value: [10, 0, 0] } });
  arm.mate('yaw', 'base.axis', 'finger.axis', 'revolute', { limitsDeg: [0, 90] });
  return arm;
}

describe('physical use case reachability', () => {
  it('distributes capped actuator samples across mixed actuator positions', () => {
    const { arm, kcad } = makeArm();
    arm
      .part('base', kcad.box(10, 10, 10))
      .connector('j0', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
      .connector('j1', { type: 'axis', origin: { kind: 'vec3', value: [0, 20, 0] }, axis: [0, 0, 1] })
      .connector('j2', { type: 'axis', origin: { kind: 'vec3', value: [0, 40, 0] }, axis: [0, 0, 1] })
      .connector('j3', { type: 'axis', origin: { kind: 'vec3', value: [0, 60, 0] }, axis: [0, 0, 1] })
      .connector('driven', { type: 'axis', origin: { kind: 'vec3', value: [0, 80, 0] }, axis: [0, 0, 1] });
    for (let i = 0; i < 4; i++) {
      arm
        .part(`link${i}`, kcad.box(5, 5, 5))
        .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, i * 20, 0] }, axis: [0, 0, 1] });
      arm.mate(`j${i}`, `base.j${i}`, `link${i}.axis`, 'revolute', { limitsDeg: [0, 90] });
    }
    arm
      .part('driven-link', kcad.box(5, 5, 5))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 80, 0] }, axis: [0, 0, 1] });
    arm.mate('driven', 'base.driven', 'driven-link.axis', 'revolute', { limitsDeg: [-45, 2] });
    arm.coupleMates('driven', { source: 'j0', ratio: -0.5, offset: 2 });
    const useCase = makePhysicalUseCaseRecord('multi-axis', {
      actuatorLimits: [
        { mate: 'j0', maxTorqueNmm: 10 },
        { mate: 'j1', maxTorqueNmm: 10 },
        { mate: 'j2', maxTorqueNmm: 10 },
        { mate: 'j3', maxTorqueNmm: 10 },
      ],
    });

    const samples = buildTargetedReachabilitySamples(arm, useCase, {
      samplesPerMate: 3,
      maxCombinations: 64,
    });

    expect(samples).toHaveLength(64);
    expect(samples.some((sample) =>
      sample.j0 === 0 && sample.j1 === 90 && sample.j2 === 0 && sample.j3 === 0 && sample.driven === 2,
    )).toBe(true);
    expect(samples.some((sample) => sample.j0 !== sample.j1)).toBe(true);
    expect(samples.every((sample) => sample.driven === 2 - 0.5 * sample.j0)).toBe(true);
  });

  it('expands declared mate couplings in targeted actuator samples', () => {
    const { arm, kcad } = makeArm();
    arm
      .part('base', kcad.box(10, 10, 10))
      .connector('drive', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] })
      .connector('curl', { type: 'axis', origin: { kind: 'vec3', value: [0, 20, 0] }, axis: [0, 0, 1] });
    arm
      .part('driver', kcad.box(5, 5, 5))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('finger', kcad.box(5, 5, 5))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 20, 0] }, axis: [0, 0, 1] });
    arm.mate('drive', 'base.drive', 'driver.axis', 'revolute', { limitsDeg: [0, 90] });
    arm.mate('curl', 'base.curl', 'finger.axis', 'revolute', { limitsDeg: [-45, 0] });
    arm.coupleMates('curl', { source: 'drive', ratio: -0.5, offset: 2 });
    const useCase = makePhysicalUseCaseRecord('coupled-drive', {
      actuatorLimits: [{ mate: 'drive', maxTorqueNmm: 10 }],
    });

    const samples = buildTargetedReachabilitySamples(arm, useCase, { samplesPerMate: 3 });

    expect(samples).toEqual([
      { drive: 0, curl: 2 },
      { drive: 45, curl: -20.5 },
      { drive: 90, curl: -43 },
    ]);
  });

  it('rejects contacts that are reachable only at different actuator poses', async () => {
    const arm = makeRotatingFingerRig([0, 10, 0]);

    const useCase = makePhysicalUseCaseRecord('split-pose-grasp', {
      contacts: [
        { a: 'finger.a', b: 'base.target-a', normal: [1, 0, 0], friction: 0.5 },
        { a: 'finger.b', b: 'base.target-b', normal: [0, 1, 0], friction: 0.5 },
      ],
      actuatorLimits: [{ mate: 'yaw', maxTorqueNmm: 10 }],
      criteria: { maxSlipMm: 0.1 },
    });

    const issues = await reviewPhysicalUseCaseReachability(arm, useCase, { samplesPerMate: 2 });

    expect(issues).toHaveLength(1);
    const issue = issues[0];
    if (!('kind' in issue)) throw new Error('expected simultaneous-contact reachability issue');
    expect(issue).toMatchObject({
      kind: 'simultaneous-contacts-unreachable',
      useCaseName: 'split-pose-grasp',
      toleranceMm: 0.1,
    });
    expect(issue.bestMaxDistanceMm).toBeCloseTo(Math.sqrt(200));
    expect(issue.contactDistances).toHaveLength(2);
    expect(issue.contactDistances[0]).toMatchObject({
      contactA: 'finger.a',
      contactB: 'base.target-a',
      distanceMm: 0,
    });
    expect(issue.contactDistances[1]).toMatchObject({
      contactA: 'finger.b',
      contactB: 'base.target-b',
    });
    expect(issue.contactDistances[1].distanceMm).toBeCloseTo(Math.sqrt(200));
  });

  it('accepts multiple contacts satisfied by one actuator pose', async () => {
    const arm = makeRotatingFingerRig([10, 0, 0]);
    const useCase = makePhysicalUseCaseRecord('common-pose-grasp', {
      contacts: [
        { a: 'finger.a', b: 'base.target-a', normal: [1, 0, 0], friction: 0.5 },
        { a: 'finger.b', b: 'base.target-b', normal: [1, 0, 0], friction: 0.5 },
      ],
      actuatorLimits: [{ mate: 'yaw', maxTorqueNmm: 10 }],
      criteria: { maxSlipMm: 0.1 },
    });

    const assessment = await assessPhysicalUseCaseReachability(arm, useCase, { samplesPerMate: 2 });

    expect(assessment.findings).toEqual([]);
    expect(assessment.samples).toHaveLength(2);
    expect(assessment.samples.map((sample) => sample.poses.yaw)).toEqual([0, 90]);
    expect(assessment.samples.every((sample) => sample.complete)).toBe(true);
    expect(assessment.commonPoseSamples).toHaveLength(1);
    expect(assessment.commonPoseSamples[0].poses).toMatchObject({ yaw: 0 });
    expect(assessment.commonPoseSamples[0].contacts).toEqual([
      expect.objectContaining({
        contactA: 'finger.a',
        contactB: 'base.target-a',
        pointA: expect.any(Array),
        pointB: expect.any(Array),
        distanceMm: 0,
      }),
      expect.objectContaining({
        contactA: 'finger.b',
        contactB: 'base.target-b',
        pointA: expect.any(Array),
        pointB: expect.any(Array),
        distanceMm: 0,
      }),
    ]);
  });

  it('prefers a specific unreachable contact over an aggregate issue', async () => {
    const arm = makeRotatingFingerRig([100, 100, 0]);
    const useCase = makePhysicalUseCaseRecord('partly-unreachable-grasp', {
      contacts: [
        { a: 'finger.a', b: 'base.target-a', normal: [1, 0, 0], friction: 0.5 },
        { a: 'finger.b', b: 'base.target-b', normal: [1, 0, 0], friction: 0.5 },
      ],
      actuatorLimits: [{ mate: 'yaw', maxTorqueNmm: 10 }],
      criteria: { maxSlipMm: 0.1 },
    });

    const issues = await reviewPhysicalUseCaseReachability(arm, useCase, { samplesPerMate: 2 });

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      useCaseName: 'partly-unreachable-grasp',
      contactA: 'finger.b',
      contactB: 'base.target-b',
      toleranceMm: 0.1,
      minDistanceMm: expect.any(Number),
    });
    expect('kind' in issues[0]).toBe(false);
  });

  it('does not emit a simultaneous-contact issue for one reachable contact', async () => {
    const arm = makeRotatingFingerRig([0, 10, 0]);
    const useCase = makePhysicalUseCaseRecord('single-contact-touch', {
      contacts: [
        { a: 'finger.a', b: 'base.target-a', normal: [1, 0, 0], friction: 0.5 },
      ],
      actuatorLimits: [{ mate: 'yaw', maxTorqueNmm: 10 }],
      criteria: { maxSlipMm: 0.1 },
    });

    const issues = await reviewPhysicalUseCaseReachability(arm, useCase, { samplesPerMate: 2 });

    expect(issues).toEqual([]);
  });

  it('keeps an unresolved connector as a per-contact reachability issue', async () => {
    const arm = makeRotatingFingerRig([0, 10, 0]);
    const useCase = makePhysicalUseCaseRecord('unresolved-contact', {
      contacts: [
        { a: 'finger.a', b: 'base.missing', normal: [1, 0, 0], friction: 0.5 },
      ],
      actuatorLimits: [{ mate: 'yaw', maxTorqueNmm: 10 }],
      criteria: { maxSlipMm: 0.1 },
    });

    const issues = await reviewPhysicalUseCaseReachability(arm, useCase, { samplesPerMate: 2 });

    expect(issues).toEqual([{
      useCaseName: 'unresolved-contact',
      contactA: 'finger.a',
      contactB: 'base.missing',
      toleranceMm: 0.1,
    }]);
  });

  it('leaves contacts uncheckable when every targeted sample has unusable solve status', async () => {
    const { arm, kcad } = makeArm();
    arm
      .part('a', kcad.box(1, 1, 1))
      .connector('p', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } })
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
    arm
      .part('b', kcad.box(1, 1, 1))
      .connector('q', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } })
      .connector('r', { type: 'frame', origin: { kind: 'vec3', value: [1, 0, 0] } });
    arm
      .part('c', kcad.box(1, 1, 1))
      .connector('s', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } })
      .connector('t', { type: 'frame', origin: { kind: 'vec3', value: [1, 0, 0] } });
    arm
      .part('driver', kcad.box(1, 1, 1))
      .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 10, 0] }, axis: [0, 0, 1] });

    arm.mate('m1', 'a.p', 'b.q', 'fastened');
    arm.mate('m2', 'b.r', 'c.s', 'fastened');
    arm.mate('m3', 'c.t', 'a.p', 'fastened');
    arm.mate('yaw', 'a.axis', 'driver.axis', 'revolute', { limitsDeg: [0, 90] });

    const useCase = makePhysicalUseCaseRecord('bad-loop', {
      contacts: [{ a: 'a.p', b: 'a.p', normal: [0, 0, 1], friction: 0.5 }],
      actuatorLimits: [{ mate: 'yaw', maxTorqueNmm: 10 }],
      criteria: { maxSlipMm: 0 },
    });

    const issues = await reviewPhysicalUseCaseReachability(arm, useCase);

    expect(issues).toEqual([
      {
        useCaseName: 'bad-loop',
        contactA: 'a.p',
        contactB: 'a.p',
        toleranceMm: 0,
      },
    ]);
  });
});
