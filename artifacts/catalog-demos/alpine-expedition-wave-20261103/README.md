# Alpine expedition catalog wave

[Watch the 30-second local workflow demo](alpine-expedition-kit.mp4).

The video shows the generated basecamp tent source and mesh preview, contact sheets covering all 50 assets, and the final local index, mesh, preview, Studio, page, and npm package checks. Its final frame distinguishes the current public homepage snapshot from this unmerged, undeployed branch. These are generic CC0 scene props; they make no climbing, rescue, weather-protection, performance, equipment-rating, safety, or physical-acceptance claim.

## Rebuild and verify

Run from the repository root:

```sh
python3 artifacts/catalog-demos/alpine-expedition-wave-20261103/generate_alpine_assets.py
npx eslint catalog/ --fix
npx eslint catalog/
npx tsx scripts/buildAssetCatalog.ts
npx tsx scripts/renderCatalogPreviews.ts
npx tsx scripts/buildAssetCatalog.ts
npx vitest run tests/integration/catalog/
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-alpine-expedition-pages
python3 artifacts/catalog-demos/alpine-expedition-wave-20261103/verify_alpine_pages.py /tmp/kernelcad-alpine-expedition-pages
python3 artifacts/catalog-demos/alpine-expedition-wave-20261103/check_catalog_previews.py
python3 artifacts/catalog-demos/alpine-expedition-wave-20261103/check_live_site.py
npm pack --dry-run --json
mkdir -p /tmp/kernelcad-alpine-expedition-npm-pack
npm pack --ignore-scripts --json --pack-destination /tmp/kernelcad-alpine-expedition-npm-pack
python3 artifacts/catalog-demos/alpine-expedition-wave-20261103/audit_npm_pack.py /tmp/kernelcad-alpine-expedition-npm-pack/kernelcad-0.17.4.tgz
python3 artifacts/catalog-demos/alpine-expedition-wave-20261103/record_alpine_checks.py
python3 artifacts/catalog-demos/alpine-expedition-wave-20261103/record_demo_results.py
python3 artifacts/catalog-demos/alpine-expedition-wave-20261103/write_alpine_readme.py
python3 artifacts/catalog-demos/alpine-expedition-wave-20261103/capture_alpine_demo.py
python3 artifacts/catalog-demos/alpine-expedition-wave-20261103/inspect_alpine_video.py
```

`generate_alpine_assets.py` is the retained source generator; `settings.json` records its invocation, knob ranges, asset list, grounding rule, and verification scope. The captured command outputs and JSON summaries sit beside this README. `video-review/` holds ten decoded samples, a contact sheet, and MP4 metadata.

## Verification summary

- 50 new indexed sources, all with fresh source hashes, exactly `scale` and `color` knobs, one material, and a zero-height base.
- 50 indexed previews and 50 PNG files; new meshes range from 72 to 580 triangles against a 2,400-triangle budget.
- The full branch index has 1,591 preview fields and 1,591 matching PNG files, with no missing rows or files.
- Catalog integration suite: 4 files and 15 tests passed. All 50 local generated pages contain their preview and both knobs.
- The built `kernelcad@0.17.4` tarball includes the 50 sources and 50 previews. Its package export map remains `./package.json`, and the archive scan found no commercial product paths.

The first integration attempt caught a base-height defect in several generated props. The source generator now computes a minimum-Z offset and applies it to all component geometry before scaling. The failed run is retained as `catalog-test-initial-failure.txt`; `catalog-test-output.txt` is the final passing run.

## Current live site and limits

The public homepage and `/assets.json` were checked on 2026-11-03. The live endpoint returned 1,291 assets and 1,291 preview paths. This branch has 1,591 indexed assets after the new kit, but it has not been deployed; the live count does not include this wave. Verify the deployed homepage after merge. Local renders, generated pages, package contents, and the catalog suite do not establish deployed behavior, field performance, equipment safety, or physical acceptance.

## Untracked generated outputs

`frames/` and the decoded images and contact sheets in `video-review/` are not tracked in git; they are regenerated from the files in this bundle:

- frames and MP4: `python3 artifacts/catalog-demos/alpine-expedition-wave-20261103/capture_alpine_demo.py`
- video review: `python3 artifacts/catalog-demos/alpine-expedition-wave-20261103/inspect_alpine_video.py`

Run from the repository root; each script header lists the inputs it needs. Regenerated files are git-ignored. Rerunning the capture script also re-encodes the MP4.
