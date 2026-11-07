#!/usr/bin/env python3
"""Verify locally generated sports detail pages and the catalog hub."""

import hashlib
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/kernelcad-sports-catalog-pages").resolve()
index = json.loads((ROOT / "catalog/index.json").read_text())
assets = [row for row in index["assets"] if row["kit"] == "sports"]
failures = []
checked = []
controls = []

hub_path = OUT / "catalog/index.html"
if not hub_path.is_file():
    failures.append("generated catalog hub is missing")
else:
    hub = hub_path.read_text()
    expected = f"{len(index['assets'])} free CC0 low-poly 3D models in {len(index['kits'])} kits"
    if expected not in hub:
        failures.append("hub summary does not match the generated index")
    if "Search the catalog" not in hub or "sports" not in hub:
        failures.append("hub is missing search or sports kit content")

if len(assets) != 40:
    failures.append(f"expected 40 sports rows, found {len(assets)}")

for asset in assets:
    source = ROOT / asset["source"]
    page = OUT / "catalog" / asset["kit"] / asset["id"] / "index.html"
    preview_copy = OUT / "catalog" / asset["kit"] / asset["id"] / "preview.png"
    preview_source = ROOT / "catalog/kits/sports/previews" / f"{asset['id']}.png"
    if not source.is_file():
        failures.append(f"{asset['id']}: source is missing")
    elif hashlib.sha256(source.read_bytes()).hexdigest() != asset["sourceSha256"]:
        failures.append(f"{asset['id']}: source hash is stale")
    if not page.is_file():
        failures.append(f"{asset['id']}: detail page is missing")
        continue
    html = page.read_text()
    if asset["title"] not in html:
        failures.append(f"{asset['id']}: title is missing")
    for param in asset["params"]:
        if f'<code>{param["name"]}</code>' not in html:
            failures.append(f"{asset['id']}: parameter {param['name']} is missing")
    for preset in asset["presets"]:
        if f"<strong>{preset}</strong>" not in html:
            failures.append(f"{asset['id']}: preset {preset} is missing")
    if not preview_source.is_file() or not preview_copy.is_file():
        failures.append(f"{asset['id']}: detail or source preview is missing")
    elif hashlib.sha256(preview_source.read_bytes()).digest() != hashlib.sha256(preview_copy.read_bytes()).digest():
        failures.append(f"{asset['id']}: detail preview does not match source preview")
    controls.append(len([param for param in asset["params"] if param["type"] == "color"]))
    checked.append(asset["id"])

result = {
    "command": "npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-sports-catalog-pages",
    "generatedOutput": str(OUT),
    "catalogAssets": len(index["assets"]),
    "sportsRows": len(assets),
    "sportsPagesChecked": len(checked),
    "previewCopiesChecked": len(checked),
    "parameterCountIncludingScale": [min(controls) + 1, max(controls) + 1] if controls else None,
    "hubContainsCurrentCatalogCount": not any("hub summary" in failure for failure in failures),
    "failures": failures,
    "passed": not failures,
}
(BUNDLE / "catalog-pages-check.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if failures:
    raise SystemExit(1)
