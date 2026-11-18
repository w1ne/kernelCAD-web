#!/usr/bin/env python3
"""Verify generated airfield pages, indexed previews, and source hashes."""

import hashlib
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/kernelcad-airfield-catalog-pages").resolve()
index = json.loads((ROOT / "catalog/index.json").read_text())
assets = [row for row in index["assets"] if row["kit"] == "airfield"]
failures = []
checked = []
parameter_counts = []

hub_path = OUT / "catalog/index.html"
if not hub_path.is_file():
    failures.append("generated catalog hub is missing")
else:
    hub = hub_path.read_text()
    if "airfield" not in hub or "Search the catalog" not in hub:
        failures.append("hub is missing the kit or searchable catalog finder")
    expected = f"{len(index['assets'])} free CC0 low-poly 3D models in {len(index['kits'])} kits"
    if expected not in hub:
        failures.append("hub summary does not match the generated index")

if len(assets) != 40:
    failures.append(f"expected 40 airfield rows, found {len(assets)}")

for asset in assets:
    source = ROOT / asset["source"]
    page = OUT / "catalog" / asset["kit"] / asset["id"] / "index.html"
    preview_copy = OUT / "catalog" / asset["kit"] / asset["id"] / "preview.png"
    preview_source = ROOT / "catalog/kits/airfield/previews" / f"{asset['id']}.png"
    params = asset["params"]
    parameter_counts.append(len(params))

    if not source.is_file():
        failures.append(f"{asset['id']}: source file is missing")
    elif hashlib.sha256(source.read_bytes()).hexdigest() != asset["sourceSha256"]:
        failures.append(f"{asset['id']}: index source hash is stale")
    if not page.is_file():
        failures.append(f"{asset['id']}: generated detail page is missing")
        continue
    html = page.read_text()
    if asset["title"] not in html:
        failures.append(f"{asset['id']}: title is missing from detail page")
    for knob in params:
        if f'<code>{knob["name"]}</code>' not in html:
            failures.append(f"{asset['id']}: parameter {knob['name']} is missing from detail page")
    if not preview_copy.is_file() or not preview_source.is_file():
        failures.append(f"{asset['id']}: detail or source preview is missing")
    elif hashlib.sha256(preview_copy.read_bytes()).digest() != hashlib.sha256(preview_source.read_bytes()).digest():
        failures.append(f"{asset['id']}: detail preview differs from source preview")
    checked.append(asset["id"])

if parameter_counts and (min(parameter_counts) < 3 or max(parameter_counts) > 5):
    failures.append(f"expected scale plus two to four material controls; got {min(parameter_counts)}–{max(parameter_counts)}")

result = {
    "command": "npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-airfield-catalog-pages",
    "generatedOutput": str(OUT),
    "assetsInIndex": len(index["assets"]),
    "kitRows": len(assets),
    "kitPagesChecked": len(checked),
    "previewCopiesChecked": len(checked),
    "sourceHashesChecked": len(assets),
    "parameterCountRangeIncludingScale": [min(parameter_counts), max(parameter_counts)] if parameter_counts else None,
    "hubHasKitAndFinder": not any("hub" in failure for failure in failures),
    "failures": failures,
    "passed": not failures,
}
(BUNDLE / "catalog-pages-check.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if failures:
    raise SystemExit(1)
