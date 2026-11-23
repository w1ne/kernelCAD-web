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

## Mixed ball and scalar joint regression — 2026-11-12

`tests/integration/physics-loop/mixedBallScalarPhysics.test.ts` adds a native
MuJoCo control with a ball joint before two coupled hinges. A ball consumes four
quaternion coordinates; the following scalar coordinates are at offsets 4 and
5. Before the repair, this fixture threw `qpos.length=3 but model.nq=6`.
The corrected mapping reserves the identity quaternion and checks the driven
coordinate at its actual offset. The positive control completes 500 integration
observations without a coupling residual. A negative control adds 20 degrees
to the observed driven coordinate and produces `mechanism.coupling-residual`.
This is local runtime regression evidence, with no deployment or hardware claim.

Run with `KCAD_SLOW=1 npx vitest run tests/integration/physics-loop/mixedBallScalarPhysics.test.ts tests/integration/physics-loop/coupledGearPhysics.test.ts src/modeling/runtime/mjcfExport.test.ts src/modeling/runtime/mechanismTruthPhysics.test.ts --maxWorkers=2 --no-file-parallelism`.
On the integrated branch, all four files and 22 tests passed.

## Animation bake agreement and fixture connector — 2026-11-12

`coupledGearPhysics.test.ts` now checks every baked `animationView` frame of
both gears. The motor-rotor Z angle matches the sampled `motorDeg` track
value, and the rear-live-axle Z angle matches −0.25 × that value, modulo
360° and within 1e-6°. At the frames nearest −720°, 0°, 300° and 720°,
the Z angles extracted from the baked matrices match an independent
`buildModel` evaluation at that `motorDeg`. The bake must report no advisory
collisions.

This check found a fixture defect. The 48T shape is already translated to the
30 mm pitch centre, but its `axis` connector was at the local origin. The mate
put the axle gear centre at (60, 0) mm at rest, so the gears did not mesh. At
±720° the gear centre moved onto the motor axis at (0, 0), which gave a
561.17 mm³ `motor-rotor`/`rear-live-axle` interpenetration. The earlier
`evidence.json` recorded this as a failure. The connector is now at
`[centerDistance, 0, 0]`. The gear centre stays at (30, 0) mm on all poses,
and the regenerated `evidence.json` has `failures: []`. The coupling, the
500-observation release trace and the MP4 are unchanged. The published RC buggy
(`nMQXpIBa` v1) uses world-coordinate connectors and does not have this defect.

Negative control: changing the fixture ratio to +12/48 makes the new test fail
with a 178.49° axle-angle error.

## Animation-bake replay — 2026-11-13

- [7-second baked-frame MP4](animation-bake.mp4)
- [Capture source](capture-animation-bake-demo.ts)
- [Machine-readable bake evidence](animation-bake-evidence.json)

Recreate it from the repository root with:

    npx tsx docs/demos/issue-1321-coupled-gear/capture-animation-bake-demo.ts

The script runs buildModel, samples the authored track, and bakes the full
timeline. The video shows seven evenly spaced baked frames; its schematic
pitch circles rotate from the motor-rotor and rear-live-axle world matrices. The
capture asserts the motor track and signed −1/4 axle coupling agree at every
baked frame within 1e-6° and that the bake has no collision advisories.

This is a local deterministic replay and a schematic rendering of the baked
rotations. It does not replay the published RC buggy in the hosted viewer, and
does not claim deployed behavior or hardware acceptance.

## Immutable published RC buggy render samples — 2026-11-13

- [8-second original-model MP4](original-rc-buggy-animation.mp4)
- [Pinned revision 1 source](original-rc-buggy-v1.kcad.ts)
- [Packaging source](capture-original-rc-animation.ts)
- [Render and verification evidence](original-render-evidence.json)
- Hosted pose PNGs: original-frame-0000.png through original-frame-0720.png

The source was fetched with get_project_revision for public-unlisted project
nMQXpIBa, version 1. Its 6,088 bytes match SHA-256
7f020f2826d82ed4e35e2193f8644705772997d9800179cdda9fe86e2072b9a3.
The current project still matches that immutable revision. Hosted
capture_animation ran with verify_every=1 and returned verified=true with no
collisions on build 0.1.0+a450870ad106. The host could not encode MP4 because
ffmpeg is absent, so the bundle retains eight static render_preview poses,
each made with autosave=false, then packages those images locally:

    npx tsx docs/demos/issue-1321-coupled-gear/capture-original-rc-animation.ts

The images show the actual original 12T and 48T gear geometry at selected
motorDeg inputs from 0° through 720°. The video labels the axle value as the
authored −0.25 ratio contract. This is a local MP4 made from hosted static
render samples, not the hosted viewer's own animation playback. Hosted physics
verification on the same build returned mechanism=real with no failures; only
the two authored unbounded front-wheel spins were skipped. The issue remains
open until the viewer playback itself is accepted.
