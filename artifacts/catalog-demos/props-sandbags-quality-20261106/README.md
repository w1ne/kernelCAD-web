# Props sandbags quality round — 2026-11-06

**Demo:** [sandbags-quality-demo.mp4](sandbags-quality-demo.mp4) · [poster](poster.png)

The video shows the checked-in `.kcad.ts` source controls, the default and
source-driven preset renders, the straight and curved layouts, and local
catalog checks. It does not show a live Studio session or deployed behavior.

## Round result

- Improved one existing asset in the 45-asset `props` kit. No kit or asset ID
  was added, renamed or duplicated.
- The sandbag wall now exposes three material-named color controls:
  `canvasColor`, `alternateCanvasColor` and `stitchingThreadColor`. The two
  existing canvas controls were renamed from generic bag labels; the stitching
  thread control is new.
- Preserved the `military` and `white` looks, updated them to set all three
  materials, and added one `floodControl` preset. Rendered all three presets
  plus the curved layout from the checked-in source.
- Added two visible closure-seam parts per bag while retaining the 11-bag,
  three-course default arrangement and the straight/curved layout choice. The
  pillow-shaped bags remain the main silhouette. Default export is **748
  triangles / 900 budget**.
- Re-rendered and indexed all **45/45** props previews, then regenerated
  `catalog/index.json` from source in the same round. Integration checks
  confirmed every source SHA-256 matches its index row.
- The props kit moved from **44/45** to **45/45** passing. Across the catalog,
  quality moved from **2,389/2,390 (99.96%; one failing asset)** to
  **2,390/2,390 (100.00%; no failing assets, 49 rich kits)**.
- `npx eslint catalog/kits/props/` passed. Catalog integration passed **4
  files, 15 tests**, including index freshness and Studio parameter checks.
  The local static builder produced **2,390** pages; the sandbags page was
  checked for its three material labels, three preset names and copied preview.
- The MP4 is H.264, **1280×720, 15 seconds**. Its decoded frames and contact
  sheet were inspected. The local render and checks do not establish deployed
  behavior, flood-barrier performance, manufacturing suitability or physical
  acceptance.

The kernelCAD homepage and asset-library page were checked during this round;
both current public routes returned HTTP 200. This feature branch is not
deployed, so no post-deployment page check is claimed. The pre-deployment
results are in [`public-site-baseline.json`](public-site-baseline.json), and
the generated local page check is in [`local-page-check.json`](local-page-check.json).
The dated workflow comparisons are kept privately in
`kernelCAD-private/catalog-props-sandbags-quality-compare-20261106/`.

## Reproduce

From the promotion base `d8984e9c4`:

```sh
mapfile -t props_ids < <(find catalog/kits/props -maxdepth 1 -type f -name '*.kcad.ts' -printf '%f\n' | sed 's/\.kcad\.ts$//')
npx tsx scripts/renderCatalogPreviews.ts "${props_ids[@]}"
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/props/
npx vitest run tests/integration/catalog/
python3 scripts/checkCatalogQuality.py --kit props
python3 scripts/checkCatalogQuality.py
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-props-pages-20261106
npx tsx artifacts/catalog-demos/props-sandbags-quality-20261106/render_sandbags_variants.ts
python3 artifacts/catalog-demos/props-sandbags-quality-20261106/record_sandbags_verification.py
python3 artifacts/catalog-demos/props-sandbags-quality-20261106/capture_sandbags_demo.py
python3 artifacts/catalog-demos/props-sandbags-quality-20261106/inspect_sandbags_video.py
```

[`render_sandbags_variants.ts`](render_sandbags_variants.ts) exports the exact
indexed presets and the `layout=curved` parameter variant from the checked-in
source, then rasterizes their low-poly GLBs. The capture and inspection scripts,
[`demo-settings.json`](demo-settings.json),
[`preset-variants.json`](preset-variants.json), and
[`verification.json`](verification.json) retain source hashes, variant values,
video settings and verification evidence.

## Evidence

- [`before-previews/`](before-previews/) and the refreshed kit preview show the
  before/after relationship.
- [`preset-variants/`](preset-variants/) contains three preset renders and the
  curved layout render. These all use the same checked-in source.
- [`preview-render-output.txt`](preview-render-output.txt),
  [`catalog-build-output.txt`](catalog-build-output.txt),
  [`catalog-check-output.txt`](catalog-check-output.txt),
  [`props-quality-output.txt`](props-quality-output.txt),
  [`catalog-quality-output.txt`](catalog-quality-output.txt),
  [`eslint-output.txt`](eslint-output.txt),
  [`integration-output.txt`](integration-output.txt), and
  [`local-pages-output.txt`](local-pages-output.txt) retain command output.
- [`check-results.json`](check-results.json) records command exit codes.
- `frames/`, [`video-inspection.json`](video-inspection.json), and
  [`video-review/`](video-review/) retain the demo source frames, decoded MP4
  frames, contact sheet and visual-review record.

## Limits

These are stylized low-poly visualization assets. The model's layout and local
checks do not establish flood protection, civil-engineering suitability,
deployed behavior or physical acceptance.

## Untracked generated outputs

`frames/` and the decoded images and contact sheets in `video-review/` are not tracked in git; they are regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/props-sandbags-quality-20261106/capture_sandbags_demo.py`
- video review: `python3 artifacts/catalog-demos/props-sandbags-quality-20261106/inspect_sandbags_video.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
