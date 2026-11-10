// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { describe, expect, it, vi } from 'vitest';
import { createMujocoSession } from './mujocoSessionCore';

describe('createMujocoSession', () => {
  it('compiles MJCF through an injected module and disposes the owned handles', async () => {
    const model = {
      nq: 0,
      nv: 0,
      nbody: 1,
      njnt: 0,
      ntendon: 0,
      opt: { timestep: 0.001 },
      delete: vi.fn(),
    };
    const deleteData = vi.fn();
    class FakeData {
      qpos = new Float64Array();
      qvel = new Float64Array();
      qacc = new Float64Array();
      xpos = new Float64Array();
      qfrc_inverse = new Float64Array();
      delete = deleteData;
    }
    const fromXml = vi.fn(() => model);
    const forward = vi.fn();
    const mujoco = {
      MjModel: { from_xml_string: fromXml },
      MjData: FakeData,
      mj_forward: forward,
    };

    const joints = [{ mjcfName: 'hinge', mateName: 'wrist' }];
    const session = await createMujocoSession(mujoco, '<mujoco/>', ['palm'], joints);

    expect(fromXml).toHaveBeenCalledWith('<mujoco/>');
    expect(session.bodies).toEqual(['palm']);
    expect(session.joints).toEqual(joints);
    session.forward();
    expect(forward).toHaveBeenCalledWith(model, expect.any(FakeData));

    session.dispose();
    session.dispose();
    expect(deleteData).toHaveBeenCalledTimes(1);
    expect(model.delete).toHaveBeenCalledTimes(1);
  });

  it('packs each named body world frame into a millimetre placement a part can use', async () => {
    // World body at index 0, then "arm". xpos is metres. xmat is the
    // body-to-world rotation, row-major. A 90° rotation about Z sends
    // local +X to world +Y.
    const xpos = new Float64Array([0, 0, 0, 0.1, 0.02, -0.3]);
    const xmat = new Float64Array(18);
    xmat.set([1, 0, 0, 0, 1, 0, 0, 0, 1], 0);
    xmat.set([0, -1, 0, 1, 0, 0, 0, 0, 1], 9);
    const model = {
      nq: 1,
      nv: 1,
      nbody: 2,
      njnt: 1,
      ntendon: 0,
      opt: { timestep: 0.002 },
      delete: vi.fn(),
    };
    class FakeData {
      qpos = new Float64Array([0.4]);
      qvel = new Float64Array(1);
      qacc = new Float64Array(1);
      xpos = xpos;
      xmat = xmat;
      qfrc_inverse = new Float64Array(1);
      delete = vi.fn();
    }
    const step = vi.fn();
    const session = await createMujocoSession(
      { MjModel: { from_xml_string: () => model }, MjData: FakeData, mj_step: step, mj_forward: vi.fn() },
      '<mujoco/>',
      ['arm'],
      [{ mjcfName: 'hinge', mateName: 'elbow' }],
    );

    const pose = session.bodyPosesNow().get('arm');
    expect(pose?.matrix).toEqual([
      0, 1, 0, 0,
      -1, 0, 0, 0,
      0, 0, 1, 0,
      100, 20, -300, 1,
    ]);

    xpos[3] = 0.25;
    const stepped = session.step(0.002, 0.002);
    expect(step).toHaveBeenCalledOnce();
    expect(stepped.bodyPoses.get('arm')?.matrix[12]).toBe(250);
    expect(stepped.xpos.get('arm')).toEqual([0.25, 0.02, -0.3]);
    session.dispose();
    expect(() => session.bodyPosesNow()).toThrow(/dispose/);
  });
});
