# Export health at the authored rest

`demo.mp4` is an 18-second text replay of a local `check_export_health` run.
It is not a renderer capture, a deployed Studio session, or hardware acceptance.

The hinge in `swing-clear.kcad.ts` is authored at 90° with limits [−20°, 120°].
A free root stop overlaps the link by 10 mm at joint coordinate 0 and is clear
by 5 mm at 90°. The stop is not fastened to the base: that would put it in the
base rigid group, and the swing exclusion would hide the pair.

`run.json` is the tool output this video was built from.

- At `qpos0` the swing coordinate is 1.570796 rad (90°) and the report is
  `ok: true` with no rest contact.
- A second forward at coordinate 0, which is not what the tool reports, finds
  four `link` / `stop` contacts at 9.999997 mm. The analytic overlap is 10 mm.
- `declared-mass.kcad.ts` sets `massKg: 0.055` on a centred 10×20×30 mm block.
  CAD, compiled MJCF, and URDF all report 0.055 kg (`massSource: declared-mass`)
  and the row matches.
- `limit-rest.kcad.ts` authors pose 0 with limits [12°, 40°]. The boxes do not
  overlap. The report is `ok: false` because `qpos0` is outside the range.

`ball-clear.kcad.ts` authors a ball wrist at extrinsic XYZ `[0, 90, 0]`.
MuJoCo keeps that joint's `qpos0` at the identity quaternion and ignores
`ref`, so the link body carries `quat="0.707107 0 0.707107 0"` and the joint
element has no `ref`. The report is `ok: true` with no rest contact.
`ball-overlap.kcad.ts` is the same solids at `[0, 0, 0]`. The stop overlaps
the link by 10×10×10 mm³. The compiled depth is 10.000 mm,
`cadExactOverlapMm3` is 1000, `collisionGeomArtefact` is false, and `ok` is
false.

`hull-corner.kcad.ts` seats an 8 mm cube in the inner corner of an L, 4 mm
clear of both faces. The compiled hull penetration is 14.000 mm.
`cadExactOverlapMm3` is 0, `cadDistanceMm` is 4, and
`collisionGeomArtefact` is true. The report stays `ok: true`. Suppression
needs that positive clearance. A pair that only touches, or whose overlap
is at or below 0.01 mm³ with no measured gap past 0.01 mm, stays a finding.

`verify({ check: 'physics' })` still starts a mate that a sample does not name
at coordinate 0. That coordinate is the connector-aligned pose. Export `qpos0`
is the authored pose.

## Reproduce

```sh
TMPDIR=/tmp TMP=/tmp npx tsx docs/demos/export-health-authored-rest-20261117/record-run.mts
node docs/demos/export-health-authored-rest-20261117/make-video.mjs
```

`record-run.mts` calls `checkExportHealthTool({ file })` on the six scripts
in this directory. The coordinate-0 depth is a second `setPose(0)` / `forward`
on the swing export. The committed `run.json` is that local run.

## Regression evidence

`src/modeling/runtime/exportHealth.test.ts` covers the same behaviours:
the 90° clearance against the 10 mm overlap at coordinate 0, the declared-mass
row, the out-of-limit `qpos0`, the ball Euler clearance against the 10 mm
zero-triple overlap, the L-corner hull artefact at 4 mm clearance, and the
touching cube in that same corner. The non-adjacent negative control is the
three-box assembly in that file (analytic overlap 20 mm).
