#!/usr/bin/env python3
"""Verify generated local detail pages, parameters and preview copies."""

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
out = Path(sys.argv[1]).resolve()
index = json.loads((ROOT / "catalog/index.json").read_text())
rows = [asset for asset in index["assets"] if asset["kit"] == "space-exploration"]
missing = []

if len(rows) != 52:
    missing.append(f"expected 52 indexed assets, found {len(rows)}")

for asset in rows:
    base = out / "catalog" / asset["kit"] / asset["id"]
    page = base / "index.html"
    preview = base / "preview.png"
    for path in (page, preview):
        if not path.is_file():
            missing.append(str(path))
    if page.is_file():
        html = page.read_text()
        for token in (asset["title"], *(param["name"] for param in asset["params"]), *asset["presets"].keys()):
            if token not in html:
                missing.append(f"{page}: missing {token}")

hub = out / "catalog/index.html"
hub_lists_kit = hub.is_file() and "space-exploration" in hub.read_text()
if not hub_lists_kit:
    missing.append("catalog hub does not list space-exploration")

result = {
    "command": "npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-space-materials-pages",
    "kitPages": len(rows),
    "assetsInIndex": len(index["assets"]),
    "pageAndPreviewPairs": len(rows) if not missing else None,
    "hubListsKit": hub_lists_kit,
    "missing": missing,
    "passed": not missing,
}
(BUNDLE / "catalog-pages-check.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if missing:
    raise SystemExit(1)
