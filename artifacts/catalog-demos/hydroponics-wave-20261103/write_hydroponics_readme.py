#!/usr/bin/env python3
"""Write the hydroponics kit handoff table from the generated catalog index."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
index = json.loads((ROOT / "catalog" / "index.json").read_text())
rows = [asset for asset in index["assets"] if asset["kit"] == "hydroponics"]
if len(rows) != 52 or any(not row.get("preview") for row in rows):
    raise SystemExit("expected 52 indexed hydroponics assets with previews")

triangles = [asset["stats"]["triangles"] for asset in rows]
lines = [
    "# Hydroponics kit",
    "",
    f"{len(rows)} original low-poly controlled-environment growing props cover greenhouse structures, hydroponic beds, nutrient storage and delivery, filtering, sensing, climate equipment, and crop support. Sources use millimetres, Z up, a base at z=0, and editable `scale` and `color` controls. The indexed meshes range from {min(triangles)} to {max(triangles)} triangles with one material and a per-asset budget of 1,800 triangles.",
    "",
    "The [hydroponics wave demo bundle](../../../artifacts/catalog-demos/hydroponics-wave-20261103/README.md) retains the generator, preview audit, integration and lint results, local page check, package-boundary audit, capture settings, and inspected MP4. Local pages are checked separately from deployed behavior.",
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
    "python3 artifacts/catalog-demos/hydroponics-wave-20261103/generate_hydroponics_assets.py",
    "npx eslint catalog/ --fix",
    "npx eslint catalog/",
    "npx tsx scripts/buildAssetCatalog.ts",
    "npx tsx scripts/renderCatalogPreviews.ts",
    "npx tsx scripts/buildAssetCatalog.ts",
    "npx vitest run tests/integration/catalog/",
    "python3 artifacts/catalog-demos/hydroponics-wave-20261103/verify_previews.py",
    "npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-hydroponics-pages-wave-20261103",
    "python3 artifacts/catalog-demos/hydroponics-wave-20261103/verify_hydroponics_pages.py /tmp/kernelcad-hydroponics-pages-wave-20261103",
    "```",
    "",
    "## License and scope",
    "",
    "Every asset is dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). These are generic visualization props; catalog checks do not establish greenhouse compliance, crop performance, food-contact suitability, chemical compatibility, sensor calibration, equipment ratings, or physical acceptance.",
    "",
    "See the demo bundle for production visibility and local verification limits.",
    "",
])
(ROOT / "catalog" / "kits" / "hydroponics" / "README.md").write_text("\n".join(lines))
print(f"wrote hydroponics README for {len(rows)} assets")
