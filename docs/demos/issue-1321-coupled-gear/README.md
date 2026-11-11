# Coupled 12:48 gear physics regression

This bundle captures a local replay of the authored `motor-input` →
`rear-drive-output` coupling with ratio `-12/48`. The replay evaluates the
`.kcad.ts` source, exports the native MJCF equality constraint, runs the
release path through MuJoCo, and records every integration observation.

## Demo and evidence

- [5-second MP4 replay](coupled-gear-release.mp4)
- [Authored CAD fixture](coupled-gear.kcad.ts)
- [Capture script and settings](capture-demo.ts)
- [Observed release samples](release-samples.csv)
- [Machine-readable evidence](evidence.json)

Recreate the bundle from the repository root with:

```sh
npx tsx docs/demos/issue-1321-coupled-gear/capture-demo.ts
```

The capture uses a 1 ms MuJoCo timestep for 0.5 seconds (500 observations),
records input, driven output, and `output − (−0.25 × input)` residual in
degrees, and applies the angular residual gate of 5°. The animation illustrates
the sampled release trajectory and its measured residual.

This verifies the local replay and native scalar coupling constraint. The
fixture uses intentionally overlapping offset boxes to excite release; the
other collision-related mechanism diagnostics are outside this ratio regression.
It does not model involute tooth contact, verify deployed behavior, or establish
hardware acceptance.
