#!/usr/bin/env python3
"""Verify locally generated hydroponics detail pages and copied previews."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
output = Path(sys.argv[1]).resolve()
index = json.loads((ROOT / "catalog/index.json").read_text())
rows = [asset for asset in index["assets"] if asset["kit"] == "hydroponics"]
missing = []
page_count = 0
preset_count = 0

for asset in rows:
    directory = output / "catalog" / asset["kit"] / asset["id"]
    page = directory / "index.html"
    preview = directory / "preview.png"
    if not page.is_file():
        missing.append(str(page))
        continue
    page_count += 1
    if not preview.is_file():
        missing.append(str(preview))
    html = page.read_text()
    for text in (asset["title"], *(param["name"] for param in asset["params"])):
        if text not in html:
            missing.append(f"{page}: missing {text}")
    for preset in ("weathered", "highVisibility"):
        if preset not in asset.get("presets", {}):
            missing.append(f"{asset['id']}: missing indexed {preset} preset")
        else:
            preset_count += 1

hub = output / "catalog/index.html"
hub_lists_kit = hub.is_file() and "hydroponics" in hub.read_text()
if not hub_lists_kit:
    missing.append("catalog hub does not list hydroponics")

result = {
    "command": "npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-hydroponics-quality-20261105",
    "kitPages": page_count,
    "assetsInIndex": len(index["assets"]),
    "pageAndPreviewPairs": len(rows) - sum(1 for item in missing if item.endswith("index.html") or item.endswith("preview.png")),
    "indexedPresetEntries": preset_count,
    "hubListsKit": hub_lists_kit,
    "missing": missing,
    "passed": not missing and len(rows) == 52,
}
(BUNDLE / "catalog-pages-check.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if missing or len(rows) != 52:
    raise SystemExit(1)
