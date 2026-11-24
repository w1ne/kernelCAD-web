# Five-preview material audit — 24 November 2026 (shipyard survey frame)

## Selection and exclusions

Reviewed the current rendered previews of five shipyard fabrication assets at part
level and scanned the preview sheets of the manufacturing kits for the same defect
class. Open PR #1755 (surface offset) and #1751 (display textures) touch no catalog
asset. `gh pr list --state open` returned no other catalog PR, and `gh issue list`
returned no issue naming these five IDs. The earlier ledger
`artifacts/catalog-demos/shipyard-hull-profile-template-rack-divider-material-review-20261119/`
recorded this defect class in five assets and corrected only
`hull-profile-template-rack`; the four remaining instances are still present at the
audit base commit and are not duplicated here.

## Ledger

| Asset | Preview observation | Result |
|---|---|---|
| `hull-survey-grid-frame` | Two open portal rectangles with three crossbars. `frame-rail-0` (sill rail of the first portal) uses `yardPaint`; `frame-rail-1`, the mirrored sill rail of the second portal, uses `structuralSteel`. The pair renders one dark rail and one light rail. | Selected and corrected: both sill rails now carry the yard finish. |
| `modular-scaffold-bay` | Deck, toe board and ladder rungs use the yard finish. `cross-brace-0` also uses `yardPaint` while `cross-brace-1` uses `structuralSteel`, so the mirrored brace pair differs. | Same defect class. Not corrected here; braces are frame members, so the correction is `cross-brace-0` to `structuralSteel`. |
| `surface-prep-drying-rack` | Four identical uprights; `upright-0` uses `yardPaint` and the other three use `structuralSteel`. The four tray feet, which are the floor members, are bare steel. | Same defect class. Not corrected here; proposed correction is all four uprights to `structuralSteel` and the four tray feet to `yardPaint`, which keeps both controls in use. |
| `keel-section-fit-up-jig` | Two identical keel rails; `keel-rail-0` uses `yardPaint` and `keel-rail-1` uses `structuralSteel`. | Same defect class. Not corrected here; both rails are the painted alignment bed, so both should carry the yard finish. |
| `mining/trommel-screen` | Two riding rings on trunnion rollers render as steel bands. A trommel riding ring is a forged steel ring shrunk onto the shell, not a rubber tyre. | Checked and cleared; no change. |

`recycling-facility` (153 previews), `industrial-plant`, `construction-equipment`,
`water-treatment`, `mining`, `shipyard`, `farm-machinery` and `beverage-bottling-line`
preview sheets were scanned for the same class of mismatch. No further part-level
material defect was confirmed in this round.

## Correction

The grid frame is two portal rectangles that stand on the dock. In the other shipyard
stands the member that rests on the dock carries the yard paint
(`bow-section-support-stand` base beam, `stern-section-support-frame` bases,
`hull-profile-template-rack` base runners), while the uprights and crossbars stay bare
structural steel. `frame-rail-0` already followed that rule; `frame-rail-1` is its
mirrored twin and now follows it too. Geometry, the 308-triangle mesh and the
1,800-triangle budget are unchanged; `yardPaint` still colours two parts and both
presets stay effective.

The description also claimed leveling feet and target mounts, which the source does
not build. It now describes the two portal rectangles and the three cross-reference
bars that exist.

## Verification and scope

- `tests/integration/catalog/hullSurveyGridFrameMaterial.test.ts` fails on the pre-fix
  source (palette puts `frame-rail-1` in `structuralSteel`) and passes after the fix.
  It also checks exported GLB colours for both sill rails, one top rail, one upright
  and one crossbar.
- ESLint clean on `catalog/kits/shipyard/` and on the new test.
- Shipyard quality gate: 70/70 assets pass.
- Full catalog integration suite: 222 files / 374 tests pass with `--maxWorkers=2`,
  including the index-freshness and triangle-budget checks.
- The regenerated `catalog/index.json` changes one row: its description, its
  `sourceSha256`, and one part moving from `structuralSteel` to `yardPaint`.
- The MP4 shows local sources, the software-rendered catalog previews and the GLB
  colour regression. It does not claim simulation, deployment, load capacity,
  compliance or hardware acceptance.
