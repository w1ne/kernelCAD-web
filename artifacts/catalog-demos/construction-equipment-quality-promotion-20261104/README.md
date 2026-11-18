# Construction equipment quality promotion

This handoff records a local catalog-source and preview promotion of the 60 existing `construction-equipment` assets. It adds no asset IDs. Each source now has 2–4 material-named color controls and two named appearance presets (`weathered`, `highVisibility`); detailed silhouettes were added where the machine benefits from them. The generated index records all source hashes and preview paths.

## Review the result

- [Before and after rendered previews](after/)
- [Indexed high-visibility preset renders](high-visibility-variants/)
- [Video demo](construction-equipment-quality-promotion.mp4)
- Video frame inspection (`video-review/`, not tracked)
- [Promotion audit](promotion-audit.json)
- [Local catalog page check](catalog-pages-check.json)

The MP4 shows the original preview, promoted source preview, and a render made from the catalog's indexed `highVisibility` preset values. Captions label these as local catalog renders. The local page check confirms that the generated pages contain the updated preview, color controls, and presets.

Dated comparison research is retained privately in `kernelCAD-private`; this public handoff documents native kernelCAD source and rendering behavior.

## Reproduce

From the repository root, replay the source wave and promotion, render the kit previews, and rebuild the generated catalog index:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/construction-equipment-wave-20261102/generate_construction_equipment_assets.py
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/construction-equipment-quality-promotion-20261104/promote_construction_equipment_assets.py
mapfile -t asset_ids < artifacts/catalog-demos/construction-equipment-quality-promotion-20261104/preview-asset-ids.txt
npx tsx scripts/renderCatalogPreviews.ts "${asset_ids[@]}"
npx tsx scripts/buildAssetCatalog.ts
npx eslint catalog/kits/construction-equipment/
npx vitest run tests/integration/catalog/
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-construction-equipment-quality-promotion-20261104
python3 artifacts/catalog-demos/construction-equipment-quality-promotion-20261104/verify_construction_equipment_pages.py /tmp/kernelcad-construction-equipment-quality-promotion-20261104
npx tsx artifacts/catalog-demos/construction-equipment-quality-promotion-20261104/render_construction_equipment_variants.ts
python3 artifacts/catalog-demos/construction-equipment-quality-promotion-20261104/capture_construction_equipment_demo.py
python3 artifacts/catalog-demos/construction-equipment-quality-promotion-20261104/inspect_construction_equipment_demo.py
```

The exact 60-ID preview invocation and command output are retained in `catalog-preview-render-output.txt`. See `settings.json` for the versions and completed checks. No deployed page check or hardware acceptance is claimed; the website check is a pre-promotion baseline only.

## Untracked generated outputs

`frames/` and the decoded images and contact sheets in `video-review/` are not tracked in git; they are regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/construction-equipment-quality-promotion-20261104/capture_construction_equipment_demo.py`
- video review: `python3 artifacts/catalog-demos/construction-equipment-quality-promotion-20261104/inspect_construction_equipment_demo.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
