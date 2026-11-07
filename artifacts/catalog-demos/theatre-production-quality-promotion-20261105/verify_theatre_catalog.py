#!/usr/bin/env python3
"""Check target-kit index hashes, parameter rows, presets, budgets and previews."""

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
index = json.loads((ROOT / "catalog/index.json").read_text())
audit = json.loads((BUNDLE / "promotion-audit.json").read_text())
expected = {item["id"]: item for item in audit["assets"]}
rows = [item for item in index["assets"] if item["kit"] == "theatre-production"]
issues = []
triangles = []

if len(rows) != 52:
    issues.append(f"expected 52 theatre rows, found {len(rows)}")
for row in rows:
    asset_id = row["id"]
    source_path = ROOT / row["source"]
    preview_path = ROOT / "catalog/kits/theatre-production/previews" / f"{asset_id}.png"
    if asset_id not in expected:
        issues.append(f"unexpected catalog ID {asset_id}")
        continue
    actual_hash = hashlib.sha256(source_path.read_bytes()).hexdigest()
    if actual_hash != row.get("sourceSha256"):
        issues.append(f"stale sourceSha256 for {asset_id}")
    materials = expected[asset_id]["materials"]
    color_params = [item["name"] for item in row["params"] if item["type"] == "color"]
    if color_params != materials:
        issues.append(f"{asset_id}: indexed color params {color_params} != source roles {materials}")
    presets = row.get("presets", {})
    if sorted(presets) != ["houseShow", "touring"]:
        issues.append(f"{asset_id}: missing named appearance presets")
    if not preview_path.is_file() or not row.get("preview"):
        issues.append(f"{asset_id}: preview file or indexed path is missing")
    count = row.get("stats", {}).get("triangles", 0)
    triangles.append(count)
    if count > row.get("triangleBudget", 0):
        issues.append(f"{asset_id}: {count} triangles exceed its budget")
    min_up = row.get("stats", {}).get("minUpM")
    if row.get("origin") == "base" and (min_up is None or abs(min_up) > 1e-6):
        issues.append(f"{asset_id}: base origin is {min_up} m above the floor")

result = {
    "assets": len(rows),
    "newIds": 0,
    "sourceHashesMatch": not any("stale sourceSha256" in issue for issue in issues),
    "indexedMaterialControls": sum(len(item["materials"]) for item in expected.values()),
    "assetsWithTwoPresets": sum(1 for row in rows if sorted(row.get("presets", {})) == ["houseShow", "touring"]),
    "previewsPresentAndIndexed": sum(
        1 for row in rows
        if (ROOT / "catalog/kits/theatre-production/previews" / f"{row['id']}.png").is_file() and row.get("preview")
    ),
    "triangleRange": [min(triangles), max(triangles)] if triangles else [],
    "triangleBudget": 1800,
    "issues": issues,
    "passed": not issues and len(rows) == 52,
}
(BUNDLE / "catalog-index-check.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if issues:
    raise SystemExit(1)
