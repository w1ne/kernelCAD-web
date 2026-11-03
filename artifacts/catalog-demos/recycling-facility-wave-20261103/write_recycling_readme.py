#!/usr/bin/env python3
"""Write the recycling-facility handoff from retained audit results."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
index = json.loads((ROOT / "catalog" / "index.json").read_text())
tests = json.loads((BUNDLE / "catalog-tests.json").read_text())
lint = json.loads((BUNDLE / "catalog-eslint.json").read_text())
previews = json.loads((BUNDLE / "preview-audit.json").read_text())
pages = json.loads((BUNDLE / "catalog-pages-check.json").read_text())
pack = json.loads((BUNDLE / "npm-pack-audit.json").read_text())
live = json.loads((BUNDLE / "live-website-check.json").read_text())
build = json.loads((BUNDLE / "npm-build.json").read_text())
if not all((tests["passed"], lint["passed"], previews["passed"], pages["passed"], pack["passed"], live["passed"], build["passed"])):
    raise SystemExit("refusing to write a passing handoff while any retained audit is failing")
if len(index["assets"]) != 2000 or len([asset for asset in index["assets"] if asset["kit"] == "recycling-facility"]) != 153:
    raise SystemExit("expected exactly 2,000 indexed assets with 153 recycling-facility rows")

minimum, maximum = tests["triangleRange"]
integration = tests["integration"]
lines = [
    "# Recycling facility catalog wave",
    "",
    "[Watch the 30-second source-to-preview walkthrough](recycling-facility-kit.mp4).",
    "",
    "The video shows the actual `optical-sorter-arch.kcad.ts` source and its generated preview, then representative generated previews across all seven kit sections. The last frame shows local catalog validation. The branch is not deployed; the video does not claim equipment specifications, process performance, operator safety, environmental compliance, or physical acceptance.",
    "",
    "## Results",
    "",
    f"- Added 153 original recycling-facility assets. The generated catalog contains {len(index['assets']):,} indexed assets in {len(index['kits'])} kits.",
    f"- Rendered all {previews['assetsTotal']:,} catalog previews: {previews['rowsWithPreview']:,} index rows carry previews backed by {previews['previewFiles']:,} PNGs. The new kit contributes {previews['recyclingFacilityRowsWithPreview']} previewed assets.",
    f"- All 153 new sources load, expose exactly `scale` and `color`, export one material, and fit their 1,800-triangle budgets. Indexed meshes range from {minimum} to {maximum} triangles.",
    f"- `npx --silent eslint catalog/` passed over {lint['assetSourcesAudited']:,} model sources with zero errors and warnings.",
    f"- `npx vitest run tests/integration/catalog/` passed {integration['filesPassed']} files and {integration['testsPassed']} tests, including every source build, source hash, one-material mesh, triangle budget, parameter list, and Studio opening check.",
    f"- Local static catalog generation wrote {pages['assetsInIndex']:,} asset pages; all {pages['pageAndPreviewPairs']} new-kit pages contain the asset title, controls, and preview, and the hub lists the kit.",
    f"- `npm run build` passed. It emitted one warning from bundled `vendor/verb-nurbs` about comparing a value with `NaN` using `==`. The `npm pack --dry-run --ignore-scripts --json` audit found all 153 sources and previews plus the generated index, no product-specific paths, and only the `./package.json` export. It wrote no tarball and ran no lifecycle scripts.",
    f"- At {live['checkedAt']}, the live homepage and `/assets.json` returned HTTP {live['homepageStatus']} and {live['assetsStatus']} with {live['assetsTotal']:,} previewed rows and no recycling-facility rows. This branch is not deployed, so production visibility remains unverified.",
    "",
    "## Rebuild and verify",
    "",
    "Run from the repository root. This audit used Node v22.23.4 and the retained `node-preload.mjs` to supply the CommonJS globals required by the pinned Emscripten package under its ESM loader. `npm ci` rejected the existing package-lock/package.json mismatch; `npm install --package-lock=false --allow-git=all` installed dependencies without changing the lockfile. This is a local verification detail, not a lockfile change in the wave.",
    "",
    "```sh",
    "PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/recycling-facility-wave-20261103/generate_recycling_assets.py",
    "PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH npx eslint catalog/ --fix",
    "PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH npx --silent eslint catalog/",
    "PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH node --import ./artifacts/catalog-demos/recycling-facility-wave-20261103/node-preload.mjs --import tsx scripts/buildAssetCatalog.ts",
    "PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH node artifacts/catalog-demos/recycling-facility-wave-20261103/render_recycling_previews.mjs",
    "PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH node --import ./artifacts/catalog-demos/recycling-facility-wave-20261103/node-preload.mjs --import tsx scripts/buildAssetCatalog.ts",
    "PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH NODE_OPTIONS=--import=./artifacts/catalog-demos/recycling-facility-wave-20261103/node-preload.mjs npx vitest run tests/integration/catalog/",
    "PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/recycling-facility-wave-20261103/verify_previews.py",
    "PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH node --import ./artifacts/catalog-demos/recycling-facility-wave-20261103/node-preload.mjs --import tsx scripts/buildCatalogPages.ts /tmp/kernelcad-recycling-facility-pages-wave-20261103",
    "PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/recycling-facility-wave-20261103/verify_recycling_pages.py /tmp/kernelcad-recycling-facility-pages-wave-20261103",
    "PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH npm run build",
    "PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH npm pack --dry-run --ignore-scripts --json > artifacts/catalog-demos/recycling-facility-wave-20261103/npm-pack-dry-run.json",
    "node artifacts/catalog-demos/recycling-facility-wave-20261103/audit_npm_pack.mjs",
    "PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/recycling-facility-wave-20261103/capture_recycling_demo.py",
    "PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/recycling-facility-wave-20261103/inspect_recycling_video.py",
    "```",
    "",
    "The bundle retains the source generator, runtime preload, invocation settings, full-catalog build and test output, lint summary, preview audit, local page check, live baseline, package build and boundary audit, source frames, decoded video review sheet, and MP4.",
    "",
    "## License and scope",
    "",
    "All models are original kernelCAD geometry dedicated under CC0 1.0. They are visualization props. Catalog checks do not establish equipment specifications, process performance, operator safety, environmental compliance, or physical acceptance.",
    "",
]
(BUNDLE / "README.md").write_text("\n".join(lines))
print(f"wrote recycling-facility handoff for {len(index['assets'])} indexed assets")
