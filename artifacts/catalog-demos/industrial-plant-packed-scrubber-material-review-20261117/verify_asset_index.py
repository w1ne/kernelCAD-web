#!/usr/bin/env python3
"""Verify the generated scrubber row, source hash, preview, and catalog IDs."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
INDEX = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
BEFORE_ROW = json.loads((BUNDLE / "before/index-row.json").read_text(encoding="utf-8"))
BEFORE_SUMMARY = json.loads((BUNDLE / "before/index-summary.json").read_text(encoding="utf-8"))
BEFORE_NON_TARGET_HASH = (BUNDLE / "before/index-nontarget-rows.sha256").read_text(encoding="utf-8").strip()
assets = INDEX["assets"]
ids = sorted(asset["id"] for asset in assets)
target_id = "packed-scrubber-column"
asset = next(row for row in assets if row["id"] == target_id)
source_path = ROOT / "catalog/kits/industrial-plant/packed-scrubber-column.kcad.ts"
preview_path = ROOT / "catalog/kits/industrial-plant/previews/packed-scrubber-column.png"
source_hash = hashlib.sha256(source_path.read_bytes()).hexdigest()
preview_hash = hashlib.sha256(preview_path.read_bytes()).hexdigest()
ids_hash = hashlib.sha256("\n".join(ids).encode()).hexdigest()
expected_preview = "/assets/industrial-plant-packed-scrubber-column.png"
changed_fields = sorted(key for key in set(asset) | set(BEFORE_ROW) if asset.get(key) != BEFORE_ROW.get(key))
target_row_changed = asset != BEFORE_ROW
non_target_rows = sorted((row for row in assets if row["id"] != target_id), key=lambda row: row["id"])
non_target_hash = hashlib.sha256(json.dumps(non_target_rows, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
non_target_rows_unchanged = non_target_hash == BEFORE_NON_TARGET_HASH
changed_rows = [target_id] if target_row_changed else []
before_palette = {zone["param"]: zone for zone in BEFORE_ROW["palette"]}
after_palette = {zone["param"]: zone for zone in asset["palette"]}
vessel_parts = {"sump", "top-nozzle", "side-nozzle"}
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
    "nonTargetRowsUnchanged": non_target_rows_unchanged,
    "onlyTargetRowChanged": target_row_changed and non_target_rows_unchanged,
    "targetFieldsChangedOnlyForPaletteAndSourceHash": changed_fields == ["palette", "sourceSha256"],
    "paletteDefinitionsUnchanged": palette_definitions_unchanged,
    "threeProcessPartsMovedFromSafetyPaintToVesselFinish": (
        vessel_parts <= after_steel_parts
        and not (vessel_parts & after_safety_parts)
        and after_steel_parts == before_steel_parts | vessel_parts
        and after_safety_parts == before_safety_parts - vessel_parts
    ),
}
report = {
    "assetCount": len(assets),
    "assetIdsSha256BeforeAndAfter": {"before": BEFORE_SUMMARY["assetIdsSha256"], "after": ids_hash},
    "nonTargetRowsSha256BeforeAndAfter": {"before": BEFORE_NON_TARGET_HASH, "after": non_target_hash},
    "changedAssetRows": changed_rows,
    "changedTargetFields": changed_fields,
    "target": {
        "id": "industrial-plant/packed-scrubber-column",
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
(BUNDLE / "after/sha256s.json").write_text(json.dumps({
    "source": source_hash,
    "preview": preview_hash,
    "catalogIndex": hashlib.sha256((ROOT / "catalog/index.json").read_bytes()).hexdigest(),
}, indent=2) + "\n", encoding="utf-8")
if not report["allChecksPass"]:
    raise SystemExit("catalog index verification failed")
print(f"verified {len(assets)} catalog rows; only packed-scrubber-column changed")
