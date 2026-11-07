# Lab infrastructure quality promotion — 2026-11-05

[Watch the 21-second MP4 demo](lab-infrastructure-quality-promotion.mp4) or inspect its [decoded contact sheet](decoded-video-contact-sheet.png).

This round promoted all 60 existing lab-infrastructure assets in place. Each now passes `scripts/checkCatalogQuality.py`, with 2–4 material-named color controls and two named appearance presets (`cleanroom`, `highVisibility`). Fifteen assets gained silhouette details such as glazing, lofted surfaces, tubular extraction arms, round faucet spouts or freezer seals. No IDs were added.

The regenerated catalog index contains 2,390 rows. All 60 previews were rendered and indexed. The kit gate passes 60/60; the full catalog quality score moved from 1,180/2,390 (49.37%) to 1,240/2,390 (51.88%), leaving 1,150 thin assets. The index records fresh source hashes and preview paths, and the integration suite confirms index freshness and triangle budgets.

## Evidence

- [Promotion audit](promotion-audit.json): material-control counts, presets, source hashes, preview coverage, triangle range and before/after catalog quality scores.
- [Visual preview review](preview-review.md): three object-readability checks and additional geometry checks.
- [Variant verification](variant-verification.json) and [rendered highVisibility variant](variants/laboratory-fume-hood-highVisibility.png).
- [Catalog page check](catalog-pages-check.json): 2,390 local pages generated; all 60 kit pages and preview pairs checked for controls, presets, Studio links and triangle stats.
- [ESLint result](catalog-eslint-status.json) and [integration result](catalog-test-status.json), with captured output in the neighboring `.txt` files.
- [Video metadata](video-metadata.json) and [decode inspection](video-inspection.json).

## Replay and settings

[`settings.json`](settings.json) records palette values, the 60-asset scope, geometry changes and command sequence. The promotion transformer is [`promote_lab_infrastructure.py`](promote_lab_infrastructure.py); [`render_lab_variant.mts`](render_lab_variant.mts) evaluates the authored fume-hood preset and renders that variant. The transformer was applied to source revision `5ea161f78b4d30a8b6f182b1731e2b704043fb1f`; use a disposable worktree at that revision before replaying it. The checked-in output sources, previews and index are the final result.

The video is assembled by [`capture_lab_demo.py`](capture_lab_demo.py) from its retained frames and decoded/inspected with [`inspect_lab_video.py`](inspect_lab_video.py). To regenerate previews and the index from the promoted sources, use:

```sh
mapfile -t asset_ids < <(find catalog/kits/lab-infrastructure -maxdepth 1 -type f -name '*.kcad.ts' -printf '%f\n' | sed 's/\.kcad\.ts$//')
npx tsx scripts/renderCatalogPreviews.ts "${asset_ids[@]}"
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/lab-infrastructure/
NODE_OPTIONS=--max-old-space-size=8192 npx vitest run tests/integration/catalog/ --maxWorkers=1 --no-file-parallelism
npx tsx artifacts/catalog-demos/lab-infrastructure-quality-promotion-20261105/check_lab_pages.mts
```

## Claim boundaries

The evidence covers authored kernelCAD source, deterministic local catalog builds, software-rendered previews, generated local pages, lint and integration tests. The feature branch was not deployed, so live behavior for these changes is not verified. These visual props are not lab engineering or safety specifications; no simulation, equipment performance or hardware acceptance is claimed.
