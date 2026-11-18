// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { beforeAll, describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { checkMechanismTruth } from '../../../src/modeling/runtime/mechanismTruth';
import { loadMujocoSession } from '../../../src/modeling/runtime/mujocoSession';

const DEG_TO_RAD = Math.PI / 180;

// Two mirrored fingers on a palm. The source hinge has a non-zero authored
// pose, as a gripper script with `pose: gripDeg` has.
function posedGripper(opts: { chained: boolean }) {
  const kcad = createModelingApi({ session: new CaptureSession() });
  const arm = kcad.assembly('posed-coupled-gripper');
  const palm = arm.part('palm', kcad.box(20, 60, 20, true));
  const axis = (y: number) => ({ type: 'axis' as const, origin: { kind: 'vec3' as const, value: [20, y, 0] as [number, number, number] }, axis: [0, 0, 1] as [number, number, number] });
  palm.connector('left', axis(20));
  palm.connector('right', axis(-20));
  palm.connector('follower', axis(0));
  for (const name of ['left-finger', 'right-finger', 'follower-finger']) {
    arm.part(name, kcad.box(30, 5, 5, true).translate(15, 0, 0))
      .connector('hinge', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
  }
  arm.mate('left-curl', 'palm.left', 'left-finger.hinge', 'revolute', { pose: 10, limitsDeg: [0, 30] });
  arm.mate('right-curl', 'palm.right', 'right-finger.hinge', 'revolute', { limitsDeg: [-30, 5] });
  arm.mate('follower-curl', 'palm.follower', 'follower-finger.hinge', 'revolute', { limitsDeg: [-60, 60] });
  // The chained coupling is declared before the coupling that drives its source.
  if (opts.chained) arm.coupleMates('follower-curl', { source: 'right-curl', ratio: 2 });
  arm.coupleMates('right-curl', { source: 'left-curl', ratio: -1, offset: opts.chained ? 5 : 0 });
  return arm;
}

async function releaseFromRest(opts: { chained: boolean }) {
  const setPoses: number[][] = [];
  let jointNames: string[] = [];
  const result = await checkMechanismTruth(posedGripper(opts), {
    physicsCheck: true,
    physicsBudget: Number.POSITIVE_INFINITY,
    physicsSessionFactory: async (xml, bodies, joints) => {
      jointNames = joints.map((joint) => joint.mateName);
      const session = await loadMujocoSession(xml, bodies, joints);
      const setPose = session.setPose.bind(session);
      session.setPose = (qpos) => {
        setPoses.push([...qpos]);
        setPose(qpos);
      };
      return session;
    },
  });
  expect(result.coverage?.physics, JSON.stringify(result.failures)).toBe(true);
  expect(setPoses.length).toBeGreaterThan(0);
  const poseDeg = (qpos: readonly number[], mate: string) => qpos[jointNames.indexOf(mate)]! / DEG_TO_RAD;
  return { result, setPoses, poseDeg };
}

describe('native physics poses for a coupled mate whose source has an authored pose', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('starts both coupled coordinates from the same rest coordinate', async () => {
    const { result, setPoses, poseDeg } = await releaseFromRest({ chained: false });

    // Every pose handed to the solver, rest and swept, satisfies right = -1 × left.
    for (const qpos of setPoses) {
      expect(poseDeg(qpos, 'right-curl') + poseDeg(qpos, 'left-curl')).toBeCloseTo(0, 9);
    }
    expect(poseDeg(setPoses[0]!, 'left-curl')).toBeCloseTo(0, 9);
    expect(poseDeg(setPoses[0]!, 'right-curl')).toBeCloseTo(0, 9);
    expect(result.failures.filter((failure) => failure.code === 'mechanism.coupling-residual')).toEqual([]);
  }, 60_000);

  it('applies offsets through a coupling chain declared out of order', async () => {
    const { result, setPoses, poseDeg } = await releaseFromRest({ chained: true });

    const rest = setPoses[0]!;
    expect(poseDeg(rest, 'left-curl')).toBeCloseTo(0, 9);
    expect(poseDeg(rest, 'right-curl')).toBeCloseTo(5, 9);
    expect(poseDeg(rest, 'follower-curl')).toBeCloseTo(10, 9);
    expect(result.failures.filter((failure) => failure.code === 'mechanism.coupling-residual')).toEqual([]);
  }, 60_000);
});
