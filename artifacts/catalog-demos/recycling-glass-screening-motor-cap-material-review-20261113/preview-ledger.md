# Recycling facility semantic preview ledger — 2026-11-13

## Sample and selection

Reviewed the checked-in default software renders for five recycling machines:
`bag-opener`, `cross-belt-sorter`, `disc-screen`, `glass-screening-deck`, and
`bottle-cleaning-line`. Searches of open issue titles/bodies, open PR titles/bodies,
and non-destination open PR changed paths found no target for these asset IDs or
sources. PR #1258 was green before the audit and is the destination branch; it had
no submitted review at the baseline.

The baseline source and PNG files for all five assets, their SHA-256 hashes, the
PR status, and the sample evaluation output are retained in this bundle.

| Asset | Default silhouette and visible zones | Mesh / envelope (X × Y × Z) | Review |
|---|---|---:|---|
| `bag-opener` | Flared hopper, enclosed drum housing, guard trim, discharge belt, bags and spilled recyclables | 1,378 tris; 3.05 × 3.23 × 3.99 m | Reads as a bag opener; no material mismatch found. |
| `cross-belt-sorter` | Oval carrier loop with individual belts, induction belt, sloped chutes and bulk bags | 4,516 tris; 6.832062 × 1.774 × 6.686389 m | Reads as a cross-belt sorter; no material mismatch found. |
| `disc-screen` | Inclined star-disc deck, OCC sheets, frame, and lower fines belt | 3,952 tris; 6.897402 × 3.307028 × 4.46 m | Reads as a disc screen; no material mismatch found. |
| `glass-screening-deck` | Open double-deck screen, cullet bins, twin side-mounted drive motors | 2,016 tris; 5.975 × 2.9 × 3.945 m | **Material mismatch:** both motor end caps used the orange polyurethane screen-panel control. Corrected to the dark motor finish used on the motor bodies. |
| `bottle-cleaning-line` | Tunnel washer, guided bottle infeed/outfeed, slat belt, recirculation tank and pump | 3,388 tris; 4.465 × 1.745 × 1.26 m | Reads as a bottle tunnel washer; no material mismatch found. |

## Correction

In `glass-screening-deck.kcad.ts`, both `motor-cap-*` parts now use the existing
dark motor finish instead of `panels`. The orange polyurethane screen panels stay
unchanged. This is a material assignment only: the asset retains its 2,016
triangles, 2,800-triangle budget, 5.975 × 2.9 × 3.945 m default envelope, four
material controls, four presets, and catalog identity.

The focused exported-GLB regression fails on the saved baseline because
`motor-cap-f` and `motor-cap-b` are members of the `panels` palette. It passes
after the correction and checks both caps and motor bodies against the dark motor
finish, panels against the polyurethane color, the palette assignment, presets,
triangle budget, and envelope.

## Evidence boundary

The PNGs and GLB test cover local authored source and software-rendered catalog
behavior. They do not establish a vibrating-screen process simulation,
deployment, supplier specification for a particular machine, or hardware
acceptance. The branch is not deployed.
