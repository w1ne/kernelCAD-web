#!/usr/bin/env python3
"""Check locally generated catalog pages and linked kit previews."""

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
output = Path(sys.argv[1]).resolve()
index = json.loads((ROOT / "catalog/index.json").read_text())
rows = [asset for asset in index["assets"] if asset["kit"] == "recycling-facility"]
missing = []
page_count = 0
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
hub = output / "catalog/index.html"
hub_lists_kit = hub.is_file() and "recycling-facility" in hub.read_text()
if not hub_lists_kit:
    missing.append("catalog hub does not list recycling-facility")
result = {
    "command": "npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-recycling-facility-promotion-20261104",
    "kitPages": page_count,
    "assetsInIndex": len(index["assets"]),
    "pageAndPreviewPairs": sum(
        1 for asset in rows
        if (output / "catalog" / asset["kit"] / asset["id"] / "index.html").is_file()
        and (output / "catalog" / asset["kit"] / asset["id"] / "preview.png").is_file()
    ),
    "hubListsKit": hub_lists_kit,
    "missing": missing,
    "passed": not missing and len(rows) == 153,
}
(BUNDLE / "catalog-pages-check.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if not result["passed"]:
    raise SystemExit(1)
