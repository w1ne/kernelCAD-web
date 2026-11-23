# Five-preview semantic audit — 19 November 2026 (emergency-stop stations and instrument posts)

## Selection and exclusions

Reviewed the current rendered previews for five control-station and instrument assets: `emergency-power-off-station` (data-center-infrastructure), `ev-emergency-stop-station` (ev-charging-infrastructure), `sorter-emergency-stop-pedestal` and `scanner-sensor-post` (postal-logistics), and `turbidity-analyzer-panel` (water-treatment). These source paths are absent from the open catalog PR #1507 diff. Searches for each ID returned no open issue or PR, and no earlier ledger under `artifacts/catalog-demos/` names them. PR #1258 was checked first; it is merged. PR #1507 was open at the audit base commit `5ace9580d`; its `build-and-checks` job was in progress and its other non-skipped checks had passed. The five previews and matching source snapshots are retained under `samples/`.

## Ledger

| Asset | Preview observation | Result |
|---|---|---|
| `emergency-power-off-station` | A red back plate, a yellow body and a red hood plate read as a wall station. The actuator does not read as a stop button: a red cup with a yellow lid stands upright and passes through the hood. `actuator-base` and `push-button` are vertical cylinders, and `push-button` uses the same yellow `polymer` control as the body. An emergency-stop actuator is red on a yellow background (ISO 13850 colour convention). | Selected: give `push-button` a red `actuatorPolymer` control, map `actuator-base` to `polymer`, and turn both cylinders to point out of the wall. |
| `ev-emergency-stop-station` | A stainless post with a teal hood reads as a pedestal. The actuator has the same defect: a vertical grey cylinder with an amber cap. It stands 25 mm in front of the post face and touches nothing. The amber `safetyPolymer` actuator is not red. | Same actuator defect confirmed in the preview. Not corrected in this round. |
| `sorter-emergency-stop-pedestal` | Base, post, head and two side guards read as a stop pedestal. The amber `safetyAmber` button is a vertical cylinder half inside the head front; it does not face the operator and is not red. The `cable-outlet` is a painted box on the post rear, which is plausible. | Same actuator defect confirmed in the preview. Not corrected in this round. |
| `turbidity-analyzer-panel` | A teal panel with a hood, a glass display and a glass sample-cell block reads as an analyzer. The `label-strip` uses `coatedSteel`, so it has the panel colour and shows only as a ridge. The two "service ports" are pegs that stand on the ground at the cell corners; the description says wall-mount. | Minor label finish limit and port geometry limit noted. Not corrected. |
| `scanner-sensor-post` | Foot, mast, arm, reader block with a glass lens, and a junction box read as a scanner post. The `cable-gland` uses `paintedSteel` and merges with the junction box. Two anchors sit on one diagonal only. | No material defect that changes the reading. No change. |

## Correction

The default preview drew `actuator-base` in `steel` (#b43b31) and `push-button` in `polymer` (#f0c330), both as upright cylinders in front of a wall-mounted body. The result was a red cup with a yellow lid. The source now has an `actuatorPolymer` control (#d42a20, red in both presets) for `push-button`. `actuator-base` is the collar on the moulded body and now uses `polymer`. Both cylinders use a new `outward` helper and run along -Y: the collar starts on the body face and is 40 mm deep with a 52 mm radius; the mushroom head is 45 mm deep with a 60 mm radius. The head sits below the hood plate and inside the body outline.

`steel` still colours the back plate, guard hood and label panel. `polymer` colours the body and collar. All three colour controls and both presets stay effective. The mesh keeps 136 triangles within the 2,200-triangle budget. Width and height are unchanged (0.32 m × 0.42 m). Depth changes from 0.2895 m to 0.2675 m because the actuator is smaller.

Noted, not corrected: the guard hood is a flat plate above the button and does not shroud it; `label-panel` is red steel inside the hood top and cannot be seen.

## Verification and scope

- The exported-GLB regression fails on the pre-fix source at the first changed value (depth 0.2895 m, expected 0.2675 m); it passes after the correction (1/1). It checks the three colour controls, the red button, the yellow collar and body, the steel parts, the horizontal button axis, and the button position relative to the hood, body and collar.
- ESLint is clean. The data-center-infrastructure kit quality gate passes 50/50 (100%). The global structural gate reports 2,398/2,402 (99.83%); the four one-color exceptions are in `standard-components` and are not changed by this round.
- The full catalog integration suite passes 167 files / 237 tests with `--maxWorkers=2`, including the full index/export freshness check.
- The generated index source SHA matches the edited source; the target preview path exists; only the target index row changed; its triangle count, width and height match the before row, and its depth is the expected 0.2675 m.

The MP4 documents local source, software-rendered catalog previews and the GLB regression. It does not claim simulation, deployment, safety function, standards compliance or hardware acceptance. The colour convention is a visual rule for the model only. The change is not deployed, so no post-deployment page check is claimed.
