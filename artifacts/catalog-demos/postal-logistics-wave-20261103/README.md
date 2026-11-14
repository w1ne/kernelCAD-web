# Postal logistics catalog wave

[Watch the 30-second local workflow demo](postal-logistics-kit.mp4)

The MP4 shows a real `package-induction-conveyor.kcad.ts` source and its rendered preview, then all 52 generated previews in seven contact sheets. The final frame reports the source/index/mesh audit, catalog lint, integration suite and locally generated pages. Captions identify this as local replay and validation; the production catalog, operational suitability and physical acceptance are separate.

## Results

- Added 52 postal-logistics assets; the generated catalog contains 1,743 total assets.
- Rendered all 1,743 catalog previews and rebuilt the index. Every row now has a preview path and matching PNG file.
- All 52 postal sources match their indexed source hash, expose exactly `scale` and `color`, start at z=0, export one material, and remain within the 1,800-triangle budget. Their audited meshes range from 96 to 240 triangles.
- `npx eslint catalog/` passed across 1,743 source files with zero errors or warnings.
- `npx vitest run tests/integration/catalog/` passed 4 files and 15 tests.
- `npm run build` passed. `npm pack --dry-run --ignore-scripts --json` included all 52 postal sources and previews, the generated index and 75 built `dist/` files; it wrote no tarball, ran no lifecycle scripts, preserved the existing `./package.json`-only export, and found no product-specific paths.
- Local static generation produced and verified 52 asset pages and previews; the catalog hub lists `postal-logistics`.
- The live production check at 2026-11-03 05:38 UTC returned HTTP 200 for the homepage and `/assets.json`; all 1,291 live rows had previews and there were no postal-logistics rows. `/catalog/` returned HTTP 404. This feature branch is not deployed, so the new kit's live visibility remains unverified.

## Rebuild and verify

Run from the repository root:

```sh
python3 artifacts/catalog-demos/postal-logistics-wave-20261103/generate_postal_assets.py
npx eslint catalog/ --fix
npx eslint catalog/
npx tsx scripts/buildAssetCatalog.ts
npx tsx scripts/renderCatalogPreviews.ts
npx tsx scripts/buildAssetCatalog.ts
npx tsx scripts/renderCatalogPreviews.ts carrier-route-sequence-rack
npx tsx scripts/renderCatalogPreviews.ts carrier-satchel
npx tsx scripts/buildAssetCatalog.ts
npx vitest run tests/integration/catalog/
python3 artifacts/catalog-demos/postal-logistics-wave-20261103/record_postal_checks.py
python3 artifacts/catalog-demos/postal-logistics-wave-20261103/record_catalog_lint.py
python3 artifacts/catalog-demos/postal-logistics-wave-20261103/record_preview_audit.py
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-postal-pages-wave-20261103
python3 artifacts/catalog-demos/postal-logistics-wave-20261103/verify_postal_pages.py /tmp/kernelcad-postal-pages-wave-20261103
python3 artifacts/catalog-demos/postal-logistics-wave-20261103/check_live_website.py
npm run build
node artifacts/catalog-demos/postal-logistics-wave-20261103/audit_npm_pack.mjs
python3 artifacts/catalog-demos/postal-logistics-wave-20261103/write_postal_readme.py
python3 artifacts/catalog-demos/postal-logistics-wave-20261103/capture_postal_demo.py
python3 artifacts/catalog-demos/postal-logistics-wave-20261103/inspect_postal_video.py
```

The bundle retains the generator, invocation settings, full preview-render log, two targeted preview rerender records, lint summary and raw report, mesh/index audit, integration output, preview audit, local-page build output and check, live production baseline, build output, npm pack boundary audit, source frames and MP4 inspection bundle.

## License and scope

All assets are original kernelCAD geometry dedicated under CC0 1.0. They are stylized visualization props; they do not claim parcel throughput, machinery safety, postal compliance, production engineering suitability or physical acceptance.

## Untracked generated outputs

`frames/` and the decoded images and contact sheets in `video-review/` are not tracked in git; they are regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/postal-logistics-wave-20261103/capture_postal_demo.py`
- video review: `python3 artifacts/catalog-demos/postal-logistics-wave-20261103/inspect_postal_video.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
