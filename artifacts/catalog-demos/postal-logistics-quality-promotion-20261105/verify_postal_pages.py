#!/usr/bin/env python3
"""Verify all locally generated postal-logistics catalog pages and previews."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/kernelcad-postal-logistics-quality-promotion-20261105")
index = json.loads((ROOT / "catalog/index.json").read_text())
assets = [asset for asset in index["assets"] if asset["kit"] == "postal-logistics"]
failures = []
checked = []
for asset in assets:
    page = OUT / "catalog" / asset["kit"] / asset["id"] / "index.html"
    preview = OUT / "catalog" / asset["kit"] / asset["id"] / "preview.png"
    if not page.is_file() or not preview.is_file():
        failures.append(f"missing page/preview for {asset['id']}")
        continue
    html = page.read_text()
    if "highVisibility" not in html or "weathered" not in html:
        failures.append(f"missing named presets for {asset['id']}")
    if "color" in [param["name"] for param in asset["params"]]:
        failures.append(f"generic color control remains in index row for {asset['id']}")
    for param in asset["params"]:
        if param["type"] == "color" and param["name"] not in html:
            failures.append(f"missing material control {param['name']} in local page {asset['id']}")
    checked.append(asset["id"])

hub = (OUT / "catalog/index.html").read_text() if (OUT / "catalog/index.html").is_file() else ""
if "postal-logistics" not in hub:
    failures.append("catalog hub does not list postal-logistics")

report = {
    "kit": "postal-logistics",
    "localOutput": str(OUT),
    "indexedAssets": len(assets),
    "pagesAndPreviewsChecked": len(checked),
    "hubListsKit": "postal-logistics" in hub,
    "passed": not failures and len(checked) == 52,
    "failures": failures,
}
(BUNDLE / "catalog-pages-check.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
if failures or len(checked) != 52:
    raise SystemExit(1)
