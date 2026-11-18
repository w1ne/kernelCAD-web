#!/usr/bin/env python3
"""Verify the three locally generated catalog pages and their rendered previews."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
OUTPUT = Path(sys.argv[1]).resolve()
IDS = (BUNDLE / "preview-asset-ids.txt").read_text(encoding="utf-8").splitlines()
index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
assets = {asset["id"]: asset for asset in index["assets"]}
missing = []
checked = 0

for asset_id in IDS:
    asset = assets.get(asset_id)
    if asset is None:
        missing.append(f"{asset_id}: missing from catalog index")
        continue
    directory = OUTPUT / "catalog" / asset["kit"] / asset["id"]
    page = directory / "index.html"
    preview = directory / "preview.png"
    if not page.is_file():
        missing.append(f"{asset_id}: missing generated page")
        continue
    if not preview.is_file():
        missing.append(f"{asset_id}: missing copied preview")
        continue
    html = page.read_text(encoding="utf-8")
    for text in (asset["title"], *(param["name"] for param in asset["params"]), *asset.get("presets", {})):
        if text not in html:
            missing.append(f"{asset_id}: page missing {text}")
    checked += 1

hub = OUTPUT / "catalog" / "index.html"
hub_lists_kit = hub.is_file() and "grid-substation" in hub.read_text(encoding="utf-8")
if not hub_lists_kit:
    missing.append("catalog hub does not list grid-substation")

result = {
    "command": "npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-grid-substation-silhouette-refinement-20261106",
    "assetIds": IDS,
    "pagesAndPreviewsChecked": checked,
    "hubListsKit": hub_lists_kit,
    "missing": missing,
    "passed": not missing and checked == len(IDS),
}
(BUNDLE / "catalog-pages-check.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result, indent=2))
if not result["passed"]:
    raise SystemExit(1)
