# Process-reactor vessel ring finish — 2026-11-17

**Demo:** [15-second local audit and result MP4](industrial-plant-process-reactor-rings-material-review.mp4) · [settings and invocation](demo-settings.json) · [decoded-frame inspection](video-review/inspection.json)

**Preview:** [five-preview audit ledger](preview-review.md) · [before](before/process-reactor-vessel.png) · [after](after/process-reactor-vessel.png) · [video contact sheet](video-review/contact-sheet.png)

**Source:** [before source](before/process-reactor-vessel.kcad.ts) · [after source](after/process-reactor-vessel.kcad.ts) · [baseline test failure](verification/baseline-focused-test.txt) · [passing regression](verification/focused-test-pass.txt)

## Finding and correction

The five opened catalog renders were machine guard enclosure, electrical
control cabinet, chemical metering skid, process reactor vessel and steel
access gate. The ring finish mismatch was on the reactor: its roof lip and
three welded shell stiffeners used `safetyPaint` while the adjoining shell used
`steel`. Those four parts now use the existing steel parameter. Yellow remains
on the top and side nozzles, supports, ladder rails and access platform.

Only four `.color()` assignments changed. The asset ID, parts, shape, bounds,
parameters, presets and triangle budget are unchanged. The refreshed preview
shows **612 triangles / 1,400 budget**. The steel finish choice follows this
asset's named palette; it is not a universal vessel painting rule.

## Verification

- The new GLB-level regression failed on the baseline at `roof-lip` and passes
  after the correction. It checks all four rings and confirms safety paint
  remains on the nozzle, a support and the access platform.
- ESLint is clean for all of `catalog/kits/industrial-plant/` and the new test.
- `scripts/checkCatalogQuality.py --kit industrial-plant` reports **60/60
  assets pass (100%)**. This structural gate does not establish industrial
  engineering accuracy.
- `scripts/renderCatalogPreviews.ts process-reactor-vessel` regenerated the
  preview; `scripts/buildAssetCatalog.ts` regenerated the index. The retained
  index verification checks the source hash, preview path, unchanged model
  metadata and all 2,401 non-target rows. The regenerated index has 2,402 rows.
- `npx vitest run tests/integration/catalog/` passed **130 files / 200 tests**,
  including its full-catalog source-to-index rebuild.
- The regenerated catalog preview was opened and visually reviewed. The
  additional `kernelcad render inspect` command could not emit canonical views:
  the installed CLI requires Node 24 and Playwright Chromium, while this
  workspace has Node 22 and no Playwright Chromium. Its output is retained in
  `verification/render-inspect.log`.
- PR #1258 was already merged when this audit began. Its listed CI checks were
  successful; GitHub recorded no review event. The five target files were not
  present in any of the 15 open PR diffs or in open issue search results.

The MP4 shows the local five-preview audit, source color assignments, revised
preview and software checks. This branch has not been deployed. No simulation,
pressure rating, fabrication suitability or hardware acceptance is claimed.

## Reproduce

From the repository root:

```sh
npx vitest run tests/integration/catalog/processReactorVesselRingsMaterial.test.ts
npx eslint catalog/kits/industrial-plant/ tests/integration/catalog/processReactorVesselRingsMaterial.test.ts
python3 scripts/checkCatalogQuality.py --kit industrial-plant
npx tsx scripts/renderCatalogPreviews.ts process-reactor-vessel
npx tsx scripts/buildAssetCatalog.ts
python3 artifacts/catalog-demos/industrial-plant-process-reactor-rings-material-review-20261117/verify_asset_index.py
python3 artifacts/catalog-demos/industrial-plant-process-reactor-rings-material-review-20261117/capture_demo.py
python3 artifacts/catalog-demos/industrial-plant-process-reactor-rings-material-review-20261117/inspect_video.py
```
