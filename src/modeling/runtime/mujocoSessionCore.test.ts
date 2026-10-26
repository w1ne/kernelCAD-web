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
});
