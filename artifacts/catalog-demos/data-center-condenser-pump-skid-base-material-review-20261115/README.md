# Data-center condenser pump skid base material review

Date: 2026-11-15
Asset: `data-center-infrastructure/condenser-pump-skid`
Change: the fabricated base frame moves from the `polymer` ("Engineering polymer") control to a new `skidSteel` ("Skid base steel") control. Pumps, motors and headers keep painted steel.

## Review ledger

| Rendered preview | Result |
| --- | --- |
| `data-center-infrastructure/condenser-pump-skid` | Found the steel base frame rendered as yellow engineering polymer; corrected. |
| `data-center-infrastructure/day-fuel-tank` | Same polymer-skid mismatch found; not fixed this round (follow-up candidate). |
| `data-center-infrastructure/standby-generator-enclosure` | No material mismatch found. |
| `data-center-infrastructure/coolant-distribution-unit` | No material mismatch found; weak cabinet silhouette noted. |
| `data-center-infrastructure/dry-type-transformer` | No material mismatch found. |

See [`preview-review.md`](preview-review.md) and [`preview-review-five-assets.png`](preview-review-five-assets.png) for the visual ledger and contact sheet. Baseline captures are under [`samples/`](samples/). Before/after images, base detail crops, and source snapshots are under [`previews/`](previews/) and [`sources/`](sources/).

## Demo

[Watch the MP4 workflow and result](data-center-condenser-pump-skid-base-material-review.mp4). Source invocation and settings are in [`make_demo.sh`](make_demo.sh) and [`demo-settings.json`](demo-settings.json). Frame inspection evidence and `ffprobe` metadata are in [`video-review/`](video-review/).

The clip shows a local software preview and a source-level regression result. It does not show deployed behavior, physical equipment, or hardware acceptance.

## Verification

- Regression: `npx vitest run tests/integration/catalog/dataCenterCondenserPumpSkidMaterials.test.ts` — passed (1 test). The pre-fix failure is in [`verification/test-before.txt`](verification/test-before.txt).
- Full catalog integration suite: `npx vitest run tests/integration/catalog/` — passed, 104 files and 172 tests ([`verification/vitest-catalog.txt`](verification/vitest-catalog.txt)). The freshness test rebuilt every catalog source and confirmed the committed index.
- Lint: `npx eslint catalog/kits/data-center-infrastructure/ tests/integration/catalog/dataCenterCondenserPumpSkidMaterials.test.ts` — passed.
- Quality gate: `python3 scripts/checkCatalogQuality.py --kit data-center-infrastructure` — 50/50 pass.
- Preview: `npx tsx scripts/renderCatalogPreviews.ts condenser-pump-skid` — rendered at 300 triangles, within the 2,200 budget.
- Index: `npx tsx scripts/buildAssetCatalog.ts` — regenerated row in [`verification/index-row-after.json`](verification/index-row-after.json).
- Whitespace: `git diff --check` — passed.

## Comparison notes

Dated vendor references (packaged pump skids on structural steel bases) and the private workflow comparison are in `/data/worktrees/kernelCAD-private/docs/competitors/2026-11-15-data-center-condenser-pump-skid-base-material-review.md`. Public artifacts describe the generic kernelCAD model; they make no vendor-specific fidelity claim.

This branch has not been deployed. No post-deployment verification is claimed.
