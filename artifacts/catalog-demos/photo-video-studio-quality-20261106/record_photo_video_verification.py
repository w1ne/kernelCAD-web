#!/usr/bin/env python3
"""Bind source hashes, catalog rows, previews and check results together."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/photo-video-studio"
material_map = json.loads((BUNDLE / "material-map.json").read_text(encoding="utf-8"))
check_results = json.loads((BUNDLE / "check-results.json").read_text(encoding="utf-8"))
index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
index_rows = {row["id"]: row for row in index["assets"] if row["kit"] == "photo-video-studio"}

assets = []
for mapped in material_map["assets"]:
    source_path = ROOT / mapped["source"]
    source_hash = hashlib.sha256(source_path.read_bytes()).hexdigest()
    row = index_rows.get(mapped["assetId"])
    if row is None:
        raise SystemExit(f"missing index row for {mapped['assetId']}")
    preview_path = KIT / "previews" / f"{mapped['assetId']}.png"
    expected_materials = list(mapped["materials"])
    actual_materials = [param["name"] for param in row["params"] if param["type"] == "color"]
    source_hash_matches = source_hash == mapped["sourceSha256"] == row["sourceSha256"]
    preview_indexed = bool(row.get("preview")) and preview_path.is_file()
    budget_ok = row["stats"]["triangles"] <= row["triangleBudget"]
    if not source_hash_matches or not preview_indexed or not budget_ok or actual_materials != expected_materials:
        raise SystemExit(f"verification failed for {mapped['assetId']}")
    if set(row["presets"]) != {"studioBlack", "fieldRental"}:
        raise SystemExit(f"preset verification failed for {mapped['assetId']}")
    assets.append({
        "id": mapped["assetId"],
        "source": mapped["source"],
        "sourceSha256": source_hash,
        "sourceHashMatchesIndex": source_hash_matches,
        "materialControls": actual_materials,
        "presets": list(row["presets"]),
        "preview": row["preview"],
        "previewExists": preview_path.is_file(),
        "triangles": row["stats"]["triangles"],
        "triangleBudget": row["triangleBudget"],
        "triangleBudgetPassed": budget_ok,
    })

if len(assets) != 40 or len(index_rows) != 40:
    raise SystemExit(f"expected 40 existing IDs; got {len(assets)} sources and {len(index_rows)} rows")

result = {
    "baseCommit": "41232a82d",
    "kit": "photo-video-studio",
    "assetCountBefore": 40,
    "assetCountAfter": len(assets),
    "newIds": [],
    "materialControls": material_map["materialControls"],
    "presetEntries": material_map["presetEntries"],
    "previewCount": sum(asset["previewExists"] for asset in assets),
    "sourceHashesMatchIndex": all(asset["sourceHashMatchesIndex"] for asset in assets),
    "triangleBudgetsPassed": all(asset["triangleBudgetPassed"] for asset in assets),
    "kitPassing": check_results["kitPassing"],
    "catalogPassing": check_results["catalogPassing"],
    "catalogTotal": check_results["catalogTotal"],
    "catalogPassRate": check_results["catalogPassRate"],
    "catalogThinRemaining": check_results["catalogThinRemaining"],
    "eslint": check_results["eslint"],
    "integrationFiles": check_results["integrationFiles"],
    "integrationTests": check_results["integrationTests"],
    "localPagesPresent": check_results["localPagesPresent"],
    "deployedBehaviorVerified": False,
    "physicalAcceptanceVerified": False,
    "assets": assets,
}
(BUNDLE / "verification.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps({key: value for key, value in result.items() if key != "assets"}, indent=2))
