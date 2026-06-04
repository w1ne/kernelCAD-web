// src/modeling/runtime/mujocoSession.test.ts
//
// Unit tests for the MujocoSession wrapper. Confirms:
//   1. Loading from MJCF works.
//   2. setPose + inverseDynamics returns finite torques on a stable
//      mechanism.
//   3. step() simulates forward and produces xpos updates.

import { describe, it, expect } from 'vitest';
import { loadMujocoSession } from './mujocoSession';

const PENDULUM_MJCF = `<?xml version="1.0" ?>
<mujoco model="pendulum">
  <option gravity="0 0 -9.81"/>
  <worldbody>
    <body name="arm" pos="0 0 0">
      <joint name="hinge" type="hinge" axis="0 1 0" pos="0 0 0"/>
      <geom type="box" pos="0.5 0 0" size="0.5 0.05 0.05" mass="1"/>
    </body>
  </worldbody>
</mujoco>
`;

describe('MujocoSession', () => {
    it('reports the pendulum gravitational torque at qpos=0 (~4.905 N*m)', async () => {
        const sess = await loadMujocoSession(
            PENDULUM_MJCF,
            ['arm'],
            [{ mjcfName: 'hinge', mateName: 'hinge' }],
        );
        try {
            expect(sess.nq).toBe(1);
            expect(sess.nbody).toBe(2); // worldbody + arm
            sess.setPose([0]);
            const { qfrc, allFinite } = sess.inverseDynamics();
            expect(allFinite).toBe(true);
            expect(qfrc.length).toBe(1);
            expect(Math.abs(Math.abs(qfrc[0]) - 4.905)).toBeLessThan(0.05);
        } finally {
            sess.dispose();
        }
    });

    it('step() advances dynamics and the pendulum tip drops below horizontal', async () => {
        const sess = await loadMujocoSession(
            PENDULUM_MJCF,
            ['arm'],
            [{ mjcfName: 'hinge', mateName: 'hinge' }],
        );
        try {
            sess.setPose([0]);
            const xposRest = sess.xposNow();
            const armRest = xposRest.get('arm')!;
            sess.step(0.5, 0.001);
            const final = sess.xposNow();
            const armFinal = final.get('arm')!;
            // Pendulum body's pos attribute is (0,0,0) — the rotation is
            // about the hinge at the origin, so the body's xpos *origin*
            // doesn't move (only its orientation changes). What changes
            // is the qpos (joint angle). Verify that.
            const qposFinal = sess.getQpos();
            expect(Math.abs(qposFinal[0])).toBeGreaterThan(0.5); // > ~30 deg drop
            // Sanity: the arm body's origin remains at the hinge.
            expect(Math.hypot(armFinal[0] - armRest[0], armFinal[1] - armRest[1], armFinal[2] - armRest[2])).toBeLessThan(1e-6);
        } finally {
            sess.dispose();
        }
    });

    it('dispose() makes further calls throw', async () => {
        const sess = await loadMujocoSession(
            PENDULUM_MJCF,
            ['arm'],
            [{ mjcfName: 'hinge', mateName: 'hinge' }],
        );
        sess.dispose();
        expect(() => sess.setPose([0])).toThrow(/dispose/);
    });
});
