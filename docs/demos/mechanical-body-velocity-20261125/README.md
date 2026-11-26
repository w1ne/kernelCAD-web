# Body velocity observation — 2026-11-25

This local demo reads actual body-origin linear and angular velocities from MuJoCo 3.9.0. Each pose and velocity belongs to one completed integration frontier. Reading the observations does not advance the simulation.

The existing torque/contact probe supplies the motion: zero wheel torque for 100 ms, followed by 0.01 N·m per wheel for 50 ms. It uses the unchanged assumed rigid-body model. Firmware is not connected in this probe. This evidence does not establish balance, motor calibration, deployed behavior or hardware acceptance.

- [Video](demo.mp4)
- [Final observed frame](poster.png)
- [Measured trace and source hashes](trace.json)
- [Capture verification](verification.json)
- [Executable capture](capture-demo.ts)
- [Unchanged MJCF input](../../../examples/physics/two-wheel-mechanical-port.xml)
- [API and model assumptions](../../guide/mechanical-session-ports.md)

## Observed result

At 150 ms, the chassis body origin moves at approximately `[0.215738, 0, 0.001400]` m/s in world axes. Chassis angular velocity is approximately `[0, -3.564606, 0]` rad/s. Each wheel body's world angular velocity is approximately `[0, 6.699674, 0]` rad/s. Wheel joint velocity relative to the chassis is a separate quantity; this body accessor does not replace shaft feedback.

An independent real-WASM test uses a body rotated 90 degrees about X, a hinge 100 mm from its origin, and a COM offset by `[30,20,10]` mm. It checks the body origin's analytic circular-path velocity, world angular direction, immutable returned snapshots, a static body, and unchanged time/pose after repeated reads. This distinguishes the regular body origin from the COM and world axes from local axes.

## Reproduce

```sh
npx tsx docs/demos/mechanical-body-velocity-20261125/capture-demo.ts
npx vitest run src/modeling/runtime/mujocoMechanicalPorts.test.ts \
  src/modeling/runtime/mujocoSessionCore.test.ts \
  src/modeling/runtime/mujocoSession.smoke.test.ts
```

The model integrates 150 steps at 1 ms and records every fifth step. Each sample appears twice at 20 fps, with one-second opening/final holds. The side projection, velocity arrow, and numeric rows use the recorded solver values. Playback supplies no feedback to the physics.

MuJoCo `mj_objectVelocity` returns angular then linear velocity. The accessor requests the regular body origin with `mjOBJ_XBODY` and world axes with `flg_local=0`. The wrapper copies the six values before releasing its output buffer. The installed 3.9.0 bindings expose `DoubleBuffer(6)` and `GetView()`; the capture and tests exercise those exact bindings.
