#!/usr/bin/env python3
"""Write the theatre-production kit handoff table from the generated catalog index."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
index = json.loads((ROOT / "catalog" / "index.json").read_text())
rows = [asset for asset in index["assets"] if asset["kit"] == "theatre-production"]
if len(rows) != 52 or any(not row.get("preview") for row in rows):
    raise SystemExit("expected 52 indexed theatre-production assets with previews")

triangles = [asset["stats"]["triangles"] for asset in rows]
lines = [
    "# Theatre production kit",
    "",
    f"{len(rows)} original low-poly theatre production props cover modular staging, scenery, curtains and rigging, lighting and control, audio, backstage, and touring storage. Sources use millimetres and Z up, declare their catalog origin, and expose editable `scale` and `color` controls. The indexed meshes range from {min(triangles)} to {max(triangles)} triangles with one material and a per-asset budget of 1,800 triangles.",
    "",
    "The [theatre-production wave demo bundle](../../../artifacts/catalog-demos/theatre-production-wave-20261103/README.md) retains the generator, preview audit, integration and lint results, local page check, package-boundary audit, capture settings, and inspected MP4. Local pages are checked separately from deployed behavior.",
    "",
    "| id | asset | description | knobs | triangles |",
    "| --- | --- | --- | --- | ---: |",
]
for asset in rows:
    knobs = " · ".join(param["name"] for param in asset["params"])
    lines.append(f"| `{asset['id']}` | {asset['title']} | {asset['description']} | {knobs} | {asset['stats']['triangles']} |")
lines.extend([
    "",
    "## Rebuild and verify",
    "",
    "```sh",
    "PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/theatre-production-wave-20261103/generate_theatre_assets.py",
    "npx eslint catalog/ --fix",
    "npx --silent eslint catalog/",
    "PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH node --import ./artifacts/catalog-demos/recycling-facility-wave-20261103/node-preload.mjs --import tsx scripts/buildAssetCatalog.ts",
    "PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH node --import ./artifacts/catalog-demos/recycling-facility-wave-20261103/node-preload.mjs --import tsx scripts/renderCatalogPreviews.ts",
    "PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH node --import ./artifacts/catalog-demos/recycling-facility-wave-20261103/node-preload.mjs --import tsx scripts/buildAssetCatalog.ts",
    "PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH NODE_OPTIONS=--import=./artifacts/catalog-demos/recycling-facility-wave-20261103/node-preload.mjs npx vitest run tests/integration/catalog/",
    "python3 artifacts/catalog-demos/theatre-production-wave-20261103/verify_previews.py",
    "PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH node --import ./artifacts/catalog-demos/recycling-facility-wave-20261103/node-preload.mjs --import tsx scripts/buildCatalogPages.ts /tmp/kernelcad-theatre-production-pages-wave-20261103",
    "python3 artifacts/catalog-demos/theatre-production-wave-20261103/verify_theatre_pages.py /tmp/kernelcad-theatre-production-pages-wave-20261103",
    "```",
    "",
    "## License and scope",
    "",
    "Every asset is dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). These are visualization props; catalog checks do not establish load capacity, overhead rigging safety, electrical ratings, acoustic performance, fire-code compliance, venue suitability, or physical acceptance.",
    "",
    "See the demo bundle for production visibility and local verification limits.",
    "",
])
(ROOT / "catalog" / "kits" / "theatre-production" / "README.md").write_text("\n".join(lines))

tests = json.loads((BUNDLE / "catalog-tests.json").read_text())
lint = json.loads((BUNDLE / "catalog-eslint.json").read_text())
previews = json.loads((BUNDLE / "preview-audit.json").read_text())
pages = json.loads((BUNDLE / "catalog-pages-check.json").read_text())
pack = json.loads((BUNDLE / "npm-pack-audit.json").read_text())
build = json.loads((BUNDLE / "npm-build.json").read_text())
live = json.loads((BUNDLE / "live-website-check.json").read_text())
bundle_lines = [
    "# Theatre production catalog wave",
    "",
    "[Watch the 30-second source-to-preview walkthrough](theatre-production-kit.mp4).",
    "",
    "The video shows the actual modular stage deck source and generated preview, then representative renders across all seven contact sheets. The final frame reports local catalog validation. Captions distinguish local checks from deployed behavior, stage safety, and physical acceptance.",
    "",
    "## Results",
    "",
    f"- Added 52 original theatre-production assets. The generated catalog contains {len(index['assets']):,} indexed assets in {len(index['kits'])} kits.",
    f"- All 52 theatre sources load, expose `scale` and `color`, export one material, and fit their 1,800-triangle budgets. Indexed meshes range from {min(triangles)} to {max(triangles)} triangles.",
    f"- `npx --silent eslint catalog/` passed over {lint['assetSources']:,} model sources with zero errors and warnings.",
    f"- `npx vitest run tests/integration/catalog/` passed {tests['integration']['filesPassed']} files and {tests['integration']['testsPassed']} tests.",
    f"- The preview audit found {previews['rowsWithPreview']:,} previewed index rows and {previews['previewPngs']:,} PNGs; all {previews['kitPreviewFields']} theatre assets have previews.",
    f"- Local static page generation wrote {pages['assetsInIndex']:,} asset pages; all {pages['pageAndPreviewPairs']} theatre pages contain their title, controls, and preview, and the hub lists the kit.",
    f"- `npm run build` passed with a bundled `vendor/verb-nurbs` warning about comparing a value with `NaN` using `==`. The dry-run npm audit found all {pack['theatreProductionSourcesPacked']} theatre sources and {pack['theatreProductionPreviewsPacked']} previews, no product-specific paths, and only the `./package.json` export. It wrote no tarball and ran no lifecycle scripts.",
    f"- At {live['checkedAt']}, the live homepage and `/assets.json` returned HTTP {live['homepageStatus']} and {live['assetsStatus']} with {live['assetsTotal']:,} previewed rows and no theatre-production rows. This branch is not deployed.",
    "- Corrected the Fresnel fixture spigot and shifted the intercom beltpack so their declared base origins meet the floor; regenerated their previews and rebuilt the index.",
    "",
    "## Rebuild and evidence",
    "",
    "Run from the repository root. This local audit used Node v22.23.4 and the retained preload in the recycling-facility bundle for the pinned Emscripten package. `npm ci` rejected the existing package-lock/package.json mismatch; `npm install --package-lock=false --allow-git=all` installed dependencies without changing the lockfile.",
    "",
    "The bundle retains the generator, settings, full-catalog build/test/lint output, rendered preview audit, local page verification, live baseline, npm build and package audit, source frames, decoded video contact sheet, and MP4.",
    "",
    "## License and scope",
    "",
    "All assets are original kernelCAD geometry dedicated under CC0 1.0. They are visualization props. Catalog checks do not establish load capacity, overhead rigging safety, electrical ratings, fire-code compliance, venue suitability, or physical acceptance.",
    "",
]
(BUNDLE / "README.md").write_text("\n".join(bundle_lines))
print(f"wrote theatre-production README for {len(rows)} assets")
