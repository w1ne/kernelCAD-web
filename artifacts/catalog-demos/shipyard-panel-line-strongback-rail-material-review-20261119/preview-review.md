# Five-preview semantic audit — 19 November 2026 (shipyard fixtures and support stands)

## Selection and exclusions

Reviewed the current rendered previews for five shipyard fixture and support assets: `panel-line-strongback`, `stern-section-support-frame`, `bow-section-support-stand`, `ship-plate-staging-pallet`, and `low-profile-material-skid`. These source paths are absent from the open catalog PR #1507 diff. Searches for each ID returned no open issue or PR, and no earlier ledger under `artifacts/catalog-demos/` names them. `weld-fit-up-table` was a first candidate; the ship-lift-cradle ledger of 17 November 2026 already reviews it, so it was replaced. PR #1258 was checked first; it is merged. PR #1507 was open, mergeable and green at the audit base commit `b87cd5252`. The five previews and matching source snapshots are retained under `samples/`.

## Ledger

| Asset | Preview observation | Result |
|---|---|---|
| `panel-line-strongback` | Two long rails, five cross rails, six yellow clamp blocks and four corner feet read as a ladder-type fixture bed. The two identical longitudinal rails differ: the near rail is grey-green, the far rail is pale grey (`longitudinal-rail-1` uses `structuralSteel`). The description names end stops; the model has none. | Selected: map `longitudinal-rail-1` to `yardPaint` like `longitudinal-rail-0`. Missing end stops noted, not corrected. |
| `stern-section-support-frame` | Portal with two steel towers on painted base shoes, a painted crosshead and two black contact pads reads as a hull support. The lower tie and the two foot braces sit off-centre at y = 150 to 220 mm; one brace is hidden behind a tower. The description says "adjustable towers"; the towers are single fixed posts. | Materials agree with the description. Description limit noted. Not corrected in this round. |
| `bow-section-support-stand` | Two posts on a painted base beam with a head beam and a flat top plate reads as a support stand. The description says "broad saddle pad" and "inclined-looking uprights". The saddle is a flat steel-coloured plate with no pad control, and the uprights are vertical. | Description mismatch noted. No part pair with mixed finishes. Not corrected in this round. |
| `ship-plate-staging-pallet` | Painted base, two end stops and a single pale grey block. The seven 48 mm plate layers touch and share one colour, so they render as one solid slab. The fork pockets are solid blocks hidden under the stack. The description names "corner restraint blocks"; the model has none. | Geometry and description limits noted. No material mismatch. Not corrected in this round. |
| `low-profile-material-skid` | Painted wear plate, three steel deck beams, four black corner bumpers and four posts read as a skid. The four "lifting eyes" are solid 440 mm posts with no eye opening. | Geometry limit noted. Materials are consistent. Not corrected in this round. |

## Correction

The default preview assigned `longitudinal-rail-0` to `yardPaint` (#78867d) and `longitudinal-rail-1` to `structuralSteel` (#b6c1c4). The two rails have the same size and the same role. `longitudinal-rail-0` was the only `yardPaint` part, so a change of that rail to steel would leave the yard-finish control with no effect. The source now gives both rails the `yardPaint` control. `structuralSteel` still colors the five cross rails and four datum feet, and `safetyMarking` still colors the six clamp blocks, so all three color controls and both presets stay effective. Geometry, bounds, the 476-triangle mesh and the 1,800-triangle budget are unchanged.

## Verification and scope

- The exported-GLB regression fails on the pre-fix source at `longitudinal-rail-1`; it passes after the correction (1/1). It also checks that the cross rails and datum feet keep the structural steel finish and the clamp blocks keep the safety marking finish.
- ESLint is clean. The shipyard kit quality gate passes 70/70 (100%). The global structural gate reports 2,398/2,402 (99.83%); the four one-color exceptions are in `standard-components` and are not changed by this round.
- The full catalog integration suite passes 165 files / 235 tests with `--maxWorkers=2`, including the full index/export freshness check.
- The generated index source SHA matches the edited source; the target preview path exists; only the target index row changed; its triangle count and bounds match the before row.

The MP4 documents local source, software-rendered catalog previews and the GLB color regression. It does not claim simulation, deployment, load capacity, compliance or hardware acceptance. The change is not deployed, so no post-deployment page check is claimed.
