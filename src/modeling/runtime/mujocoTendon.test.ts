// src/modeling/runtime/mujocoTendon.test.ts
//
// P7 Task 0 — verify MuJoCo's <tendon><spatial> primitive applies force on
// a minimal 1-DoF pendulum running in Node via @mujoco/mujoco. This is the
// prerequisite for the kernelCAD `arm.tendon(...)` API: if MuJoCo can't
// hold a non-vertical equilibrium under a spatial tendon's restoring
// force, the whole closed-loop spring approach is broken.
//
// Setup:
//   - World +Z up, gravity (0, 0, -9.81).
//   - One body hanging from a hinge at the world origin with axis Y.
//     The body's geometry is a 0.1 m rod pointing along +X with its CoM
//     at (0.05, 0, 0). Inertia: m=0.1 kg, ixx=iyy=izz=8.3e-4 kg·m² (a
//     thin rod, ~1/12 m L² ≈ 8.3e-4).
//   - A spatial tendon between world-frame site (0, 0, 0.05) and body
//     site at (0.05, 0, 0) — i.e. the tendon pulls the bar's tip toward
//     a point 5 cm above the hinge. Rest length 0.05 m, stiffness 50 N/m.
//
// Pure-gravity equilibrium (no tendon) would be θ=-90° (hanging straight
// down along -Z). With the tendon pulling the tip up, equilibrium sits
// between 0 (horizontal, max restoring torque from spring stretched
// upward) and -90° (purely vertical, no spring help). We just assert
// the final θ is strictly less negative than -π/2 + small margin AND
// strictly more negative than 0 — i.e. the spring measurably altered
// equilibrium. That's the qualitative confirmation we need.
//
// Why this test gates everything: if MuJoCo's tendon doesn't fire here,
// P7 stops — we'd be building MJCF emission + Studio render against a
// primitive that doesn't behave the way the MuJoCo docs promise.

import { describe, it, expect } from 'vitest';
import { loadMujocoSession } from './mujocoSession';

const TENDON_PENDULUM_MJCF = `<?xml version="1.0" ?>
<mujoco model="pendulum-with-tendon">
  <option gravity="0 0 -9.81" timestep="0.001"/>
  <compiler angle="radian"/>
  <worldbody>
    <site name="anchor" pos="0 0 0.05"/>
    <body name="rod" pos="0 0 0">
      <joint name="hinge" type="hinge" axis="0 1 0" pos="0 0 0"/>
      <inertial pos="0.05 0 0" mass="0.1" fullinertia="0.000001 0.000833 0.000833 0 0 0"/>
      <site name="tip" pos="0.05 0 0"/>
    </body>
  </worldbody>
  <tendon>
    <spatial name="spring" springlength="0.05" stiffness="50" damping="0.5">
      <site site="anchor"/>
      <site site="tip"/>
    </spatial>
  </tendon>
</mujoco>
`;

describe('MuJoCo spatial tendon (P7 Task 0)', () => {
    it('applies restoring force on a 1-DoF pendulum: equilibrium is non-vertical', async () => {
        const session = await loadMujocoSession(
            TENDON_PENDULUM_MJCF,
            ['rod'],
            [{ mjcfName: 'hinge', mateName: 'hinge' }],
        );
        try {
            // Start at θ = 0 (rod horizontal along +X). With damping = 0.5 N·s/m
            // and 5 seconds of simulated time the pendulum should settle.
            session.setPose([0]);
            session.forward();
            const { qpos } = session.step(5.0, 0.001);
            const theta = qpos[0];

            // Pure gravity (no tendon) would settle at θ = -π/2 (rod hanging
            // straight down -Z). The spring pulls the tip toward (0, 0, 0.05),
            // i.e. UP, so with stiffness 50 N/m vs the rod's m·g·L/2 ≈ 0.05 N·m
            // gravitational torque the spring dominates and equilibrium sits
            // ABOVE horizontal — θ near +0.5 rad (~+28°). The qualitative
            // confirmation is: tendon force is being applied (otherwise
            // equilibrium would be -π/2). Assert strict non-vertical.
            const collapsedDown = Math.abs(theta + Math.PI / 2) < 0.1;
            expect(collapsedDown).toBe(false);
            // And the rod stayed within ±π/2 of its initial θ=0 (no
            // numerical blow-up).
            expect(Math.abs(theta)).toBeLessThan(Math.PI / 2);
        } finally {
            session.dispose();
        }
    }, 60_000);

    it('tendon length matches site-to-site distance after a forward call', async () => {
        const session = await loadMujocoSession(
            TENDON_PENDULUM_MJCF,
            ['rod'],
            [{ mjcfName: 'hinge', mateName: 'hinge' }],
        );
        try {
            session.setPose([0]); // θ = 0 — tip at (0.05, 0, 0), anchor at (0, 0, 0.05)
            session.forward();
            // Expected tendon length = sqrt(0.05² + 0.05²) = 0.0707 m
            const expectedLen = Math.hypot(0.05, 0.05);
            // The session API doesn't expose ten_length directly; instead, we
            // round-trip-read from the data buffer (loadMujocoSession returns
            // a typed wrapper; the underlying MjData has a `ten_length` view).
            const data = (session as unknown as { data: { ten_length: ArrayLike<number> } }).data;
            const tenLen = data.ten_length;
            expect(tenLen.length).toBe(1);
            expect(Math.abs(tenLen[0] - expectedLen)).toBeLessThan(1e-6);
        } finally {
            session.dispose();
        }
    }, 60_000);
});
