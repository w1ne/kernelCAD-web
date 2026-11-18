# Archaeology fieldwork quality-promotion bundle — 2026-11-05

This bundle records an in-place promotion of the 50 existing
`archaeology-fieldwork` assets. It added no IDs or kits. Each source now has two
to four material-named color controls, `fieldReady` and `weathered` presets,
and per-part material assignments. Three targeted silhouette updates give the
trowel a pointed blade, the hand loupe a glass face, and the total station an
objective lens and top display.

## Results

- Kit quality gate: **50/50 assets pass**.
- Material controls: **124 across 50 assets**; **100 preset entries**.
- Previews: all 50 regenerated and indexed. All 50 index source hashes match
  their `.kcad.ts` files; every preview path has a corresponding PNG.
- Triangle counts: 48–932 under the existing 2,400-triangle budgets.
- Catalog quality: **1,904/2,390 pass (79.67%)**; **486 thin assets remain
  (20.33%)** across 10 thin kits.
- ESLint: `catalog/kits/archaeology-fieldwork/` passed with zero errors or
  warnings.
- Catalog integration: **4 files / 15 tests passed**.
- Local static pages: **50/50** archaeology pages built; parameter and preset
  names appear in each page, and all copied preview files match their rendered
  PNGs.

The [preview review](preview-review.md) records the visible forms in three
opened previews and the 50-asset contact sheet. The [video review](video-review.md)
records the inspection of the 20-second MP4 and its decoded frames.

## Replay and evidence

From the repository root at the recorded source base `bb9abf1a8`, the retained source and invocation are in
[`promote_archaeology.py`](promote_archaeology.py), [`settings.json`](settings.json),
and [`catalog-preview-render-invocation.txt`](catalog-preview-render-invocation.txt).
On the promoted sources, the transformation is an idempotent no-op. The command
outputs, local-page audit, index hash audit, quality report, and test status are
retained beside the source.

```sh
python artifacts/catalog-demos/archaeology-fieldwork-quality-promotion-20261105/promote_archaeology.py
mapfile -t asset_ids < <(find catalog/kits/archaeology-fieldwork -maxdepth 1 -type f -name '*.kcad.ts' -printf '%f\n' | sed 's/\.kcad\.ts$//')
npx tsx scripts/renderCatalogPreviews.ts "${asset_ids[@]}"
npx tsx scripts/buildAssetCatalog.ts
python artifacts/catalog-demos/archaeology-fieldwork-quality-promotion-20261105/update_archaeology_readme.py
python scripts/checkCatalogQuality.py --kit archaeology-fieldwork
npx eslint catalog/kits/archaeology-fieldwork/
npx vitest run tests/integration/catalog/
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-archaeology-fieldwork-pages-20261105
python artifacts/catalog-demos/archaeology-fieldwork-quality-promotion-20261105/verify_local_pages.py /tmp/kernelcad-archaeology-fieldwork-pages-20261105
npx tsx artifacts/catalog-demos/archaeology-fieldwork-quality-promotion-20261105/render_preset_variant.ts
python artifacts/catalog-demos/archaeology-fieldwork-quality-promotion-20261105/record_promotion_audit.py
python artifacts/catalog-demos/archaeology-fieldwork-quality-promotion-20261105/capture_archaeology_demo.py
python artifacts/catalog-demos/archaeology-fieldwork-quality-promotion-20261105/inspect_demo_video.py
```

The exact preview command with all IDs is preserved in the invocation file. The indexed `weathered`
render is in [`weathered-variants/`](weathered-variants/). Three original
previews are in [`before/`](before/), and the final 50-preview contact sheet is
in [`preview-review/`](preview-review/).

## Demo claim boundary

[`archaeology-fieldwork-quality-promotion.mp4`](archaeology-fieldwork-quality-promotion.mp4)
is a replay montage of source authoring and local software renders. It shows
local validation only. It does not show a simulation or deployed behavior, and
it does not establish field or hardware acceptance. The live homepage manifest
still contains its existing 50 archaeology cards; the live `/catalog/` and kit
routes returned 404 on 2026-11-05. See [`live-website-check.json`](live-website-check.json).

Current official archaeology fieldwork and equipment references were checked
before design. Their dated private comparison is in
`kernelCAD-private/catalog-archaeology-fieldwork-compare-20261105/COMPARISON.md`;
public docs and demos describe native kernelCAD assets only.

## Untracked generated outputs

`frames/` and the decoded images and contact sheets in `video-review/` are not tracked in git; they are regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/archaeology-fieldwork-quality-promotion-20261105/capture_archaeology_demo.py`
- video review: `python3 artifacts/catalog-demos/archaeology-fieldwork-quality-promotion-20261105/inspect_demo_video.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
