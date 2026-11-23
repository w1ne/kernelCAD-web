#!/usr/bin/env python3
"""Verify the audit snapshots against the current catalog index and kit files."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
ASSET_IDS = (
    "twin-shaft-shredder",
    "material-chipper",
    "can-densifier",
    "glass-washer-trommel",
    "plastic-wash-basin",
    "bale-breaking-shaft",
    "bottle-crusher",
    "glass-breaker-screen",
    "optical-color-sorter",
    "recycling-trommel-screen",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


index = json.loads((ROOT / "catalog/index.json").read_text())
checks = []
for asset_id in ASSET_IDS:
    row = next(
        item
        for item in index["assets"]
        if item["kit"] == "recycling-facility" and item["id"] == asset_id
    )
    source = ROOT / row["source"]
    preview = ROOT / "catalog/kits/recycling-facility/previews" / f"{asset_id}.png"
    snapshot_source = BUNDLE / "sources" / f"{asset_id}.kcad.ts"
    snapshot_preview = BUNDLE / "previews" / f"{asset_id}.png"
    source_hash = sha256(source)
    preview_hash = sha256(preview)
    check = {
        "id": asset_id,
        "source_sha256": source_hash,
        "source_hash_matches_index": source_hash == row["sourceSha256"],
        "source_snapshot_matches": source_hash == sha256(snapshot_source),
        "preview_path_in_index": row["preview"] == f"/assets/recycling-facility-{asset_id}.png",
        "preview_exists": preview.is_file(),
        "preview_sha256": preview_hash,
        "preview_snapshot_matches": preview_hash == sha256(snapshot_preview),
        "triangles": row["stats"]["triangles"],
        "triangle_budget": row["triangleBudget"],
        "within_triangle_budget": row["stats"]["triangles"] <= row["triangleBudget"],
    }
    checks.append(check)

report = {
    "scope": "10 selected and supplemental recycling-facility preview snapshots",
    "assets_checked": len(checks),
    "all_checks_pass": all(
        value
        for check in checks
        for key, value in check.items()
        if key.startswith("source_")
        or key.startswith("preview_")
        or key == "within_triangle_budget"
    ),
    "assets": checks,
}
(BUNDLE / "asset-integrity.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps({"assets_checked": report["assets_checked"], "all_checks_pass": report["all_checks_pass"]}, indent=2))
if not report["all_checks_pass"]:
    raise SystemExit(1)
