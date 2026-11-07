#!/usr/bin/env python3
"""Verify local asset pages include promoted controls, presets and previews."""

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
output = Path(sys.argv[1]).resolve()
index = json.loads((ROOT / "catalog/index.json").read_text())
rows = [item for item in index["assets"] if item["kit"] == "theatre-production"]
missing = []
pages = 0

for asset in rows:
    directory = output / "catalog" / asset["kit"] / asset["id"]
    page = directory / "index.html"
    preview = directory / "preview.png"
    if not page.is_file():
        missing.append(f"missing page: {page}")
        continue
    pages += 1
    if not preview.is_file():
        missing.append(f"missing preview: {preview}")
    html = page.read_text()
    controls = [param["name"] for param in asset["params"]]
    preset_names = list(asset.get("presets", {}))
    for expected in (asset["title"], *controls, *preset_names):
        if expected not in html:
            missing.append(f"{asset['id']}: page is missing {expected}")

hub = output / "catalog/index.html"
hub_lists_kit = hub.is_file() and "theatre-production" in hub.read_text()
if not hub_lists_kit:
    missing.append("local catalog hub does not list theatre-production")

result = {
    "command": f"npx tsx scripts/buildCatalogPages.ts {output}",
    "assetsInIndex": len(index["assets"]),
    "kitPages": pages,
    "pageAndPreviewPairs": 52 - sum(1 for item in missing if item.startswith("missing page:") or item.startswith("missing preview:")),
    "hubListsKit": hub_lists_kit,
    "missing": missing,
    "passed": not missing and len(rows) == 52,
}
(BUNDLE / "catalog-pages-check.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if missing or len(rows) != 52:
    raise SystemExit(1)
