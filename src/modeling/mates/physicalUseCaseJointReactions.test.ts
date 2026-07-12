// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { createApi } from '../api';
import type { Assembly } from '../capture/assembly';
import { CaptureSession } from '../capture/captureSession';
import type { NumericPoses } from '../capture/forwardKinematics';
import type { Shape } from '../capture/proxy';
import type { Vec3 } from '../../shared/intent/types';
import {
  makePhysicalUseCaseRecord,
  type PhysicalUseCaseRecord,
} from './physicalUseCase';
import {
  reviewPhysicalUseCaseJointReactions,
  type PhysicalUseCaseJointReactionEvidence,
} from './physicalUseCaseJointReactions';
import type {
  PhysicalUseCaseStaticCertificate,
  PhysicalUseCaseStaticContactForce,
} from './physicalUseCaseStatics';
import { solveMates } from './solver';

interface ContactSpec {
  readonly mechanismRef: string;
  readonly mechanismPart: string;
  readonly pointWorldMm: Vec3;
  readonly forceOnHeldWorldN: Vec3;
}

interface ReactionFixture {
  readonly arm: Assembly;
  readonly useCase: PhysicalUseCaseRecord;
  readonly certificate: PhysicalUseCaseStaticCertificate;
}

function makeHarness(name: string) {
  const session = new CaptureSession();
  const kcad = createApi({ session });
  return { arm: kcad.assembly(name), kcad };
}

function addHeldPart(arm: Assembly, shape: Shape, points: readonly Vec3[]): void {
  const held = arm
    .part('held', shape, { role: 'contact-target' })
    .connector('load', {
      type: 'frame',
      origin: { kind: 'vec3', value: [0, 0, 0] },
    });
  points.forEach((point, index) => {
    held.connector(`contact-${index}`, {
      type: 'frame',
      origin: { kind: 'vec3', value: copy(point) },
    });
  });
}

function certifyFixture(
  arm: Assembly,
  name: string,
  stableParts: readonly string[],
  poses: NumericPoses,
  contacts: readonly ContactSpec[],
): Omit<ReactionFixture, 'arm'> {
  const contactForce = contacts.reduce((sum, contact) => add(sum, contact.forceOnHeldWorldN), zero());
  const contactMoment = contacts.reduce(
    (sum, contact) => add(sum, cross(contact.pointWorldMm, contact.forceOnHeldWorldN)),
    zero(),
  );
  const actuatorLimits = arm.__mates()
    .filter((mate) => mate.type !== 'fastened')
    .map((mate) => ({ mate: mate.name, maxTorqueNmm: 1_000_000 }));
  const contactForces: PhysicalUseCaseStaticContactForce[] = contacts.map((contact, index) => {
    const magnitude = norm(contact.forceOnHeldWorldN);
    return {
      contactA: contact.mechanismRef,
      contactB: `held.contact-${index}`,
      pointWorldMm: copy(contact.pointWorldMm),
      mechanismPart: contact.mechanismPart,
      forceOnHeldWorldN: copy(contact.forceOnHeldWorldN),
      normalForceN: magnitude,
      tangentialForceN: 0,
      normalCapacityN: magnitude * 2,
      friction: 0.5,
    };
  });
  const useCase = makePhysicalUseCaseRecord(name, {
    stableParts,
    loads: [{
      part: 'held',
      at: 'held.load',
      force: scale(contactForce, -1),
      torque: scale(contactMoment, -1),
    }],
    contacts: contacts.map((contact, index) => ({
      a: contact.mechanismRef,
      b: `held.contact-${index}`,
      normal: scale(unit(contact.forceOnHeldWorldN), -1),
      friction: 0.5,
      normalForceN: norm(contact.forceOnHeldWorldN) * 2,
    })),
    actuatorLimits,
    criteria: {
      maxForceResidualN: 0.01,
      maxTorqueResidualNmm: 0.1,
    },
  });
  return {
    useCase,
    certificate: {
      useCaseName: name,
      heldPart: 'held',
      poses: { ...poses },
      forceResidualN: 0,
      torqueResidualNmm: 0,
      contactForces,
      actuatorTorques: actuatorLimits.map((limit) => ({
        mateName: limit.mate,
        requiredTorqueNmm: 0,
        maxTorqueNmm: limit.maxTorqueNmm,
      })),
    },
  };
}

async function makeSerialFixture(opts: {
  readonly poses?: NumericPoses;
  readonly coupled?: boolean;
  readonly heldFirst?: boolean;
  readonly contactSeparationMm?: number;
} = {}): Promise<ReactionFixture> {
  const { arm, kcad } = makeHarness('serial reaction rig');
  if (opts.heldFirst === true) {
    addHeldPart(arm, kcad.box(5, 5, 5), [[150, 0, 0]]);
  }
  arm
    .part('base', kcad.box(10, 10, 10))
    .connector('proximal', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 0] },
      axis: [0, 0, 1],
    });
  arm
    .part('link-1', kcad.box(100, 5, 5))
    .connector('in', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 0] },
      axis: [0, 0, 1],
    })
    .connector('distal', {
      type: 'axis',
      origin: { kind: 'vec3', value: [100, 0, 0] },
      axis: [0, 0, 1],
    });
  arm
    .part('link-2', kcad.box(50, 5, 5))
    .connector('in', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 0] },
      axis: [0, 0, 1],
    })
    .connector('tip', {
      type: 'frame',
      origin: { kind: 'vec3', value: [50, 0, 0] },
    });
  arm.mate('proximal', 'base.proximal', 'link-1.in', 'revolute', { limitsDeg: [-180, 180] });
  arm.mate('distal', 'link-1.distal', 'link-2.in', 'revolute', { limitsDeg: [-180, 180] });
  if (opts.coupled === true) {
    arm.coupleMates('distal', { source: 'proximal', ratio: -1 });
  }

  const poses = opts.poses ?? {};
  let pointWorldMm: Vec3;
  if (opts.heldFirst === true) {
    pointWorldMm = [150, 0, 0];
  } else {
    const solved = await solveMates(arm, poses);
    if (solved.status !== 'solved') throw new Error(`serial fixture solve returned ${solved.status}`);
    const mechanismPoint = [...solved.poses.get('link-2')!.point([50, 0, 0])] as Vec3;
    const separationMm = opts.contactSeparationMm ?? 0;
    pointWorldMm = [
      mechanismPoint[0] + separationMm / 2,
      mechanismPoint[1],
      mechanismPoint[2],
    ];
    addHeldPart(arm, kcad.box(5, 5, 5), [[
      mechanismPoint[0] + separationMm,
      mechanismPoint[1],
      mechanismPoint[2],
    ]]);
  }
  return {
    arm,
    ...certifyFixture(arm, 'serial-load', ['base'], poses, [{
      mechanismRef: 'link-2.tip',
      mechanismPart: 'link-2',
      pointWorldMm,
      forceOnHeldWorldN: [0, 10, 0],
    }]),
  };
}

function makeBranchFixture(): ReactionFixture {
  const { arm, kcad } = makeHarness('branch reaction rig');
  arm
    .part('base', kcad.box(10, 10, 10))
    .connector('root', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 0] },
      axis: [0, 0, 1],
    })
    .connector('direct-contact', {
      type: 'frame',
      origin: { kind: 'vec3', value: [0, 0, 0] },
    });
  arm
    .part('hub', kcad.box(50, 5, 5))
    .connector('in', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 0] },
      axis: [0, 0, 1],
    })
    .connector('branch-a', {
      type: 'axis',
      origin: { kind: 'vec3', value: [50, 0, 0] },
      axis: [0, 0, 1],
    })
    .connector('branch-b', {
      type: 'axis',
      origin: { kind: 'vec3', value: [50, 0, 0] },
      axis: [0, 0, 1],
    })
    .connector('idle-branch', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 50, 0] },
      axis: [0, 0, 1],
    });
  for (const name of ['branch-a', 'branch-b']) {
    arm
      .part(name, kcad.box(50, 5, 5))
      .connector('in', {
        type: 'axis',
        origin: { kind: 'vec3', value: [0, 0, 0] },
        axis: [0, 0, 1],
      })
      .connector('tip', {
        type: 'frame',
        origin: { kind: 'vec3', value: [50, 0, 0] },
      });
  }
  arm
    .part('idle-branch', kcad.box(20, 5, 5))
    .connector('in', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 0] },
      axis: [0, 0, 1],
    });
  arm.mate('proximal', 'base.root', 'hub.in', 'revolute');
  arm.mate('branch-a-joint', 'hub.branch-a', 'branch-a.in', 'revolute');
  arm.mate('branch-b-joint', 'hub.branch-b', 'branch-b.in', 'revolute');
  arm.mate('idle-joint', 'hub.idle-branch', 'idle-branch.in', 'revolute');
  const contacts: ContactSpec[] = [
    {
      mechanismRef: 'branch-a.tip',
      mechanismPart: 'branch-a',
      pointWorldMm: [100, 0, 0],
      forceOnHeldWorldN: [0, 10, 0],
    },
    {
      mechanismRef: 'branch-b.tip',
      mechanismPart: 'branch-b',
      pointWorldMm: [100, 0, 0],
      forceOnHeldWorldN: [0, -10, 0],
    },
    {
      mechanismRef: 'base.direct-contact',
      mechanismPart: 'base',
      pointWorldMm: [0, 0, 0],
      forceOnHeldWorldN: [10, 0, 0],
    },
  ];
  addHeldPart(arm, kcad.box(5, 5, 5), contacts.map((contact) => contact.pointWorldMm));
  return { arm, ...certifyFixture(arm, 'branch-load', ['base'], {}, contacts) };
}

function makeFastenedFixture(): ReactionFixture {
  const { arm, kcad } = makeHarness('fastened reaction rig');
  arm
    .part('base', kcad.box(10, 10, 10))
    .connector('hinge', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 0] },
      axis: [0, 0, 1],
    });
  arm
    .part('carrier', kcad.box(50, 5, 5))
    .connector('hinge', {
      type: 'axis',
      origin: { kind: 'vec3', value: [0, 0, 0] },
      axis: [0, 0, 1],
    })
    .connector('mount', {
      type: 'frame',
      origin: { kind: 'vec3', value: [50, 0, 0] },
    });
  arm
    .part('bracket', kcad.box(50, 5, 5))
    .connector('mount', {
      type: 'frame',
      origin: { kind: 'vec3', value: [0, 0, 0] },
    })
    .connector('tip', {
      type: 'frame',
      origin: { kind: 'vec3', value: [50, 0, 0] },
    });
  arm.mate('hinge', 'base.hinge', 'carrier.hinge', 'revolute');
  arm.mate('mount', 'carrier.mount', 'bracket.mount', 'fastened');
  const contacts: ContactSpec[] = [{
    mechanismRef: 'bracket.tip',
    mechanismPart: 'bracket',
    pointWorldMm: [100, 0, 0],
    forceOnHeldWorldN: [0, 10, 0],
  }];
  addHeldPart(arm, kcad.box(5, 5, 5), [contacts[0].pointWorldMm]);
  return { arm, ...certifyFixture(arm, 'fastened-load', ['base'], {}, contacts) };
}

function makeLoopFixture(): ReactionFixture {
  const { arm, kcad } = makeHarness('loop reaction rig');
  arm
    .part('base', kcad.box(10, 10, 10))
    .connector('to-a', axisAtOrigin())
    .connector('to-b', axisAtOrigin());
  arm
    .part('link-a', kcad.box(10, 5, 5))
    .connector('to-base', axisAtOrigin())
    .connector('to-b', axisAtOrigin());
  arm
    .part('link-b', kcad.box(50, 5, 5))
    .connector('to-a', axisAtOrigin())
    .connector('to-base', axisAtOrigin())
    .connector('tip', {
      type: 'frame',
      origin: { kind: 'vec3', value: [50, 0, 0] },
    });
  arm.mate('base-a', 'base.to-a', 'link-a.to-base', 'revolute');
  arm.mate('a-b', 'link-a.to-b', 'link-b.to-a', 'revolute');
  arm.mate('b-base', 'link-b.to-base', 'base.to-b', 'revolute');
  const contacts: ContactSpec[] = [{
    mechanismRef: 'link-b.tip',
    mechanismPart: 'link-b',
    pointWorldMm: [50, 0, 0],
    forceOnHeldWorldN: [0, 10, 0],
  }];
  addHeldPart(arm, kcad.box(5, 5, 5), [contacts[0].pointWorldMm]);
  return { arm, ...certifyFixture(arm, 'loop-load', ['base'], {}, contacts) };
}

function makeMultipleRootFixture(): ReactionFixture {
  const { arm, kcad } = makeHarness('multiple root reaction rig');
  arm.part('base-a', kcad.box(10, 10, 10)).connector('axis', axisAtOrigin());
  arm.part('base-b', kcad.box(10, 10, 10)).connector('axis', axisAtOrigin());
  arm
    .part('link', kcad.box(50, 5, 5))
    .connector('to-a', axisAtOrigin())
    .connector('to-b', axisAtOrigin())
    .connector('tip', {
      type: 'frame',
      origin: { kind: 'vec3', value: [50, 0, 0] },
    });
  arm.mate('from-a', 'base-a.axis', 'link.to-a', 'revolute');
  arm.mate('from-b', 'base-b.axis', 'link.to-b', 'revolute');
  const contacts: ContactSpec[] = [{
    mechanismRef: 'link.tip',
    mechanismPart: 'link',
    pointWorldMm: [50, 0, 0],
    forceOnHeldWorldN: [0, 10, 0],
  }];
  addHeldPart(arm, kcad.box(5, 5, 5), [contacts[0].pointWorldMm]);
  return { arm, ...certifyFixture(arm, 'two-root-load', ['base-a', 'base-b'], {}, contacts) };
}

function makeMissingRootFixture(): ReactionFixture {
  const { arm, kcad } = makeHarness('missing root reaction rig');
  arm.part('support', kcad.box(10, 10, 10)).connector('axis', axisAtOrigin());
  arm
    .part('link', kcad.box(50, 5, 5))
    .connector('axis', axisAtOrigin())
    .connector('tip', {
      type: 'frame',
      origin: { kind: 'vec3', value: [50, 0, 0] },
    });
  arm.mate('hinge', 'support.axis', 'link.axis', 'revolute');
  const contacts: ContactSpec[] = [{
    mechanismRef: 'link.tip',
    mechanismPart: 'link',
    pointWorldMm: [50, 0, 0],
    forceOnHeldWorldN: [0, 10, 0],
  }];
  addHeldPart(arm, kcad.box(5, 5, 5), [contacts[0].pointWorldMm]);
  return { arm, ...certifyFixture(arm, 'missing-root-load', [], {}, contacts) };
}

function axisAtOrigin() {
  return {
    type: 'axis' as const,
    origin: { kind: 'vec3' as const, value: [0, 0, 0] as Vec3 },
    axis: [0, 0, 1] as Vec3,
  };
}

function reactionByMate(
  reactions: readonly PhysicalUseCaseJointReactionEvidence[],
  mateName: string,
): PhysicalUseCaseJointReactionEvidence {
  const reaction = reactions.find((candidate) => candidate.mateName === mateName);
  if (reaction === undefined) throw new Error(`missing reaction for ${mateName}`);
  return reaction;
}

function expectVecClose(actual: Vec3, expected: Vec3): void {
  expected.forEach((value, index) => expect(actual[index]).toBeCloseTo(value, 8));
}

function zero(): Vec3 {
  return [0, 0, 0];
}

function copy(value: Vec3): Vec3 {
  return [value[0], value[1], value[2]];
}

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale(value: Vec3, scalar: number): Vec3 {
  return [value[0] * scalar, value[1] * scalar, value[2] * scalar];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function norm(value: Vec3): number {
  return Math.hypot(value[0], value[1], value[2]);
}

function unit(value: Vec3): Vec3 {
  return scale(value, 1 / norm(value));
}

describe('physical use case joint reactions', () => {
  it('reports 500 Nmm and 1500 Nmm reactions for a serial 10 N chain', async () => {
    const { arm, useCase, certificate } = await makeSerialFixture();

    const result = await reviewPhysicalUseCaseJointReactions(arm, useCase, certificate);

    expect(result.issues).toEqual([]);
    expect(result.certificates).toHaveLength(1);
    const distal = reactionByMate(result.certificates[0].reactions, 'distal');
    const proximal = reactionByMate(result.certificates[0].reactions, 'proximal');
    expect(distal).toMatchObject({
      parentPart: 'link-1',
      childPart: 'link-2',
      resultantForceN: 10,
      resultantMomentNmm: 500,
      radialForceN: 10,
      axisMomentNmm: 500,
      bendingMomentNmm: 0,
    });
    expect(proximal.resultantMomentNmm).toBeCloseTo(1500, 8);
    expectVecClose(distal.pointWorldMm, [100, 0, 0]);
    expectVecClose(distal.axisWorld, [0, 0, 1]);
    expectVecClose(distal.forceWorldN, certificate.contactForces[0].forceOnHeldWorldN);
    expectVecClose(distal.momentWorldNmm, [0, 0, 500]);
  });

  it('solves the loaded mechanism when the disconnected held part was declared first', async () => {
    const { arm, useCase, certificate } = await makeSerialFixture({ heldFirst: true });
    expect(arm.__parts()[0].name).toBe('held');

    const result = await reviewPhysicalUseCaseJointReactions(arm, useCase, certificate);

    expect(result.issues).toEqual([]);
    const distal = reactionByMate(result.certificates[0].reactions, 'distal');
    const proximal = reactionByMate(result.certificates[0].reactions, 'proximal');
    expectVecClose(distal.pointWorldMm, [100, 0, 0]);
    expect(distal.resultantMomentNmm).toBeCloseTo(500, 8);
    expect(proximal.resultantMomentNmm).toBeCloseTo(1500, 8);
  });

  it('solves the exact coupled certificate pose before measuring moment arms', async () => {
    const rest = await makeSerialFixture();
    const posed = await makeSerialFixture({ poses: { proximal: 90 }, coupled: true });

    const restResult = await reviewPhysicalUseCaseJointReactions(rest.arm, rest.useCase, rest.certificate);
    const posedResult = await reviewPhysicalUseCaseJointReactions(posed.arm, posed.useCase, posed.certificate);

    expect(restResult.issues).toEqual([]);
    expect(posedResult.issues).toEqual([]);
    expect(posed.certificate.poses).toEqual({ proximal: 90 });
    expect(posedResult.certificates[0].poses).toEqual({ proximal: 90, distal: -90 });
    expectVecClose(posed.certificate.contactForces[0].pointWorldMm, [50, 100, 0]);
    expect(reactionByMate(restResult.certificates[0].reactions, 'proximal').resultantMomentNmm)
      .toBeCloseTo(1500, 8);
    expect(reactionByMate(posedResult.certificates[0].reactions, 'proximal').resultantMomentNmm)
      .toBeCloseTo(500, 8);
    const posedDistal = reactionByMate(posedResult.certificates[0].reactions, 'distal');
    expect(posedDistal.resultantMomentNmm).toBeCloseTo(500, 8);
    expectVecClose(posedDistal.pointWorldMm, [0, 100, 0]);
  });

  it('rejects an explicit driven pose that contradicts its coupling equation', async () => {
    const { arm, useCase, certificate } = await makeSerialFixture({
      poses: { proximal: 90, distal: 0 },
      coupled: true,
    });

    const result = await reviewPhysicalUseCaseJointReactions(arm, useCase, certificate);

    expect(result.certificates).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        kind: 'joint-reaction-input-incomplete',
        message: expect.stringMatching(/coupl|driven|contradict/i),
      }),
    ]);
  });

  it('combines branch wrenches vectorially so opposing loads cancel upstream', async () => {
    const { arm, useCase, certificate } = makeBranchFixture();

    const result = await reviewPhysicalUseCaseJointReactions(arm, useCase, certificate);

    expect(result.issues).toEqual([]);
    const reactions = result.certificates[0].reactions;
    expect(reactionByMate(reactions, 'branch-a-joint').resultantForceN).toBeCloseTo(10, 8);
    expect(reactionByMate(reactions, 'branch-b-joint').resultantForceN).toBeCloseTo(10, 8);
    expect(reactionByMate(reactions, 'proximal').resultantForceN).toBeCloseTo(0, 8);
    expect(reactionByMate(reactions, 'proximal').resultantMomentNmm).toBeCloseTo(0, 8);
    expect(reactions.some((reaction) => reaction.mateName === 'idle-joint')).toBe(false);
  });

  it('collapses fastened parts into one rigid loaded group', async () => {
    const { arm, useCase, certificate } = makeFastenedFixture();

    const result = await reviewPhysicalUseCaseJointReactions(arm, useCase, certificate);

    expect(result.issues).toEqual([]);
    expect(result.certificates[0].reactions).toHaveLength(1);
    expect(result.certificates[0].reactions[0]).toMatchObject({
      mateName: 'hinge',
      parentPart: 'base',
      childPart: 'carrier',
      resultantForceN: 10,
      resultantMomentNmm: 1000,
    });
  });

  it('rejects an articulated loop instead of selecting a spanning tree', async () => {
    const { arm, useCase, certificate } = makeLoopFixture();

    const result = await reviewPhysicalUseCaseJointReactions(arm, useCase, certificate);

    expect(result.certificates).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        kind: 'joint-reaction-indeterminate',
        useCaseName: 'loop-load',
        message: expect.stringMatching(/tree|loop/i),
      }),
    ]);
  });

  it('rejects two stable rigid groups in one loaded component', async () => {
    const { arm, useCase, certificate } = makeMultipleRootFixture();

    const result = await reviewPhysicalUseCaseJointReactions(arm, useCase, certificate);

    expect(result.certificates).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        kind: 'joint-reaction-indeterminate',
        useCaseName: 'two-root-load',
        message: expect.stringMatching(/two|2|multiple/i),
      }),
    ]);
  });

  it('rejects a loaded component without a stable root', async () => {
    const { arm, useCase, certificate } = makeMissingRootFixture();

    const result = await reviewPhysicalUseCaseJointReactions(arm, useCase, certificate);

    expect(result.certificates).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        kind: 'joint-reaction-indeterminate',
        useCaseName: 'missing-root-load',
        message: expect.stringMatching(/stable root/i),
      }),
    ]);
  });

  it('rejects malformed and mismatched static certificate data', async () => {
    const { arm, useCase, certificate } = await makeSerialFixture();
    const mismatched = { ...certificate, useCaseName: 'other-use-case' };
    const malformed: PhysicalUseCaseStaticCertificate = {
      ...certificate,
      contactForces: [{
        ...certificate.contactForces[0],
        pointWorldMm: [Number.NaN, 0, 0],
      }],
    };

    const mismatchResult = await reviewPhysicalUseCaseJointReactions(arm, useCase, mismatched);
    const malformedResult = await reviewPhysicalUseCaseJointReactions(arm, useCase, malformed);

    for (const result of [mismatchResult, malformedResult]) {
      expect(result.certificates).toEqual([]);
      expect(result.issues).toEqual([
        expect.objectContaining({
          kind: 'joint-reaction-input-incomplete',
          useCaseName: 'serial-load',
        }),
      ]);
    }
  });

  it('rejects a finite certified contact point that is not the solved endpoint midpoint', async () => {
    const { arm, useCase, certificate } = await makeSerialFixture();
    const wrongPoint: PhysicalUseCaseStaticCertificate = {
      ...certificate,
      contactForces: [{
        ...certificate.contactForces[0],
        pointWorldMm: [149, 0, 0],
      }],
    };

    const result = await reviewPhysicalUseCaseJointReactions(arm, useCase, wrongPoint);

    expect(result.certificates).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        kind: 'joint-reaction-input-incomplete',
        message: expect.stringMatching(/point|midpoint/i),
      }),
    ]);
  });

  it('rejects solved contact endpoints farther apart than maxSlipMm despite a valid midpoint', async () => {
    const fixture = await makeSerialFixture({ contactSeparationMm: 2 });
    const useCase: PhysicalUseCaseRecord = {
      ...fixture.useCase,
      criteria: { ...fixture.useCase.criteria, maxSlipMm: 0.1 },
    };

    const result = await reviewPhysicalUseCaseJointReactions(
      fixture.arm,
      useCase,
      fixture.certificate,
    );

    expect(result.certificates).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        kind: 'joint-reaction-input-incomplete',
        message: expect.stringMatching(/distance|slip/i),
      }),
    ]);
  });

  it('rejects a finite certified force that no longer balances the declared held load', async () => {
    const { arm, useCase, certificate } = await makeSerialFixture();
    const wrongForce: PhysicalUseCaseStaticCertificate = {
      ...certificate,
      contactForces: [{
        ...certificate.contactForces[0],
        forceOnHeldWorldN: [0, 9, 0],
        normalForceN: 9,
      }],
    };

    const result = await reviewPhysicalUseCaseJointReactions(arm, useCase, wrongForce);

    expect(result.certificates).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        kind: 'joint-reaction-input-incomplete',
        message: expect.stringMatching(/equilibrium|residual/i),
      }),
    ]);
  });

  it('rejects stale residual fields even when they remain below the use-case limits', async () => {
    const { arm, useCase, certificate } = await makeSerialFixture();
    const staleResiduals: PhysicalUseCaseStaticCertificate = {
      ...certificate,
      forceResidualN: 0.005,
      torqueResidualNmm: 0.05,
    };

    const result = await reviewPhysicalUseCaseJointReactions(arm, useCase, staleResiduals);

    expect(result.certificates).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        kind: 'joint-reaction-input-incomplete',
        message: expect.stringMatching(/residual.*match|match.*residual/i),
      }),
    ]);
  });
});
