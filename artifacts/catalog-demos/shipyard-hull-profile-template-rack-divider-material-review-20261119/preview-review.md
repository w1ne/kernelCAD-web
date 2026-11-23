# Five-preview semantic audit — 19 November 2026 (shipyard racks, jigs and frames)

## Selection and exclusions

Reviewed the current rendered previews for five shipyard fabrication assets: `hull-profile-template-rack`, `surface-prep-drying-rack`, `modular-scaffold-bay`, `keel-section-fit-up-jig`, and `hull-survey-grid-frame`. These source paths are absent from the open catalog PR #1507 diff. Searches for each ID returned no open issue or PR, and no earlier ledger under `artifacts/catalog-demos/` names them. PR #1258 was checked first; it is merged. PR #1507 was open, mergeable and green at the audit base commit. The five previews and matching source snapshots are retained under `samples/`.

## Ledger

| Asset | Preview observation | Result |
|---|---|---|
| `hull-profile-template-rack` | Five identical upright bay dividers stand on two brown base runners. Four dividers are grey steel; the first divider alone is brown. | Selected: map `divider-0` to `structuralSteel` like `divider-1` through `divider-4`. |
| `surface-prep-drying-rack` | Four-post rack with crossbars and panel stops reads clearly. One of four identical uprights is darker than the other three (`upright-0` uses `yardPaint`). | Same defect class observed. Not corrected in this round. |
| `modular-scaffold-bay` | Scaffold bay with deck, ledgers and ladder rungs. One of two cross-braces is darker (`cross-brace-0` uses `yardPaint`). The braces render as solid slabs, which is a geometry limit, not a material defect. | Same defect class observed. Not corrected in this round. |
| `keel-section-fit-up-jig` | Two long keel rails with spacing blocks, end stops and reference towers. One of the two identical rails is dark green (`keel-rail-0` uses `yardPaint`). | Same defect class observed. Not corrected in this round. |
| `hull-survey-grid-frame` | Two open rectangles with three crossbars read as a reference frame. One of four identical frame rails is dark (`frame-rail-0` is the only `yardPaint` part). | Same defect class observed. Not corrected in this round. A correction here must keep `yardPaint` in use. |

## Correction

The default preview assigned `divider-0` to `yardPaint` (#8f795e) while `divider-1` through `divider-4` used `structuralSteel` (#b6c1c4). The five dividers have the same size and the same role. The source now gives all five the `structuralSteel` control. `yardPaint` still colors the two base runners, so both color controls and both presets stay effective. Geometry, bounds, the 364-triangle mesh and the 1,800-triangle budget are unchanged.

## Verification and scope

- The exported-GLB regression fails on the pre-fix source at `divider-0`; it passes after the correction (1/1). It also checks that the base runners keep the yard finish.
- ESLint is clean. The shipyard kit quality gate passes 70/70 (100%). The global structural gate reports 2,398/2,402 (99.83%); the four one-color exceptions are in `standard-components` and are not changed by this round.
- The full catalog integration suite passes 163 files / 233 tests with `--maxWorkers=2`, including the full index/export freshness check.
- The generated index source SHA matches the edited source; the target preview path exists; only the target index row changed; its triangle count and bounds match the before row.

The MP4 documents local source, software-rendered catalog previews and the GLB color regression. It does not claim simulation, deployment, load capacity, compliance or hardware acceptance. The change is not deployed, so no post-deployment page check is claimed.
