# Grid-substation silhouette refinement

[Watch the 15-second local source-to-preview demo](grid-substation-silhouette-refinement.mp4).

This round corrects three existing grid-substation assets that were visibly
misassembled in their previews:

- The dead-tank breaker now has three horizontal grounded interrupter tanks,
  porcelain bushings seated on each tank, and a shared copper terminal link.
- The oil-bund grates now sit inside the concrete curb, with the drain sump in
  the back corner.
- The grading-ring stand now has an open octagonal copper ring above its
  porcelain support, instead of solid bars crossing the center.

The edit changes no asset IDs and adds no assets. Existing color controls,
presets, scale parameters, and 1,800-triangle budgets remain. The three changed
meshes contain 1,012, 616, and 256 triangles, respectively. This geometry-only
round adds zero color controls and zero presets.

## Verification

- Re-rendered all 80 grid-substation previews and rebuilt the generated
  2,390-row `catalog/index.json`.
- The catalog quality gate reports **2,390/2,390 assets pass (100%)** across 49
  rich kits. The pass rate was already 100% before this round; no asset count or
  quality-gate count is claimed as newly added.
- `npx eslint catalog/kits/grid-substation/` passed.
- `npx vitest run tests/integration/catalog/` passed: 4 files, 15 tests,
  including source-hash/index freshness and triangle-budget checks.
- A local catalog build generated 2,390 detail pages plus the hub; all three
  changed detail pages and preview images contain the indexed parameters and
  presets.
- The inspected MP4 shows local before/after renders and the preview/index
  workflow. This feature branch has not been deployed, so it makes no claim
  about the public catalog page. No equipment rating, electrical safety,
  grid compliance, field performance, or hardware acceptance is claimed.

## Rebuild and verify

Run from the repository root:

```sh
mapfile -t asset_ids < artifacts/catalog-demos/grid-substation-silhouette-refinement-20261106/kit-preview-asset-ids.txt
npx tsx scripts/renderCatalogPreviews.ts "${asset_ids[@]}"
npx tsx scripts/buildAssetCatalog.ts
python scripts/checkCatalogQuality.py
npx eslint catalog/kits/grid-substation/
npx vitest run tests/integration/catalog/
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-grid-substation-silhouette-refinement-20261106
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/grid-substation-silhouette-refinement-20261106/verify_local_pages.py /tmp/kernelcad-grid-substation-silhouette-refinement-20261106
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/grid-substation-silhouette-refinement-20261106/record_catalog_audit.py
python3 artifacts/catalog-demos/grid-substation-silhouette-refinement-20261106/capture_demo.py
python3 artifacts/catalog-demos/grid-substation-silhouette-refinement-20261106/inspect_demo.py
```

## Bundle contents

The bundle retains the exact changed and rendered asset ID lists, before
previews, final demo frames, render/index/lint/test/page-check logs, a
source-hash and triangle-budget audit, invocation settings, verification
results, MP4 source, and decoded video inspection. The
three `.kcad.ts` files in `catalog/kits/grid-substation/` remain the geometry
source of truth.

## Untracked generated outputs

`frames/` and the decoded images and contact sheets in `video-review/` are not tracked in git; they are regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/grid-substation-silhouette-refinement-20261106/capture_demo.py`
- video review: `python3 artifacts/catalog-demos/grid-substation-silhouette-refinement-20261106/inspect_demo.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
