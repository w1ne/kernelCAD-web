# Five-preview industrial asset review — 18 November 2026

All five rendered previews were opened directly at 512 × 512. The issue and
pull-request list was checked for each exact asset ID, and the changed source
paths for open PR #1507 were checked before selection.

| Asset | Preview review | Decision |
|---|---|---|
| `industrial-plant/pipe-rack-bay` | Two cross-braced supports carry three utility pipes. The center pipe remains safety-colored to distinguish that run. The two structural crossbeams and mounting baseplates were safety-colored while the matching columns and braces used the `steel` control. | **Fixed:** crossbeams and baseplates now use the existing `steel` control. The center pipe, flanges, and other authored safety accents are unchanged. |
| `industrial-plant/jib-crane` | The mast, boom, brace, chain block, and hook read as a floor-mounted jib crane; steel and safety finishes are visually separated. | No additional material mismatch selected. The disconnected brace/boom geometry is already recorded in `industrial-cyclone-separator-material-review-20261113/preview-ledger.md`; it was not changed here. |
| `industrial-plant/electric-pallet-jack` | Tiller, orange housing, twin forks, and dark rollers read as a walk-behind pallet jack. The visible finishes are plausible. | No material mismatch selected. Its earlier scale and roller-height concern remains in `shipyard-weld-inspection-light-lens-material-review-20261114/preview-ledger.md`; it was not changed here. |
| `industrial-plant/steel-access-gate` | Steel posts, painted rails, vertical infill, and toe plate read as a safety gate. | No material mismatch selected. |
| `industrial-plant/machine-guard-enclosure` | Corner posts, a service door, and surrounding guard panels read as a machine guard enclosure. The authored safety and steel finishes are distinct. | No additional material mismatch selected. The opaque infill versus “mesh-like” description is already recorded in `industrial-plant-process-reactor-rings-material-review-20261117/preview-review.md`; it was not changed here. |

The selected correction is limited to four part-to-control assignments in one
asset. Geometry, dimensions, presets, asset ID, and triangle budget are
unchanged. The models remain generic kernelCAD scene assets, not vendor models
or engineering specifications.
