// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { beforeAll, describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../src/modeling/api';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { checkMechanismTruth } from '../../../src/modeling/runtime/mechanismTruth';
import { loadMujocoSession } from '../../../src/modeling/runtime/mujocoSession';

function mixedAssembly() {
  const kcad = createModelingApi({ session: new CaptureSession() });
  const arm = kcad.assembly('ball-before-coupled-hinges');
  const base = arm.part('base', kcad.box(20, 20, 20, true));
  base.connector('ball', { type: 'ball', origin: { kind: 'vec3', value: [-80, 0, 0] } });
  base.connector('source', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
  base.connector('driven', { type: 'axis', origin: { kind: 'vec3', value: [80, 0, 0] }, axis: [0, 0, 1] });
  arm.part('ball-body', kcad.box(10, 10, 10, true))
    .connector('center', { type: 'ball', origin: { kind: 'vec3', value: [0, 0, 0] } });
  arm.part('source-body', kcad.box(10, 10, 10, true))
    .connector('center', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
  arm.part('driven-body', kcad.box(10, 10, 10, true))
    .connector('center', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
  arm.mate('ball', 'base.ball', 'ball-body.center', 'ball');
  arm.mate('source', 'base.source', 'source-body.center', 'revolute');
  arm.mate('driven', 'base.driven', 'driven-body.center', 'revolute');
  arm.coupleMates('driven', { source: 'source', ratio: -0.25, offset: 30 });
  return arm;
}

describe('native coupling coordinates after a quaternion ball joint', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it.each([false, true])('uses scalar qpos offsets and detects a perturbed observation (%s)', async (perturb) => {
    const setPoses: number[][] = [];
    let observations = 0;
    const result = await checkMechanismTruth(mixedAssembly(), {
      physicsCheck: true,
      physicsBudget: Number.POSITIVE_INFINITY,
      physicsSessionFactory: async (xml, bodies, joints) => {
        expect(joints.map(joint => joint.mateName)).toEqual(['ball', 'source', 'driven']);
        const session = await loadMujocoSession(xml, bodies, joints);
        expect(session.nq).toBe(6); // quaternion, source angle, driven angle
        const setPose = session.setPose.bind(session);
        session.setPose = (qpos) => {
          setPoses.push([...qpos]);
          setPose(qpos);
        };
        const step = session.step.bind(session);
        session.step = (seconds, dt, observe) => step(seconds, dt, (qpos, index) => {
          observations++;
          const measured = [...qpos];
          if (perturb) measured[5] = measured[5]! + Math.PI / 9;
          observe?.(measured, index);
        });
        return session;

      },
    });

    expect(result.coverage?.physics, JSON.stringify(result.failures)).toBe(true);
    expect(setPoses[0]).toHaveLength(6);
    expect(setPoses[0]!.slice(0, 4)).toEqual([1, 0, 0, 0]);
    expect(setPoses[0]![4]).toBeCloseTo(0, 9);
    expect(setPoses[0]![5]).toBeCloseTo(Math.PI / 6, 9);
    expect(observations).toBe(500);
    const residuals = result.failures.filter(failure => failure.code === 'mechanism.coupling-residual');
    expect(residuals).toHaveLength(perturb ? 1 : 0);
    if (perturb) expect(residuals[0]!.message).toContain("'source' → 'driven'");
  }, 60_000);
});
