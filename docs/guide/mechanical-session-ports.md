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
    const bodyVelocities = session.bodyVelocitiesNow();
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
| `bodyVelocitiesNow()` | Copied world-axis linear velocity (m/s) at each regular body origin and angular velocity (rad/s), at the same completed frontier. |
| `xposNow()` | World body positions in m. |
| `timeSeconds` | Elapsed simulation time in s. |

Body velocities use the same regular body origin as `bodyPosesNow`, not the inertial centre of mass. A rotated body with an offset COM can have a different linear velocity at those two points. The accessor does not advance time or refresh dynamics. Call `forward()` once before the initial observation and use `stepFixed` to refresh every later frontier.

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

[Body-origin velocity observation demo and independent frame test](../demos/mechanical-body-velocity-20261125/README.md).

## Contact-driven forward verification

Use the existing verification tool with an explicit forward-dynamics study:

```ts
verify({
  check: 'physics',
  code,
  dynamics: {
    steps: 1000,
    dt_seconds: 0.0005,
    efforts: { drive: 0.01 }, // CAD mate name; hinge N·m, slide N
    contact_model: {
      friction: [1, 0.005, 0.0001],
      solref: [0.002, 1],
      solimp: [0.99, 0.999, 0.001],
    },
    pairs: [{ bodies: ['driver', 'follower'], min_episodes: 1, max_penetration_mm: 1 }],
  },
});
```

This mode is separate from the existing hold/release and swept-collision checks.
It exports the authored assembly to MJCF, applies constant effort, and evaluates
the native solver at the initial and every completed integration frontier.
It returns initial/final scalar coordinates and velocities, load-bearing
contact episodes, first/last contact times, maximum summed normal load,
and maximum signed-distance penetration for each requested pair. Specify
`max_normal_force_n` to enforce a load limit, or `min_normal_force_n` to filter small
contact events. An optional `sequence: { order: [0, 1], min_cycles: 1 }` requires
ordered onsets of those contact pairs; `contactSequence` reports completed
cycles and unexpected/simultaneous onsets. Contact chatter is not proof of
an escapement cycle. Use an appropriate normal-force threshold and validate
timing, displacement, recoil and energy balance separately.

Contacting bodies must declare their convex collision pieces with
`part.collision([...])`. Declare one piece per tooth/pallet where needed;
a whole nonconvex mesh has a convex-hull contact approximation. The tool
reports missing collision pieces or substituted inertia as errors. It reports
assumed-density parts and the contact model parameters. Use measured density,
mass, damping and friction when validating a real mechanism. The current
input permits scalar revolute/prismatic and fixed joints, up to 20,000
steps at a timestep no greater than 10 ms. Choose the timestep for the
mechanism and compare with a smaller timestep before accepting results.
The default friction and compliant contact parameters are modeling
assumptions, not measured surface properties. Results are rigid-body model
evidence, not FEA contact-stress, wear or hardware acceptance.

The native contact-force API is MuJoCo's `mj_contactForce`, in the contact
frame; `MujocoSession.contactWrenchesNow()` exposes its normal/tangential
forces and torque. See
[MuJoCo contact computation](https://mujoco.readthedocs.io/en/stable/computation/)
and [mj_contactForce](https://mujoco.readthedocs.io/en/stable/APIreference/APIfunctions.html#mj-contactforce).

The tool input uses snake_case; native TypeScript runtime inputs use camelCase.
`ContactDynamicsStudyInput.contactModel` is applied during CAD-to-MJCF compilation.
`runContactDynamics` accepts an already compiled, actuator-free session and does
not replace its contact material. The requested timestep is set before the
initial load calculation as well as every integration step.
