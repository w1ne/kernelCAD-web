# Preview ledger — industrial five-preview material audit, 2026-11-13

Selection rule: industrial/manufacturing assets that no earlier
`artifacts/catalog-demos/*` bundle names and that no open issue or PR targets
(open catalog issues checked: #1364 linear-guide rail, #1370 V-belt pulley).
Each committed preview PNG was opened and compared with the `.kcad.ts` palette.

| Asset | Visible evidence | Result |
| --- | --- | --- |
| `industrial-plant/centrifugal-pump` | Green motor with fan cowl, blue volute casing with flanged suction and discharge, painted baseplate. | No defect found. |
| `industrial-plant/jib-crane` | Mast is steel and boom is safety paint, which is plausible. The two floor rails stand apart from the mast, and the brace does not meet the boom. | Geometry defect, not a material defect. Not fixed in this round. |
| `industrial-plant/screw-conveyor` | Description says "Inclined", but the tube is horizontal. The `feed-hopper` box sits under the tube (centre z 117.6 mm, tube axis z 243.6 mm), so it reads as a support block, not an inlet. | False label and geometry defect, not a material defect. Not fixed in this round. |
| `mining/ball-mill` | Lined shell with girth gear, trunnion bearings, pinion drive and motor, all on a plinth. | No defect found. |
| `industrial-plant/cyclone-separator` | The conical dust hopper shows alternating yellow and grey bands. The vortex-finder `outlet-stack` and the `tangential-inlet` duct are also yellow. | **Material mismatch. Fixed.** |

## Defect

A cyclone body is one welded steel process shell. The source assigned
`cone-step-0`, `cone-step-2`, `outlet-stack` and `tangential-inlet` to
`safetyPaint`, so the cone rendered as painted stripes, and the gas outlet pipe
and inlet duct rendered as yellow guard parts.

## Fix

Those four parts now use the `steel` knob. `upper-rim` (the roof flange ring)
keeps `safetyPaint`, so the asset still has two material knobs. Geometry,
triangle count (388) and size (0.6437 x 1.066 x 0.54 m) do not change.

Regression test: `tests/integration/catalog/cycloneSeparatorMaterials.test.ts`.
It checks the palette zones and the GLB colour of all six shell parts.

## Known limits that remain

- The three cyclone legs stand at radius 200 mm, but the cone bottom has radius
  85 mm, so the legs do not touch the body. This is a geometry defect for a
  separate fix.
- The jib-crane and screw-conveyor defects above stay open.
