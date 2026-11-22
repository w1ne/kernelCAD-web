#!/usr/bin/env python3
"""Verify the local catalog pages generated from the promoted index."""

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
OUTPUT = Path(sys.argv[1]).resolve()
index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
rows = [row for row in index["assets"] if row["kit"] == "amusement-park"]
missing = []
pairs = 0
for row in rows:
    directory = OUTPUT / "catalog" / row["kit"] / row["id"]
    page = directory / "index.html"
    preview = directory / "preview.png"
    if not page.is_file():
        missing.append(f"missing page: {page}")
        continue
    if not preview.is_file():
        missing.append(f"missing preview: {preview}")
    else:
        pairs += 1
    html = page.read_text(encoding="utf-8")
    for expected in (row["title"], *(param["name"] for param in row["params"]), *row.get("presets", {})):
        if expected not in html:
            missing.append(f"{page}: missing {expected}")

hub = OUTPUT / "catalog/index.html"
hub_lists_kit = hub.is_file() and "amusement-park" in hub.read_text(encoding="utf-8")
if not hub_lists_kit:
    missing.append("catalog hub does not list amusement-park")

result = {
    "command": "scripts/buildCatalogPages.ts /tmp/kernelcad-amusement-park-quality-promotion-20261104",
    "kitPages": sum(1 for row in rows if (OUTPUT / "catalog" / row["kit"] / row["id"] / "index.html").is_file()),
    "assetsInIndex": len(index["assets"]),
    "pageAndPreviewPairs": pairs,
    "hubListsKit": hub_lists_kit,
    "missing": missing,
    "passed": not missing and len(rows) == 70 and pairs == 70,
}
(BUNDLE / "catalog-pages-check.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result, indent=2))
if not result["passed"]:
    raise SystemExit(1)
