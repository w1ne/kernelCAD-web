# Five-preview mining semantic audit — 2026-11-15

The updated catalog lane calls for five rendered industrial/manufacturing previews, excludes IDs already being changed by open work, and changes one clear material mismatch with a regression and before/after evidence. PR #1258 was merged with all checks successful. The active catalog PR #1406 was open with all checks successful and no review decision at the pre-edit head. Its source diff did not include these five assets. Open issue and PR searches for each candidate ID returned no matches; the selection record is in `verification/open-target-searches.md`.

All five checked-in default previews were opened and inspected. The contact sheet is `preview-review-five-assets.png`; individual baseline images and hashes are in `samples/` and `verification/screened-preview-sha256.txt`.

| Asset | Rendered observation | Decision |
| --- | --- | --- |
| `mining/gyratory-crusher-station` | Blue primary crusher shell, gray wear surfaces and drive, concrete truck dump pocket, ore and service decks read as a gyratory station. | No material mismatch found. |
| `mining/apron-feeder` | Orange coated girders and hopper, gray manganese pans, chain, motor and ore read as a heavy apron feeder. | No material mismatch found. |
| `mining/grizzly-scalping-deck` | Blue sloped tray, stepped bars, ore, side vibrator, fines chute, four spring-supported pedestals read as a grizzly feeder. The four coil sets rendered warning yellow while their spring cores, pedestals and ties use support steel. | **Material mismatch fixed:** the 20 spring-coil parts now use the existing `structuralSteel` control. The separate vibrator weight covers remain warning yellow. |
| `mining/mine-locomotive` | Orange electric locomotive with canopy, dark running gear, mine track, trolley pole and wire reads as an underground locomotive. | No material mismatch found. |
| `mining/rotary-blasthole-drill` | Yellow machinery house and jack cylinders, dark lattice mast/frame and tracks, pale drill string and cuttings read as a rotary blasthole drill. | No material mismatch found. |

## Correction and verification

Only the spring-coil material assignment changed. The triangle budget remains **3,200**; the default export is **2,746 triangles**. Controls, presets, geometry and asset ID are unchanged. The regression checks all 20 exported coil part colors against `structuralSteel` and checks that `vibrator-weight-cover-0` remains warning yellow. `verification/test-before.txt` shows the test failing on the uncorrected exported GLB.

The dated manufacturer comparison and references were recorded privately in `/data/worktrees/kernelCAD-private/docs/competitors/2026-11-15-mining-grizzly-spring-material-review.md`. Public evidence describes only the generic kernelCAD asset.

The before/after catalog PNGs and enlarged support crops are retained in `previews/`. The MP4 source/settings are `make_demo.sh` and `demo-settings.json`; the clip shows the five-preview screen, default before/after result, spring detail and verification outcome. It documents a local software render only. This branch is not deployed; no physical acceptance or equipment operation is claimed.
