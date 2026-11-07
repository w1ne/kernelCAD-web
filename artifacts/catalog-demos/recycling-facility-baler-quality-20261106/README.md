# Recycling facility · horizontal baler refinement — 2026-11-06

**Demo:** [horizontal-baler-refinement.mp4](horizontal-baler-refinement.mp4) ·
[poster](poster.png) · [video contact sheet](video-review/contact-sheet.png)

This is a focused visual refinement of the existing
[`horizontal-baler` source](../../../catalog/kits/recycling-facility/horizontal-baler.kcad.ts).
The whole recycling-facility kit already passed the current parametric quality
gate, so this round targets the asset whose preview still read as a closed
cabinet. No kit or asset IDs were added, renamed, or duplicated.

## Result

- Opened the press chamber so the ram, hydraulic drive, discharge belt, rollers,
  and strapped cardboard bale are visible together in the default view.
- Kept the existing scale control and steel materials. Added separate `rubber`
  and `recoveredMaterial` color controls, for four material controls total, and
  kept the `weathered` and `highVisibility` presets.
- Rendered the default source preview at **676 triangles** under its unchanged
  **1,800-triangle budget**. The belt, chassis, press ram, rollers and bale now
  have visibly separate colors. The high-visibility variant reads orange, and
  the weathered variant stays muted while retaining the open press mouth.
- Regenerated `catalog/index.json`. Its source SHA-256 matches the edited source,
  it points to the refreshed preview, and the asset count remains **2,390**.
- The kit gate is **153/153 passing (100%)**. The global gate is
  **2,390/2,390 passing (100%; 0 thin assets across 49 kits)**. This is further
  visual refinement; the global pass rate and catalog count did not change.
- `npx eslint catalog/kits/recycling-facility/` passed. The requested catalog
  integration suite passed **4 files / 15 tests**. The kernelCAD CLI evaluation
  passed with **75 features**. The local static builder emitted 2,390 pages and
  the baler page audit passed all 10 checks, including source hash, material
  labels, presets, and copied-preview hash.
- The default preview and both preset variant renders were opened and reviewed.
  The MP4 is H.264, 1280×720, 30 fps, 12 seconds; its five decoded samples and
  contact sheet were inspected.

The `kernelcad render inspect` attempt used the existing Chrome CDP session as
required, but Playwright timed out during CDP attachment after 30 seconds. The
command required the existing session and did not fall back to a new browser;
Chrome remained running. The deterministic software catalog preview and both
source-driven preset renders provide the visual review for this bundle. See
[`render-inspect-cdp-failure.txt`](render-inspect-cdp-failure.txt).

This branch is not deployed. No public-page update, real equipment specification,
process performance, safety, or physical acceptance is claimed. The dated
competitor comparison and official product demonstration reference are recorded
privately in `kernelCAD-private/catalog-recycling-facility-baler-compare-20261106/`;
public artifacts describe native kernelCAD behavior only.

## Reproduce

From the repository root:

```sh
npx tsx scripts/renderCatalogPreviews.ts horizontal-baler
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/recycling-facility/
npx vitest run tests/integration/catalog/
node dist/cli/index.js evaluate catalog/kits/recycling-facility/horizontal-baler.kcad.ts
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-recycling-facility-baler-20261106-pages
python3 artifacts/catalog-demos/recycling-facility-baler-quality-20261106/verify_local_page.py /tmp/kernelcad-recycling-facility-baler-20261106-pages
npx tsx artifacts/catalog-demos/recycling-facility-baler-quality-20261106/render_baler_variants.ts
python3 artifacts/catalog-demos/recycling-facility-baler-quality-20261106/capture_baler_refinement_demo.py
python3 artifacts/catalog-demos/recycling-facility-baler-quality-20261106/inspect_baler_video.py
```

`demo-settings.json` records the dimensions, exact preset palette values, video
settings, commands, and claim limits. `render_baler_variants.ts` exports and
renders the preset values from the `.kcad.ts` source. `capture_baler_refinement_demo.py`
builds the four-step video from the retained before preview, current source
preview, preset renders, and `verification.json`.

## Evidence

- [verification.json](verification.json), [catalog-build-status.json](catalog-build-status.json),
  [local-page-check.json](local-page-check.json), and the generated page build
  output record the current source, preview, and page checks.
- [preview-render-output.txt](preview-render-output.txt), [evaluate-output.txt](evaluate-output.txt),
  [quality-kit-output.txt](quality-kit-output.txt), [quality-global-output.txt](quality-global-output.txt),
  [eslint-output.txt](eslint-output.txt), and [integration-output.txt](integration-output.txt)
  retain the command evidence.
- [before-horizontal-baler.png](before-horizontal-baler.png),
  [preset-variants/](preset-variants/), [frames/](frames/), and
  [video-review/](video-review/) retain source-driven visual evidence.
- [render-inspect-cdp-failure.txt](render-inspect-cdp-failure.txt) records the
  unsuccessful CDP attach without hiding the fallback used for visual review.
