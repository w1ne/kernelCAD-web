# Packed-case checkweigher belt material review — 12 November 2026

This handoff records a five-preview manufacturing-asset review and a focused
material correction to the existing `beverage-bottling-line/case-checkweigher`
asset. No catalog IDs or kits were added.

## Finding and correction

The baseline preview rendered the infeed, weighing, and outfeed surfaces in the
same stainless-steel color as their support beds. The source had no separate
belt surfaces or belt-material control. The updated model adds three thin,
separated belt surfaces and a `beltPolymer` color control. The existing steel
beds stay in `stainlessSteel`; the `sanitaryLine` and `legacyPlant` presets set
the belt finish explicitly. The source description also no longer claims a
reject output that the preview does not show.

The default mesh is 248 triangles under a 320-triangle budget. Its envelope is
unchanged at 1.26 × 0.78 × 0.785 m. The catalog ID and kit membership remain
unchanged.

## Five-preview review

The [sample ledger](sample-ledger.json) records the five reviewed beverage-line
machines, local source and preview hashes, generated-index dimensions, current
public route status, and visual observations. All five public detail pages and
preview routes returned HTTP 200 before this change; their preview hashes
matched the local baseline. The [open-target check](open-target-check.json)
records 13 open issues and 10 open PRs checked for duplicate targets; no exact
asset-slug issue or source-path PR match was found.

The [visual review notes](preview-review.md) capture the observations. The
checkweigher was the only clear material mismatch. See its
[before preview](before/case-checkweigher.png) and
[updated preview](after/case-checkweigher.png).

## Verification

The focused exported-GLB regression passes 1/1 and checks the three belt colors,
their separation from the stainless support beds, the preset values, triangle
budget, and unchanged envelope. ESLint is clean, and the beverage-line quality
gate passes 50/50 (100%). The full catalog integration rerun passes 50/50 files
and 83/83 tests in 785.98 seconds; the whole-catalog export test took 754.61
seconds. Its 15-minute test cap timed out under workspace load on the initial
runs, so `catalogIndex.test.ts` now allows 30 minutes. Both the initial timeout
and the successful rerun are retained in `verification/`.

The catalog index was regenerated from source, and the checkweigher preview was
rendered from the updated model. The local generated detail page is checked for
the new color control and both presets.

[15-second MP4](beverage-case-checkweigher-belt-material-review.mp4) shows the
five reviewed previews, before/after render, material mapping, and local
validation. It describes local source and preview behavior only. The public
site remains on its pre-change baseline because this feature branch has not
been deployed.

## Reproduce

From the repository root:

```sh
npx tsx scripts/renderCatalogPreviews.ts case-checkweigher
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/beverage-bottling-line/ tests/integration/catalog/caseCheckweigherBeltMaterial.test.ts
npx vitest run tests/integration/catalog/caseCheckweigherBeltMaterial.test.ts
npx vitest run tests/integration/catalog/
python3 scripts/checkCatalogQuality.py --kit beverage-bottling-line
python3 artifacts/catalog-demos/beverage-case-checkweigher-belt-material-review-20261112/capture_demo.py
```

`baseline-ledger.json`, `sample/`, and `live-baseline/` preserve the reviewed
source/render baseline and current public pages. `capture_demo.py`,
`demo-settings.json`, `demo-slides.txt`, `video-inputs/`, and `video-review/`
retain the video source, settings, invocation, extracted frames, and visual
inspection evidence. `verification/catalog-integration-initial.log` records the
first run; `verification/catalog-integration.log` records the passing rerun.

This generic low-poly asset is not a vendor design, belt specification,
washdown certification, measurement-accuracy claim, process simulation,
deployment verification, or physical acceptance result.
