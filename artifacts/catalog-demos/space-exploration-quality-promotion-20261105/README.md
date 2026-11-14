# Space exploration quality promotion

[Watch the local 18-second source-to-preview walkthrough](space-exploration-quality-promotion.mp4)

This round promoted all 52 existing space-exploration assets. It keeps every ID
and scale knob, adds 121 material-named color controls (two to four per asset)
and two named presets per asset (`lunarDust` / `highVisibility`, 104 entries in
all), then regenerates each preview and index row. The source adds chamfered
low-poly profiles, visibly separated materials, oriented wheel geometry, and
clearer vehicle and antenna shapes where those parts define the object.

The kit quality gate passes 52/52 assets. The whole-catalog quality gate moved
from 1,452/2,390 (60.92%) to 1,504/2,390 (62.93%); 886 assets (37.07%) remain
thin. No asset IDs were added.

## Handoff and source

- [Space exploration kit and per-asset parameters](../../../catalog/kits/space-exploration/README.md)
- [Canonical source generator](../space-exploration-wave-20261103/generate_space_assets.py)
- [Exact generation, render and validation commands](invocations.txt)
- [Round results](verification.json), [ESLint status](catalog-eslint-status.json), [quality-gate status](catalog-kit-quality-status.json), [render status](catalog-render-status.json), [index status](catalog-build-status.json), and [integration status](catalog-test-status.json)
- [Original before previews](before/)
- [Capture source](capture_space_quality_promotion.py), [capture settings](settings.json), and [video inspection](inspect_space_quality_video.py)
- [Local public-site baseline](live-website-check.json): homepage and `/assets.json` returned 200; the current public data had 52 previews and no presets; `/catalog/` returned 404. This records the pre-deployment site, not this branch.

The original single-color wave MP4 remains in the [initial demo bundle](../space-exploration-wave-20261103/README.md). The generator now reproduces the promoted sources; that historical MP4 is not a replay of today's source.

## Rebuild and verify

Run from the repository root. The generated source set has 52 stable IDs; the
kit README records the full preview-render command with every ID.

```sh
python3 artifacts/catalog-demos/space-exploration-wave-20261103/generate_space_assets.py
npx tsx scripts/buildAssetCatalog.ts
npx tsx scripts/renderCatalogPreviews.ts <all 52 space-exploration asset IDs>
npx tsx scripts/buildAssetCatalog.ts
python3 scripts/checkCatalogQuality.py --kit space-exploration
npx eslint catalog/kits/space-exploration/
npx vitest run tests/integration/catalog/
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-space-pages
python3 artifacts/catalog-demos/space-exploration-quality-promotion-20261105/verify_space_pages.py /tmp/kernelcad-space-pages
python3 artifacts/catalog-demos/space-exploration-quality-promotion-20261105/capture_space_quality_promotion.py
python3 artifacts/catalog-demos/space-exploration-quality-promotion-20261105/inspect_space_quality_video.py
```

`verification.json`, the captured command outputs, generated page evidence,
video metadata and decoded contact sheet record the local checks for this
round. The 3/4-view previews were inspected separately; see
`preview-review.md` for what is visible in them.

## Scope and verification limits

These are stylized CC0 visualization props. Local source evaluation, mesh
statistics, lint, preview rendering, generated-page checks and integration
tests do not establish mission fit, flight readiness, pressure or radiation
performance, thermal-vacuum qualification, engineering suitability, physical
simulation, deployment, or hardware acceptance. The branch was not deployed;
public-page verification remains pending deployment.

## Untracked generated outputs

`frames/` and the decoded images and contact sheets in `video-review/` are not tracked in git; they are regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/space-exploration-quality-promotion-20261105/capture_space_quality_promotion.py`
- video review: `python3 artifacts/catalog-demos/space-exploration-quality-promotion-20261105/inspect_space_quality_video.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
