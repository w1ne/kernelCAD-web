# K-Spray façade robot gallery example as a seated assembly

`evaluate_script` failed `examples/gallery/kspray-facade-robot.kcad.ts` with
107 `mechanism.interpenetration` errors. The example placed 72 parts by
transform and declared no mates. The wheels, outrigger beams and hinge
hardware were inside the chassis. The mast, carriage, head and arm parts
shared volume. The pose params moved parts that no joint carried, and the
folded mast went through the control enclosure.

The example is now 61 parts on 60 mates. No two parts share volume.

| Measurement | Before | After |
| --- | --- | --- |
| `evaluate_script` | `ok: false`, `broken`, 107 errors | `ok: true`, `real`, 0 diagnostics |
| Mates | 0 | 6 revolute, 5 prismatic, 49 fastened |
| `kernelcad validate` with the interference sweep | not measured | `real`, 0 failures |
| Interfering pairs at 7 joint-limit poses | not measured | 0 |

## Design changes

- Mast: folds back (away from the control enclosure) on a 29.4 mm pin in a
  30 mm bore, 0 to 90 degrees.
- Carriage: a C-channel with cheeks on the mast sides, 0.4 to 2.7 m above the
  mast foot. The belt, belt cover, drag chain and hose clips are on the mast
  faces that the carriage does not use.
- Outriggers: 700 mm beams in chassis pockets with 0.3 mm clearance per side,
  300 mm stroke, 1.94 m stance.
- Casters: forks on the deck edge carry the wheels outboard of the chassis.
- Gun: turns on one wrist pin, -30 to 30 degrees, nozzle toward the façade.
- Service arms: shoulder yaw (-10 to 55 degrees) and pitch (-35 to 20
  degrees) on pins. `armReach` sets the link lengths.

Changed param ranges: `carriageHeight` 0.2..3 to 0.4..2.7 m, `armYawDeg`
-55..55 to -10..55, `armPitchDeg` -35..35 to -35..20. `outriggerDeploy` 1 is
now a 300 mm stroke.

## Demonstration

[demo.mp4](demo.mp4) shows 8 key poses, 2 s each. Each still is a
`kernelcad render --preset publish` of the example with the param defaults
set to the values in [poses.json](verification/poses.json). The contact sheet
is [video-contact-sheet.png](verification/video-contact-sheet.png).

Visible in the stills: no mechanism badge; the carriage and gun move on the
mast; the gun tilts; the arms swing; the outriggers retract into the chassis;
the mast folds back over the rear of the chassis.

## Repeat

```sh
npx vitest run tests/integration/examples/ksprayFacadeRobotSeatedAssembly.test.ts
node scripts/build-cli.mjs && npm run build:player
python3 docs/demos/facade-robot-seated-assembly-20261119/make_keyposes.py examples/gallery/kspray-facade-robot.kcad.ts /tmp/facade-poses
for i in 0 1 2 3 4 5 6 7; do node dist/cli/index.js render /tmp/facade-poses/pose-$i/kspray-facade-robot.kcad.ts --preset publish -o /tmp/facade-poses/pose-$i/view.png; done
python3 docs/demos/facade-robot-seated-assembly-20261119/make_demo.py /tmp/facade-poses docs/demos/facade-robot-seated-assembly-20261119
```

## Limits

- The demo is a sequence of stills, not a continuous capture.
- The parts are hand-modelled concept blocks, not vendor geometry. A union
  renders in the colour of its first member.
- The casters are fastened (braked); they do not swivel or roll.
- The model is a pitch concept, not a certified lifting device.
