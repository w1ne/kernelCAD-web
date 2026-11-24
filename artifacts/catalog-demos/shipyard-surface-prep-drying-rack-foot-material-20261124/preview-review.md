# Five-preview material audit — 24 November 2026 (shipyard drying rack)

## Selection and exclusions

Reviewed the current rendered previews of five shipyard fabrication assets at part
level. `gh pr list --state open` returned PR #1755 (surface offset) only, which touches
no catalog asset; `gh issue list --state open` returned no issue naming these five IDs.
The earlier ledger
`artifacts/catalog-demos/shipyard-hull-survey-grid-frame-sill-rail-material-20261124/`
recorded the same defect class in three of these assets and corrected only
`hull-survey-grid-frame`. That work is merged, so the three deferred instances are not
duplicated; one of them is corrected here and the other two stay deferred.

## Ledger

| Asset | Preview observation | Result |
|---|---|---|
| `surface-prep-drying-rack` | Four identical uprights. `upright-0` uses `yardPaint`; the other three uprights and all four tray feet use `structuralSteel`. The preview shows one dark upright and bare floor pads. | Selected and corrected: all four tray feet now carry the yard finish, all uprights and the frame above stay structural steel. |
| `modular-scaffold-bay` | `cross-brace-0` uses `yardPaint` while `cross-brace-1` uses `structuralSteel`, so the mirrored brace pair differs. | Same defect class. Not corrected here; braces are frame members, so the proposed correction is `cross-brace-0` to `structuralSteel`. |
| `keel-section-fit-up-jig` | Two identical keel rails; `keel-rail-0` uses `yardPaint` and `keel-rail-1` uses `structuralSteel`. | Same defect class. Not corrected here; both rails are the painted alignment bed, so both should carry the yard finish. |
| `hull-block-fabrication-jig` | Painted base rails, steel cross rails and towers, black elastomer contact pads. | Checked and cleared; the floor members alone carry the yard finish, as intended. |
| `panel-line-strongback` | Painted longitudinal rails, steel cross rails and datum feet, yellow safety clamp blocks. | Checked and cleared; material zoning matches the part roles. |

`recycling-facility` (153 previews), `industrial-plant`, `construction-equipment`,
`water-treatment`, `mining`, `shipyard`, `farm-machinery` and `beverage-bottling-line`
preview sheets were scanned for the same class of mismatch. No further part-level
material defect was confirmed in this round.

## Correction

The drying rack stands on four wide tray feet. The shipyard convention is that the member
resting on the dock carries the yard paint while the frame above stays bare steel. The
rack inverted that rule: one upright was painted and the floor pads were bare. All four
tray feet now use `yardPaint`; the four uprights, four cross bars and four panel stops
use `structuralSteel`. Both presets stay effective and the palette keeps two material
controls.

The header comment no longer uses the mass-production placeholder. The description now
names the real dimensions and the parts that exist.

## Verification and scope

- `tests/integration/catalog/surfacePrepDryingRackMaterial.test.ts` fails on the pre-fix
  source (palette puts only `upright-0` in `yardPaint`) and passes after the fix. It also
  checks exported GLB colours for two tray feet, two uprights and one cross bar.
- ESLint clean on `catalog/kits/shipyard/` and on the new test.
- Shipyard quality gate: 70/70 assets pass.
- Full catalog integration suite: 223 files / 375 tests pass with `--maxWorkers=2`,
  including the index-freshness and triangle-budget checks.
- The regenerated `catalog/index.json` changes one row: its description, its
  `sourceSha256`, and four parts moving from `structuralSteel` to `yardPaint` while
  `upright-0` moves the other way.
- The MP4 shows local sources, the software-rendered catalog previews and the GLB
  colour regression. It does not claim simulation, deployment, load capacity,
  compliance or hardware acceptance.
