#!/usr/bin/env python3
"""Verify locally generated pages for all promoted grid-substation assets."""

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
OUTPUT = Path(sys.argv[1]).resolve()
index = json.loads((ROOT / "catalog/index.json").read_text())
rows = [asset for asset in index["assets"] if asset["kit"] == "grid-substation"]
missing = []
page_preview_pairs = 0

for asset in rows:
    directory = OUTPUT / "catalog" / asset["kit"] / asset["id"]
    page = directory / "index.html"
    preview = directory / "preview.png"
    if not page.is_file():
        missing.append(f"missing page: {page}")
        continue
    if not preview.is_file():
        missing.append(f"missing preview: {preview}")
    else:
        page_preview_pairs += 1
    html = page.read_text()
    for text in (asset["title"], *(param["name"] for param in asset["params"])):
        if text not in html:
            missing.append(f"{page}: missing {text}")
    for preset in asset.get("presets", {}):
        if preset not in html:
            missing.append(f"{page}: missing preset {preset}")

hub = OUTPUT / "catalog/index.html"
hub_lists_kit = hub.is_file() and "grid-substation" in hub.read_text()
if not hub_lists_kit:
    missing.append("catalog hub does not list grid-substation")

result = {
    "command": "PATH=/home/andrii/.nvm/versions/node/v22.23.4/bin:$PATH node --import ./artifacts/catalog-demos/grid-substation-quality-promotion-20261104/node-preload.mjs --import tsx scripts/buildCatalogPages.ts /tmp/kernelcad-grid-substation-quality-promotion-20261104",
    "kitPages": sum(1 for asset in rows if (OUTPUT / "catalog" / asset["kit"] / asset["id"] / "index.html").is_file()),
    "assetsInIndex": len(index["assets"]),
    "pageAndPreviewPairs": page_preview_pairs,
    "hubListsKit": hub_lists_kit,
    "missing": missing,
    "passed": not missing and len(rows) == 80 and page_preview_pairs == 80,
}
(BUNDLE / "catalog-pages-check.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if not result["passed"]:
    raise SystemExit(1)
