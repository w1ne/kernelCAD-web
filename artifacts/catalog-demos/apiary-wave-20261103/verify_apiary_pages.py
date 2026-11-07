#!/usr/bin/env python3
"""Check the generated local static catalog pages for this kit."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(sys.argv[1]).resolve()
index = json.loads((ROOT / "catalog" / "index.json").read_text())
assets = [asset for asset in index["assets"] if asset["kit"] == "apiary"]
missing = []
for asset in assets:
    page = OUT / "catalog" / "apiary" / asset["id"] / "index.html"
    preview = OUT / "catalog" / "apiary" / asset["id"] / "preview.png"
    if not page.is_file() or not preview.is_file():
        missing.append(asset["id"])
    elif asset["title"] not in page.read_text():
        missing.append(asset["id"] + " (title missing)")
if missing:
    raise SystemExit("missing or incomplete local asset pages: " + ", ".join(missing))
result = {
    "scope": "local generated static pages",
    "kit": "apiary",
    "kitPagesAndPreviews": len(assets),
    "assetsInIndex": len(index["assets"]),
    "hubExists": (OUT / "catalog" / "index.html").is_file(),
}
if not result["hubExists"]:
    raise SystemExit("local catalog hub page is missing")
print(json.dumps(result, indent=2))
