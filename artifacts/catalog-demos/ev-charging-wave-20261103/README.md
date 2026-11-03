# EV charging infrastructure catalog wave

[Watch the 30-second local workflow demo](ev-charging-infrastructure.mp4).

The video shows an editable DC charger source and its generated mesh, contact sheets covering all 50 assets, and the local catalog audit. The last frame distinguishes the current live-site snapshot from this unmerged, undeployed branch. These are generic scene props; they make no electrical-design, charging-performance, installation, safety, or physical-acceptance claim.

## Rebuild and verify

Run from the repository root:

```sh
python3 artifacts/catalog-demos/ev-charging-wave-20261103/generate_ev_charging_assets.py
npx eslint catalog/ --format json
npx tsx scripts/buildAssetCatalog.ts
npx tsx scripts/renderCatalogPreviews.ts
npx tsx scripts/buildAssetCatalog.ts
npx vitest run tests/integration/catalog/
python3 artifacts/catalog-demos/ev-charging-wave-20261103/check_live_site.py
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-ev-charging-pages
python3 artifacts/catalog-demos/ev-charging-wave-20261103/verify_ev_charging_pages.py /tmp/kernelcad-ev-charging-pages
npm pack --dry-run --json
mkdir -p /tmp/kernelcad-ev-charging-npm-pack
npm pack --ignore-scripts --json --pack-destination /tmp/kernelcad-ev-charging-npm-pack
python3 artifacts/catalog-demos/ev-charging-wave-20261103/audit_npm_pack.py /tmp/kernelcad-ev-charging-npm-pack/kernelcad-0.17.4.tgz
python3 artifacts/catalog-demos/ev-charging-wave-20261103/write_ev_charging_readme.py
python3 artifacts/catalog-demos/ev-charging-wave-20261103/record_ev_charging_checks.py
python3 artifacts/catalog-demos/ev-charging-wave-20261103/capture_ev_charging_demo.py
python3 artifacts/catalog-demos/ev-charging-wave-20261103/inspect_ev_charging_video.py --manual-inspection-passed
```

`generate_ev_charging_assets.py` writes the 50 model sources, kit metadata, and `settings.json`. `asset-check-results.json` records each source hash, knob list, preview path, triangle count, material count, local pages, integration summary, and npm boundary check. The command output logs are retained beside this README. The MP4 source, generated frames, decoded samples, contact sheet, checksum, and review metadata are retained here.

## Audit summary

- **50 / 50 assets passed**; branch total **1,541**.
- Each asset exposes `scale` and `color`, uses one material, has a base origin, and stays within its 2,400-triangle budget. Measured exports range from **92 to 388 triangles**.
- **1,541 / 1,541 indexed assets** have preview paths and rendered files.
- Catalog integration: **4 files and 15 tests passed**. The static-page test also passes with **1,541 unique page titles**. Generated local pages: **50 / 50** include their preview and listed parameters.
- The built `kernelcad@0.17.4` tarball includes all 50 new sources and previews; the package-boundary audit found no hosted commercial product paths across **3,475 package files**.
- Current live homepage and `/assets.json`: **1,291 preview-backed assets**. This branch is not deployed; live behavior for the new kit is unverified.

## Scope

All models are original generic geometry dedicated to the public domain under CC0 1.0. They are scene props, not vendor product replicas or evidence for electrical compatibility, charger performance, code compliance, installation design, safety certification, site suitability, or physical acceptance.
