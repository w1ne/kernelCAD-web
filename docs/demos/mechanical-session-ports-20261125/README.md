# Mechanical session port demo — 2026-11-25

This local demo runs the real MuJoCo WASM engine. A declared 50 ms wheel-torque input moves a free chassis through wheel/ground contact. The accelerometer and gyro come from the moving IMU site.

The model uses explicit assumed rigid bodies, masses, inertias and friction. It does not run MCU firmware or a calibrated motor. The measured replay does not prove balance or real-hardware behavior.

- [Video](demo.mp4)
- [Poster at 150 ms](poster.png)
- [Final frame](final-frame.png)
- [Complete trace and hashes](trace.json)
- [Capture settings and verification](verification.json)
- [Executable capture source](capture-demo.ts)
- [MJCF input](../../../examples/physics/two-wheel-mechanical-port.xml)
- [API and assumption guide](../../guide/mechanical-session-ports.md)

## Reproduce

```sh
npx tsx docs/demos/mechanical-session-ports-20261125/capture-demo.ts
```

Each signed test integrates 300 steps at 1 ms. It applies zero torque for 100 ms, ±0.01 N·m per wheel for 50 ms, then zero torque. Frames sample every five integration steps. Playback repeats each measured frame twice at 20 fps, so the simulation segment runs 20 times slower than simulated time. The opening and final frames each have a one-second hold.

The side view projects the actual rigid-body transforms. The wheel pair overlaps in this projection. The pink point follows the authored IMU site. Values and the gyro trace come from the same solver sample.

The exact engine WASM, MJCF and session-source SHA-256 hashes are in the evidence files. The retained verification record distinguishes generated media from visual review.
