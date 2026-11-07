# Apiary catalog wave demo

[Watch the 30-second local workflow demo](apiary-kit.mp4)

The video shows a real `langstroth-hive.kcad.ts` source and its rendered preview,
all 50 generated apiary previews, and the retained local mesh, lint, integration
and static-page checks. It is a local replay and validation demo. The branch is
not deployed; it makes no deployed-visibility, husbandry, food-contact or
physical-acceptance claim.

## Rebuild and verify

Run from the repository root:

```sh
python3 artifacts/catalog-demos/apiary-wave-20261103/generate_apiary_assets.py
npx eslint catalog/ --fix
npx tsx scripts/buildAssetCatalog.ts
python3 artifacts/catalog-demos/apiary-wave-20261103/render_apiary_previews.py
npx eslint catalog/
npx tsx scripts/buildAssetCatalog.ts
npx vitest run tests/integration/catalog/
python3 artifacts/catalog-demos/apiary-wave-20261103/record_apiary_checks.py
npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-apiary-pages
python3 artifacts/catalog-demos/apiary-wave-20261103/verify_apiary_pages.py /tmp/kernelcad-apiary-pages
python3 artifacts/catalog-demos/apiary-wave-20261103/record_live_check.py
node artifacts/catalog-demos/apiary-wave-20261103/audit_npm_pack.mjs
python3 artifacts/catalog-demos/apiary-wave-20261103/capture_apiary_demo.py
python3 artifacts/catalog-demos/apiary-wave-20261103/inspect_apiary_video.py --manual-inspection-passed
```

`catalog-build-output.txt`, `catalog-lint-output.txt`,
`catalog-test-output.txt`, `asset-check-results.json`,
`catalog-pages-check.json`, and `live-website-check.json` retain local check
results and current production status. `npm-pack-audit.json` checks that the
publishable package contains the 50 apiary sources and previews without adding
product files or package exports. `settings.json` records capture settings;
`video-review/` contains decoded frames, a contact sheet and MP4 metadata. The
generator, preview runner, page checker, package audit, capture and inspection
scripts preserve the invocations.

## Scope and limits

All 50 `.kcad.ts` sources declare `scale` and `color`, use one material, and
carry an 1,800-triangle ceiling. The recorded catalog audit checks each source
builds, its mesh is within budget and its index row lists the same knobs the
Studio loader evaluates. Local page generation is checked separately from the
current public site. This branch was not deployed when the live status was
recorded.

The models are generic CC0 scene props. Mesh and catalog checks do not establish
beekeeping method suitability, biological efficacy, food-contact suitability,
equipment ratings, regulatory compliance or physical acceptance.
