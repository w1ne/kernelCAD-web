# EV charging infrastructure quality promotion

[Watch the 24-second local demo](ev-charging-infrastructure-quality-promotion.mp4).

This round promotes the **50 existing EV charging infrastructure IDs**. It adds no assets. Every `.kcad.ts` source keeps its editable scale parameter and now exposes two to four material-named color controls, with `fleetReady` and `nightService` presets. The kit has 159 material controls, 100 named preset entries (318 preset values), and 50 refreshed previews indexed in `catalog/index.json`.

The preview review covers three representative shapes: the compact DC charger reads as a floor unit with a screen, status button, and paired leads; the generic NACS connector reads as a grip and nose with a separate dark cable; and the solar carport reads as a light support frame with sloped dark panels. Those three use 176–492 triangles; the full kit ranges from 92 to 492 triangles under the existing 2,400-triangle budgets.

The [kit README](../../../catalog/kits/ev-charging-infrastructure/README.md) lists the material controls and generated triangle counts for every source. The [catalog asset guide](../../../docs/catalog-assets.md) records the updated quality snapshot. These are local source and rendering results; the branch is not deployed, and no electrical performance, installation safety, certification, site suitability, or hardware acceptance is claimed.

## Rebuild and verify

Run from the repository root:

```sh
python3 artifacts/catalog-demos/ev-charging-infrastructure-quality-promotion-20261105/promote_assets.py
python3 artifacts/catalog-demos/ev-charging-infrastructure-quality-promotion-20261105/render_kit_previews.py
npx tsx scripts/buildAssetCatalog.ts
python3 artifacts/catalog-demos/ev-charging-infrastructure-quality-promotion-20261105/update_kit_readme.py
npx tsx artifacts/catalog-demos/ev-charging-infrastructure-quality-promotion-20261105/render_preset_variants.ts
python3 artifacts/catalog-demos/ev-charging-infrastructure-quality-promotion-20261105/verify_assets.py
npx eslint catalog/kits/ev-charging-infrastructure/
npx vitest run tests/integration/catalog/
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-ev-charging-quality-pages
python3 artifacts/catalog-demos/ev-charging-infrastructure-quality-promotion-20261105/verify_catalog_pages.py /tmp/kernelcad-ev-charging-quality-pages
npm pack --json --pack-destination /tmp/kernelcad-ev-pack-20261105
python3 artifacts/catalog-demos/ev-charging-infrastructure-quality-promotion-20261105/audit_npm_pack.py /tmp/kernelcad-ev-pack-20261105/kernelcad-0.17.4.tgz
python3 artifacts/catalog-demos/ev-charging-infrastructure-quality-promotion-20261105/make_demo_video.py
python3 artifacts/catalog-demos/ev-charging-infrastructure-quality-promotion-20261105/inspect_video.py --manual-review
```

`promote_assets.py` applies material controls to named components and makes the connector grip, charger plugs, and photovoltaic panels more distinct. `render_kit_previews.py` renders all 50 existing IDs in five fresh batches of ten. The preset script uses `catalogStore.variantSource` and the catalog renderer, so the comparison PNGs come from the values stored in the indexed presets. `settings.json`, `asset-inventory.json`, preview before/after PNGs, preset PNGs, test logs, and video inspection frames retain the commands and evidence.

## Verification

- Kit quality gate: **50/50 assets pass** with two to four material-named controls and presets; 159 material controls and 100 named presets are indexed.
- ID and index checks: the same 50 IDs remain; all source SHA-256 values match the generated index, all 50 preview files and routes exist, and every mesh is below budget.
- Visual review: `compact-dc-fast-charger.png`, `nacs-connector.png`, and `solar-ev-carport.png` were opened after the final kit render. The inspected [MP4](ev-charging-infrastructure-quality-promotion.mp4) shows the actual previews and preset variants; its decoded frames and inspection record are under `video-review/` and `video-inspection.json`.
- Lint: `npx eslint catalog/kits/ev-charging-infrastructure/` passed.
- Catalog integration: **4 files and 15 tests passed**, including source/index parameter matching, stale-source rejection, and all catalog exports within their triangle budgets.
- Local pages: the page builder emitted 2,390 asset pages; all 50 EV pages include their preview and listed parameters. This is a local page check, not hosted verification.
- Built npm package: the prepack build succeeded. The 5,200-file tarball contains the catalog index, all 50 EV sources and previews, and the Studio player; the package-boundary audit found no private product paths. Package exports remain `./package.json` only.
- Global quality audit: **1,754/2,390 assets pass (73.39%)**; **636 thin assets remain (26.61%)** across the rest of the catalog.

The [public homepage](https://kernelcad.com/) currently presents the model editor, checks, exports, and gallery, while the [script API](https://kernelcad.com/docs/) documents native geometry, material, and parameter calls. The catalog-page output was verified locally; this branch has not been deployed, so live page behavior remains unverified.

## Untracked generated outputs

`frames/` and the decoded images and contact sheets in `video-review/` are not tracked in git; they are regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/ev-charging-infrastructure-quality-promotion-20261105/make_demo_video.py`
- video review: `python3 artifacts/catalog-demos/ev-charging-infrastructure-quality-promotion-20261105/inspect_video.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
