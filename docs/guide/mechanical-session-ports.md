# Mechanical session ports

The host-independent MuJoCo session accepts generalized effort and returns solver-derived shaft and sensor state. The Node loader is `src/modeling/runtime/mujocoSession.ts`; browser hosts inject their initialized module through `createMujocoSession` in `mujocoSessionCore.ts`. Loading is asynchronous. Stepping and port access are synchronous.

This is a source-level API. The current npm package does not export the session as a supported package subpath.

## Use a simulated-clock frontier

```ts
const session = await loadMujocoSession(mjcfXml, bodyOrder, jointOrder);
try {
    session.assertExternalJointOwnership(['left_wheel', 'right_wheel']);
    session.forward(); // establish initial contacts and site sensor readings

    session.setJointEfforts({ left_wheel: 0.01, right_wheel: 0.01 });
    session.stepFixed(1, 0.001);

    const joints = session.scalarJointStatesNow();
    const sensors = session.sensorReadingsNow();
    const poses = session.bodyPosesNow();
    const simulatedTime = session.timeSeconds;
} finally {
    session.dispose();
}
```

`stepFixed(count, dtSeconds)` advances exactly the requested positive integer number of integration steps. It does not round a duration. It refreshes derived body poses, contacts and sensors after integration, so they correspond to the completed frontier. Callers must bound count and timestep for their computation and stability budget; this low-level API does not choose those limits.

The existing duration-based `step` API retains its previous behavior. Use `stepFixed` for synchronized external coupling. Rendering time is not a simulation clock.

Any MuJoCo warning, non-finite or engine-invalid state, or unexpected clock reset faults a `stepFixed` session. The failed session rejects subsequent reads and steps. Dispose and load a fresh session to restart. A failed step is not rolled back and must not be published as a completed frontier. `setPose` does not reset the full dynamic state.

## Effort and ownership

`setJointEfforts` takes compiled MJCF scalar joint names. Hinge effort is N·m; slide effort is N. It validates the entire map before writing and replaces the complete `qfrc_applied` vector. Omitted coordinates receive zero. An empty map clears applied effort; it does not zero velocities.

Before using a shaft owned by an external motor model, call `assertExternalJointOwnership` with every such joint. It rejects unknown or repeated joints, direct MJCF actuators on an owned joint, and indirect actuator transmissions whose ownership cannot be proven disjoint. Position actuators must not also drive externally owned coordinates. This check is distinct from validating a motor's gear ratio, losses or electrical parameters.

The external electrical model must use the solver's shaft position and velocity without integrating another mechanical shaft. Applied torque must describe the same output shaft and sign convention. If electrical substeps resolve PWM, an interval torque impulse or average is needed; the last instantaneous sample alone does not represent the interval.

## Read state and sensors

| Method | Output |
| --- | --- |
| `scalarJointStatesNow()` | Named hinge/slide position, velocity, applied effort, and independent `qposAdr` / `dofAdr`. |
| `sensorReadingsNow()` | Copied named sensor arrays and compiled MuJoCo sensor type. |
| `bodyPosesNow()` | World-from-body column-major transforms; translation is mm. |
| `xposNow()` | World body positions in m. |
| `timeSeconds` | Elapsed simulation time in s. |

Hinge position/velocity units are rad and rad/s. Slide units are m and m/s. Free and ball joints are omitted from the scalar port. Their position and velocity addresses do not have the same layout.

An MJCF accelerometer outputs site-local specific force in m/s². It reads approximately zero during free fall and approximately 9.81 m/s² along the supported vertical axis at rest in this fixture. A gyro outputs site-local angular velocity in rad/s. Device adapters must explicitly convert to their device input units and use the authored site rotation. Accelerometer tilt alone includes motion acceleration and need not equal geometric body pitch.

## Reproducible example and evidence

[The example MJCF](../../examples/physics/two-wheel-mechanical-port.xml) contains three free rigid bodies, wheel/ground contact, and a named IMU site. Its declared test assumptions are:

| Quantity | Assumption |
| --- | --- |
| Chassis proxy | 90 × 100 × 80 mm uniform box, mass 0.400 kg. |
| Chassis COM | 55 mm above the axle, centered laterally and longitudinally. |
| Wheels | 65 mm diameter, 24 mm wide, 0.035 kg each; uniform-cylinder inertia. |
| Wheel track | 134 mm, tire centers at y = ±67 mm. |
| Shaft body origins | y = ±56.3 mm; each wheel COM/geom is 10.7 mm outward along the same axis. |
| Contact friction | Sliding 0.8, torsional 0.005, rolling 0.0001. |
| Ground / gravity | Level plane; 9.81 m/s² downward. |
| Axes | World +X forward, +Y axle, +Z up; positive shaft rotation about +Y. |
| IMU mount | Local x = body Y, y = −body X, z = body Z; site [0,25,19.5] mm from the axle frame, using a board-envelope center assumption. |
| Initial clearance | Axle at 35 mm, 2.5 mm above tire contact. |
| Drive | Direct wheel-axle torque; no gearbox, motor calibration or controller. |

The masses, COM, inertias and friction are assumptions. They are not measurements of a purchased robot. The fixture demonstrates physical integration, gravity, contact, reaction torque and motion-derived sensors. It does not establish MCU coupling, balance, stability, battery behavior or real-hardware acceptance.

Run the real WASM tests:

```sh
npx vitest run src/modeling/runtime/mujocoMechanicalPorts.test.ts \
  src/modeling/runtime/mujocoSessionCore.test.ts \
  src/modeling/runtime/mujocoSession.smoke.test.ts
```

[Measured trace and local demo](../demos/mechanical-session-ports-20261125/README.md).
