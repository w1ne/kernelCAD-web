# Static-hold routes rated mechanicalJoints to motion-load

Follow-up to #1270. A mate-only hinge with a `mechanicalJoint` `torqueNm`
rating returns `ok: false` from static-hold with
`assembly.joint.static-hold.no-actuator`. The message now names the rated
`mechanicalJoint` and routes it to `verify({ check:'motion-load', quasi_static:true })`,
which evaluates that rating.

## Fixture

300 × 20 × 10 mm steel beam (7850 kg/m³) on revolute mate `shoulder`;
`mechanicalJoint` `drive` with `torqueNm: 1e-6`; pose 0°, gravity −Z.

## Result (`verification.json`)

- static-hold: `ok: false`, 0 joints, 0 poses, `assembly.joint.static-hold.no-actuator`.
- motion-load: `ok: false`, peak 0.6931 N·m, `mechanism.load.torque-exceeded`.
- Hand calculation m·g·L/2 = 0.4710 kg × 9.81 m/s² × 0.15 m = 0.6931 N·m.

## Reproduce

```sh
npx tsx docs/demos/static-hold-motion-load-routing/capture-demo.mts
sh docs/demos/static-hold-motion-load-routing/render-demo.sh
```

`demo.mp4` (H.264, 1280×720, 24 fps, 10 s) is a local in-process replay. It
is not deployment or hardware acceptance.
