# Mining grizzly spring material review

Date: 2026-11-15
Asset: `mining/grizzly-scalping-deck`
Change: use the existing support-steel material for all 20 suspension spring coils; preserve yellow vibrator weight covers.

## Review ledger

| Rendered preview | Result |
| --- | --- |
| `mining/gyratory-crusher-station` | No material mismatch found. |
| `mining/apron-feeder` | No material mismatch found. |
| `mining/grizzly-scalping-deck` | Found yellow spring coils inconsistent with the adjacent support steel; corrected. |
| `mining/mine-locomotive` | No material mismatch found. |
| `mining/rotary-blasthole-drill` | No material mismatch found. |

See [`preview-review.md`](preview-review.md) and [`preview-review-five-assets.png`](preview-review-five-assets.png) for the visual ledger and contact sheet. Baseline captures are under [`samples/`](samples/). Before/after images, spring detail crops, and source snapshots are under [`previews/`](previews/) and [`sources/`](sources/).

## Demo

[Watch the MP4 workflow and result](mining-grizzly-spring-material-review.mp4). Source invocation and settings are retained in [`make_demo.sh`](make_demo.sh) and [`demo-settings.json`](demo-settings.json). Frame inspection evidence and `ffprobe` metadata are in [`video-review/`](video-review/).

The clip shows a local software preview and a source-level regression result. It does not show deployed behavior, physical equipment, or hardware acceptance.

## Verification

- Regression: `npx vitest run tests/integration/catalog/miningGrizzlySpringMaterials.test.ts` — passed (1 test). The expected pre-fix failure is retained in [`verification/test-before.txt`](verification/test-before.txt).
- Full catalog integration suite: `npx vitest run tests/integration/catalog/ --reporter=verbose` — passed, 103 files and 171 tests (`verification/vitest-catalog.txt`). The freshness test rebuilt every catalog source and confirmed the committed index.
- Lint: `npx eslint catalog/kits/mining/` and `npx eslint tests/integration/catalog/miningGrizzlySpringMaterials.test.ts` — passed.
- Preview: `npx tsx scripts/renderCatalogPreviews.ts grizzly-scalping-deck` — rendered at 2,746 triangles, within the 3,200 budget.
- Index: `npx tsx scripts/buildAssetCatalog.ts` — completed; regenerated row is in [`verification/index-row-after.json`](verification/index-row-after.json). The source hash and preview path are current.
- Whitespace: `git diff --check` — passed.

The test checks all 20 coil mesh colors and verifies that the vibrator weight cover remains warning yellow. Asset geometry, controls, presets, triangle budget, and ID were not changed.

## Comparison notes

Dated manufacturer references and the private workflow comparison are recorded in `/data/worktrees/kernelCAD-private/docs/competitors/2026-11-15-mining-grizzly-spring-material-review.md`. Public artifacts describe the generic kernelCAD model; they make no vendor-specific fidelity claim.

This branch has not been deployed. The existing public catalog pages were checked for duplicate features; no post-deployment verification is claimed.
