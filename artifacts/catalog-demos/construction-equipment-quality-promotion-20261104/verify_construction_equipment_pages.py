#!/usr/bin/env python3
"""Verify local construction-equipment catalog pages and linked previews."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
OUTPUT = Path(sys.argv[1]).resolve()
INDEX = json.loads((ROOT / "catalog/index.json").read_text())
ASSETS = [asset for asset in INDEX["assets"] if asset["kit"] == "construction-equipment"]
missing = []
page_count = 0

for asset in ASSETS:
    page_dir = OUTPUT / "catalog" / asset["kit"] / asset["id"]
    page = page_dir / "index.html"
    preview = page_dir / "preview.png"
    if not page.is_file():
        missing.append(str(page))
        continue
    page_count += 1
    if not preview.is_file():
        missing.append(str(preview))
    html = page.read_text()
    names = [param["name"] for param in asset["params"]]
    colors = [param["name"] for param in asset["params"] if param["type"] == "color"]
    preset_names = list((asset.get("presets") or {}).keys())
    if len(colors) < 2:
        missing.append(f"{page}: fewer than two material controls")
    if not preset_names:
        missing.append(f"{page}: no presets")
    for text in (asset["title"], *names, *preset_names):
        if text not in html:
            missing.append(f"{page}: missing {text}")

hub = OUTPUT / "catalog" / "index.html"
hub_lists_kit = hub.is_file() and 'id="kit-construction-equipment"' in hub.read_text()
if not hub_lists_kit:
    missing.append("catalog hub does not list construction-equipment")

result = {
    "command": "npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-construction-equipment-quality-promotion-20261104",
    "kitPages": page_count,
    "assetsInIndex": len(INDEX["assets"]),
    "pageAndPreviewPairs": sum(
        1 for asset in ASSETS
        if (OUTPUT / "catalog" / asset["kit"] / asset["id"] / "index.html").is_file()
        and (OUTPUT / "catalog" / asset["kit"] / asset["id"] / "preview.png").is_file()
    ),
    "hubListsKit": hub_lists_kit,
    "missing": missing,
    "passed": not missing and len(ASSETS) == 60,
}
(BUNDLE / "catalog-pages-check.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if not result["passed"]:
    raise SystemExit(1)
