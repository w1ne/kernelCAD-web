#!/usr/bin/env python3
"""Check source hashes, previews, material controls, presets and budgets."""

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
index = json.loads((ROOT / "catalog/index.json").read_text())
before = json.loads(subprocess.check_output(["git", "show", "HEAD:catalog/index.json"], cwd=ROOT, text=True))
assets = [asset for asset in index["assets"] if asset["kit"] == "sports"]
before_ids = sorted(asset["id"] for asset in before["assets"] if asset["kit"] == "sports")
current_ids = sorted(asset["id"] for asset in assets)
failures = []
rows = []

if before_ids != current_ids:
    failures.append("sports asset ID set changed")

for asset in assets:
    source_path = ROOT / asset["source"]
    preview_path = ROOT / "catalog/kits/sports/previews" / f"{asset['id']}.png"
    colors = [param for param in asset["params"] if param["type"] == "color"]
    generic = {"color", "colour", "base", "basecolor", "main", "fill"}
    if not source_path.is_file():
        failures.append(f"{asset['id']}: source is missing")
        source_sha = None
    else:
        source_sha = hashlib.sha256(source_path.read_bytes()).hexdigest()
        if source_sha != asset["sourceSha256"]:
            failures.append(f"{asset['id']}: source hash differs from catalog index")
    if not asset.get("preview") or not preview_path.is_file():
        failures.append(f"{asset['id']}: indexed preview is missing")
    if not 2 <= len(colors) <= 4:
        failures.append(f"{asset['id']}: expected 2–4 material color params, got {len(colors)}")
    if any(param["name"].lower() in generic for param in colors):
        failures.append(f"{asset['id']}: generic color parameter remains")
    if not asset["presets"]:
        failures.append(f"{asset['id']}: no named preset")
    if asset["stats"]["triangles"] > asset["triangleBudget"]:
        failures.append(f"{asset['id']}: triangle count exceeds budget")
    rows.append({
        "id": asset["id"],
        "sourceSha256": source_sha,
        "preview": asset.get("preview"),
        "previewExists": preview_path.is_file(),
        "materialColorParams": [param["name"] for param in colors],
        "presets": sorted(asset["presets"]),
        "triangles": asset["stats"]["triangles"],
        "triangleBudget": asset["triangleBudget"],
    })

result = {
    "kit": "sports",
    "beforeAssetIds": len(before_ids),
    "afterAssetIds": len(current_ids),
    "assetIdsUnchanged": before_ids == current_ids,
    "sourceHashesChecked": len(rows),
    "previewsChecked": sum(row["previewExists"] for row in rows),
    "materialColorParamsPerAsset": [
        min(len(row["materialColorParams"]) for row in rows) if rows else 0,
        max(len(row["materialColorParams"]) for row in rows) if rows else 0,
    ],
    "presetEntries": sum(len(row["presets"]) for row in rows),
    "triangleBudgetsPassed": not any("triangle" in failure for failure in failures),
    "failures": failures,
    "assets": rows,
    "passed": not failures and len(rows) == 40,
}
(BUNDLE / "source-index-audit.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps({key: value for key, value in result.items() if key != "assets"}, indent=2))
if failures:
    raise SystemExit(1)
