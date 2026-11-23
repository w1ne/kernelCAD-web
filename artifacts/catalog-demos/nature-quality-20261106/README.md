# Nature catalog quality round — 2026-11-06

**Demo:** [nature-quality-demo.mp4](nature-quality-demo.mp4) · [poster](poster.png)

The video shows the checked-in `.kcad.ts` material controls, rendered nature
assets and named presets, then the local catalog checks. It does not show a live
Studio session or deployed behavior.

## Round result

- Improved three existing assets in the 66-asset `nature` kit. No asset IDs or
  kits were added, renamed, or duplicated.
- Added one material color knob, `heartwood`, to the dead tree. The cairn and
  pebble cluster already used separate stone and accent colors; their four
  parameter names now expose `stoneColor` and `accentColor` clearly in Studio
  and to the quality audit.
- Added **0 new preset entries**. The dead tree's existing `charred` and
  `bleached` looks now set both bark and heartwood. Six source-driven preset
  variants were rendered for review.
- The dead tree keeps its forked trunk, root flare and tapered limbs; the new
  contrasting cut faces sit on its trunk tip and primary branches. Its default
  export is **336 triangles / 400 budget**.
- Rendered all **66/66** nature previews. The dead tree preview changed; the
  other 65 remained byte-identical. Regenerated `catalog/index.json` from
  source in the same round.
- Nature quality now passes **66/66**, up from **63/66**. Across the catalog,
  the gate moved from **2,386/2,390 (99.83%; 4 failing assets)** to
  **2,389/2,390 (99.96%; 1 failing asset)**. The remaining failure is the
  separate `props/sandbags` source. The global audit ran and reported it; the
  full nature kit passes.
- `npx eslint catalog/kits/nature/` passed. Catalog integration passed **4
  files, 15 tests**, including full source/index freshness and Studio parameter
  checks. The local static builder produced **2,390** pages; the cairn,
  pebble-cluster and dead-tree pages were checked for their controls, presets
  and preview copies.
- The MP4 is H.264, 1280×720 and 18 seconds. Its decoded frames were visually
  inspected. The video and local checks show no deployment or physical
  acceptance.

The current kernelCAD homepage and local source were reviewed before editing;
the homepage already contains the asset rail. Before this branch's change,
`https://kernelcad.com/catalog/` and the individual nature page returned 404.
This feature branch is not deployed, so no post-deployment page check is
claimed. The pre-change responses are in
[`public-site-baseline.json`](public-site-baseline.json); generated local pages
are checked in [`local-page-check.json`](local-page-check.json).

## Reproduce

From the promotion base `35fff4a5f`:

```sh
mapfile -t nature_ids < <(find catalog/kits/nature -maxdepth 1 -type f -name '*.kcad.ts' -printf '%f\n' | sed 's/\.kcad\.ts$//')
npx tsx scripts/renderCatalogPreviews.ts "${nature_ids[@]}"
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/nature/
npx vitest run tests/integration/catalog/
python scripts/checkCatalogQuality.py --kit nature
python scripts/checkCatalogQuality.py
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-nature-pages-20261106
npx tsx artifacts/catalog-demos/nature-quality-20261106/render_nature_presets.ts
python3 artifacts/catalog-demos/nature-quality-20261106/record_nature_verification.py
python3 artifacts/catalog-demos/nature-quality-20261106/capture_nature_demo.py
python3 artifacts/catalog-demos/nature-quality-20261106/inspect_nature_video.py
```

[`render_nature_presets.ts`](render_nature_presets.ts) applies exact indexed
presets to the checked-in source and rasterizes each low-poly GLB. The capture
and inspection scripts, [`demo-settings.json`](demo-settings.json),
[`preset-variants.json`](preset-variants.json), and
[`verification.json`](verification.json) retain sources, invocation settings,
source hashes, preview/index records, and local check results.

## Evidence

- [`before-previews/`](before-previews/) and the regenerated indexed previews
  show the source/output relationship.
- [`preset-variants/`](preset-variants/) contains the six exact preset renders.
- [`preview-render-output.txt`](preview-render-output.txt),
  [`catalog-build-output.txt`](catalog-build-output.txt),
  [`nature-quality-output.txt`](nature-quality-output.txt),
  [`catalog-quality-output.txt`](catalog-quality-output.txt),
  [`eslint-output.txt`](eslint-output.txt),
  [`integration-output.txt`](integration-output.txt), and
  [`local-pages-output.txt`](local-pages-output.txt) retain command evidence.
- [`check-results.json`](check-results.json) records exit codes, including the
  global audit's one known failure outside this kit.
- `frames/`, [`video-inspection.json`](video-inspection.json), and
  [`video-review/`](video-review/) retain the demo source frames, decoded MP4
  frames, contact sheet, and visual review.

## Limits

These are stylized low-poly visualization assets. Local geometry, source hash,
lint, integration, preview and page checks do not establish deployed behavior,
manufacturing suitability, or physical acceptance.

## Untracked generated outputs

`frames/` and the decoded images and contact sheets in `video-review/` are not tracked in git; they are regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/nature-quality-20261106/capture_nature_demo.py`
- video review: `python3 artifacts/catalog-demos/nature-quality-20261106/inspect_nature_video.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
