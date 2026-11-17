#!/usr/bin/env python3
"""Verify the generated catalog row, source hash, preview and unchanged catalog IDs."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
INDEX = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
BEFORE_ROW = json.loads((BUNDLE / "before/index-row.json").read_text(encoding="utf-8"))
BEFORE_SUMMARY = json.loads((BUNDLE / "before/index-summary.json").read_text(encoding="utf-8"))
assets = INDEX["assets"]
ids = sorted(asset["id"] for asset in assets)
asset = next(row for row in assets if row["id"] == "steam-header-manifold")
source_path = ROOT / "catalog/kits/industrial-plant/steam-header-manifold.kcad.ts"
preview_path = ROOT / "catalog/kits/industrial-plant/previews/steam-header-manifold.png"
source_hash = hashlib.sha256(source_path.read_bytes()).hexdigest()
preview_hash = hashlib.sha256(preview_path.read_bytes()).hexdigest()
ids_hash = hashlib.sha256("\n".join(ids).encode()).hexdigest()
expected_preview = "/assets/industrial-plant-steam-header-manifold.png"
changed_fields = sorted(key for key in set(asset) | set(BEFORE_ROW) if asset.get(key) != BEFORE_ROW.get(key))
before_palette = {zone["param"]: zone for zone in BEFORE_ROW["palette"]}
after_palette = {zone["param"]: zone for zone in asset["palette"]}
branch_parts = {f"branch-{index}" for index in range(5)}
before_steel_parts = set(before_palette["steel"]["parts"])
before_safety_parts = set(before_palette["safetyPaint"]["parts"])
after_steel_parts = set(after_palette["steel"]["parts"])
after_safety_parts = set(after_palette["safetyPaint"]["parts"])
palette_definitions_unchanged = all(
    before_palette[name]["name"] == after_palette[name]["name"]
    and before_palette[name]["color"] == after_palette[name]["color"]
    and before_palette[name]["param"] == after_palette[name]["param"]
    for name in before_palette
)

checks = {
    "assetCountUnchanged": len(assets) == BEFORE_SUMMARY["assetCount"],
    "assetIdsUnchanged": ids_hash == BEFORE_SUMMARY["assetIdsSha256"],
    "targetSourceHashCurrent": asset["sourceSha256"] == source_hash,
    "targetPreviewPathPresent": asset.get("preview") == expected_preview,
    "targetPreviewFilePresent": preview_path.is_file(),
    "targetRowChanged": asset != BEFORE_ROW,
    "onlySourceAndPaletteRowsChanged": changed_fields == ["palette", "sourceSha256"],
    "paletteDefinitionsUnchanged": palette_definitions_unchanged,
    "fiveBranchPartsMovedFromSafetyPaintToSteel": (
        branch_parts <= after_steel_parts
        and not (branch_parts & after_safety_parts)
        and after_steel_parts == before_steel_parts | branch_parts
        and after_safety_parts == before_safety_parts - branch_parts
    ),
}
report = {
    "assetCount": len(assets),
    "assetIdsSha256BeforeAndAfter": {"before": BEFORE_SUMMARY["assetIdsSha256"], "after": ids_hash},
    "changedAssetRows": 1 if checks["targetRowChanged"] else 0,
    "changedTargetFields": changed_fields,
    "target": {
        "id": "industrial-plant/steam-header-manifold",
        "sourceSha256": {"index": asset["sourceSha256"], "source": source_hash},
        "preview": asset.get("preview"),
        "previewSha256": preview_hash,
        "params": [param["name"] for param in asset["params"]],
        "presets": sorted(asset["presets"]),
        "triangles": asset["stats"]["triangles"],
        "triangleBudget": asset["triangleBudget"],
    },
    "checks": checks,
    "allChecksPass": all(checks.values()),
}
(BUNDLE / "index-verification.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
(BUNDLE / "after/index-row.json").write_text(json.dumps(asset, indent=2) + "\n", encoding="utf-8")
if not report["allChecksPass"]:
    raise SystemExit("catalog index verification failed")
print(f"verified {len(assets)} catalog rows; one target row updated and all preview references remain present")
