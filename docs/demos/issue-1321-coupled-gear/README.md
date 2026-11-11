# Coupled 12:48 gear physics regression

This bundle captures the authored `motor-input` → `rear-drive-output`
coupling with ratio `-12/48`. It evaluates the `.kcad.ts` source, exports the
native MJCF equality constraint, records the authored negative-limit, zero,
and positive-limit poses, then runs the native drop-on-release path through
MuJoCo from rest.

## Demo and evidence

- [5-second MP4 replay](coupled-gear-release.mp4)
- [Authored CAD fixture](coupled-gear.kcad.ts)
- [Capture script and settings](capture-demo.ts)
- [Authored coupled pose sweep](authored-pose-sweep.csv)
- [Native release integration samples](release-samples.csv)
- [Machine-readable evidence](evidence.json)

Recreate the bundle from the repository root with:

```sh
npx tsx docs/demos/issue-1321-coupled-gear/capture-demo.ts
```

The authored fixture contains real involute 12-tooth and 48-tooth spur gears,
with a 1 mm module, 30 mm center distance, and 0.15 mm backlash. The capture
uses a 1 ms MuJoCo timestep for 0.5 seconds (500 observations), records input,
driven output, and `output − (−0.25 × input)` residual in degrees during both
the authored pose sweep and release integration. The sweep covers input
limits −720° and +720°, with a zero crossing, and applies a 5° residual gate.
The native release trace starts at rest and therefore remains at zero; the
video plots the authored coupled pose sweep separately so it does not imply
that the gravity release drives the gears. Its declared `gear-pair` path lets
the native release model use the ideal scalar equality and exclude contact
between the paired gear bodies, avoiding a second, conflicting tooth-contact
constraint.

This verifies the local replay and native scalar coupling constraint for the
authored gear geometry. The fixture omits bearing shoulders, so separate
joint-continuity or geometry findings can remain in the evidence. It does not
calculate tooth-contact forces or certify the rest of the mechanism, deployed
behavior, or hardware acceptance.
