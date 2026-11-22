#!/usr/bin/env python3
"""Check locally generated asset pages, material controls, presets and previews."""

import json
import sys
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
output = Path(sys.argv[1]).resolve()
index = json.loads((ROOT / "catalog/index.json").read_text())
rows = [asset for asset in index["assets"] if asset["kit"] == "mining"]
missing = []
checked = 0

for asset in rows:
    page = output / "catalog" / asset["kit"] / asset["id"] / "index.html"
    preview = output / "catalog" / asset["kit"] / asset["id"] / "preview.png"
    if not page.is_file():
        missing.append(f"missing page: {page}")
        continue
    if not preview.is_file():
        missing.append(f"missing preview copy: {preview}")
        continue
    html = page.read_text()
    expected = [asset["title"], *(param["name"] for param in asset["params"]), *asset.get("presets", {}).keys()]
    absent = [token for token in expected if token not in html]
    if absent:
        missing.append(f"{asset['id']}: missing page fields {absent}")
    checked += 1

hub = output / "catalog/index.html"
hub_lists_kit = hub.is_file() and "mining" in hub.read_text()
if not hub_lists_kit:
    missing.append("generated catalog hub does not list mining")

result = {
    "command": "npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-mining-quality-20261105",
    "kitPages": len(rows),
    "pageAndPreviewPairs": checked,
    "hubListsKit": hub_lists_kit,
    "missing": missing,
    "passed": not missing and len(rows) == 50 and checked == 50,
}
(BUNDLE / "catalog-pages-check.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if not result["passed"]:
    raise SystemExit(1)
