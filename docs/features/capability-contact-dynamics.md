# Contact dynamics verification

Run a bounded force or torque study with the existing `verify` tool. KernelCAD exports the authored assembly to MuJoCo, applies constant joint effort, and measures contact loads and penetration at time zero and every integration step. The contact study runs in a fresh session without position or velocity actuators.

## Choose the right check

`verify({ check: 'physics', code })` runs the existing mechanism hold/release checks. Add `dynamics` to run a separate forward contact study. A contact result describes the named pairs and limits in that study; it does not replace geometry, assembly, stress or hardware checks.

```ts
verify({
  check: 'physics',
  code,
  dynamics: {
    steps: 1000,
    dt_seconds: 0.0005,
    efforts: { drive: 0.01 },
    contact_model: {
      friction: [1, 0.005, 0.0001],
      solref: [0.002, 1],
      solimp: [0.99, 0.999, 0.001],
    },
    pairs: [{
      bodies: ['driver', 'follower'],
      min_episodes: 1,
      max_penetration_mm: 1,
      max_normal_force_n: 5,
    }],
  },
});
```

`efforts` uses CAD mate names. Revolute effort is torque in N·m; prismatic effort is force in N. Omitted joints receive zero externally applied effort. Passive springs, damping, gravity and contact still act. The current study accepts revolute, prismatic and fastened mates, 1–20,000 steps, and timesteps greater than zero and no greater than 0.01 s.

## Author collision geometry and physical inputs

Declare explicit convex collision pieces on each observed part with `part.collision([...])`. For a toothed wheel, preserve the gaps with separate convex pieces. A single nonconvex mesh becomes a convex hull for collision purposes. Model entry and exit pallets as separately named parts fastened to their anchor when their contacts must be distinguished.

Use measured part mass or density and joint damping where available. Results list parts whose density was assumed. Missing collision pieces, corrected substitute inertia, unsupported mates, hidden actuators and invalid numerical inputs return an error. The displayed solid alone does not establish contact-model fidelity.

The optional contact model records a sliding/torsional/rolling friction tuple, contact time constant and damping ratio, and impedance bounds/transition width. The current native export uses `condim=3`: normal contact and sliding friction in the tangent plane. Torsional and rolling coefficients remain in the configuration but are inactive. Active friction has a MuJoCo engine minimum of `1e-5`; a zero sliding coefficient therefore does not create an exactly frictionless contact.

Defaults are simulation assumptions. The first two impedance values must be ordered within the inclusive range `[0.0001, 0.9999]`, with a positive transition width, so accepted values are not silently clamped by the engine. The positive contact time constant must be at least twice the selected timestep. Compare the same duration at a smaller timestep before accepting a force estimate.

## Read the report

Each requested pair reports load-bearing contact episodes, loaded integration steps, first and last contact time, peak summed normal force, maximum signed-distance penetration and whether its limits passed. `initialJoints` and `finalJoints` report scalar joint positions, velocities and externally applied efforts in SI units.

Set `min_normal_force_n` to exclude small solver contacts. Set `max_normal_force_n` to enforce a load limit. Add `sequence: { order: [0, 1], min_cycles: 1 }` to require alternating ordered onsets of the two named pairs. The `contactSequence` result records complete sequences and unexpected or simultaneous onsets. Contact chatter is not an oscillation count; period, recoil, energy balance and long-duration operation require their own acceptance criteria.

## Deadbeat escapement example

The [source, settings, measured reports and replay](https://github.com/w1ne/kernelCAD-web/tree/develop/docs/demos/contact-dynamics-20261126) use conjugate tooth and pallet profiles from a prescribed-motion escapement illustration. The dynamics fixture exposes independent wheel and anchor pivots and labels its physical assumptions.

The original illustration does not specify a physical oscillator. Removing prescribed motion makes that absence testable: a wheel can lock at the entry pallet without reaching the exit pallet. The retained failed study is evidence about that model and its inputs. A smooth kinematic animation alone cannot establish dynamic operation.

The [mechanical session guide](https://github.com/w1ne/kernelCAD-web/blob/develop/docs/guide/mechanical-session-ports.md) documents native TypeScript effort and observation ports. Native contact material is fixed at compilation; the tool applies `contact_model` before constructing its study session.

## References

- [MuJoCo contact modeling](https://mujoco.readthedocs.io/en/stable/modeling.html)
- [MuJoCo contact-force API](https://mujoco.readthedocs.io/en/stable/APIreference/APIfunctions.html#mj-contactforce)
- [MuJoCo contact dimensions](https://mujoco.readthedocs.io/en/stable/XMLreference.html#body-geom-condim)
- [MuJoCo engine constants](https://mujoco.readthedocs.io/en/stable/APIreference/APIglobals.html#engine-constants)
