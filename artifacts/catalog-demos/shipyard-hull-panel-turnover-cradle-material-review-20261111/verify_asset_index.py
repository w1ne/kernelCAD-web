#!/usr/bin/env python3
"""Verify the turnover cradle source and preview against the generated index."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
asset_id = "hull-panel-turnover-cradle"
source = ROOT / "catalog/kits/shipyard/hull-panel-turnover-cradle.kcad.ts"
preview = ROOT / f"catalog/kits/shipyard/previews/{asset_id}.png"
index = json.loads((ROOT / "catalog/index.json").read_text())
asset = next(row for row in index["assets"] if row["kit"] == "shipyard" and row["id"] == asset_id)
source_sha = hashlib.sha256(source.read_bytes()).hexdigest()
preview_sha = hashlib.sha256(preview.read_bytes()).hexdigest()

assert asset["sourceSha256"] == source_sha, "catalog sourceSha256 is stale"
assert asset["preview"] == "/assets/shipyard-hull-panel-turnover-cradle.png"
assert asset["stats"]["triangles"] <= asset["triangleBudget"]
assert asset["stats"]["triangles"] == 420
yard_parts = next(zone["parts"] for zone in asset["palette"] if zone["name"] == "yardPaint")
assert {"end-frame-0", "end-frame-1"}.issubset(yard_parts)
assert asset["stats"]["sizeM"] == [2.18, 1.76, 1.76]

print(json.dumps({
    "kit": "shipyard",
    "id": asset_id,
    "assetCount": len(index["assets"]),
    "sourceSha256": source_sha,
    "previewSha256": preview_sha,
    "preview": asset["preview"],
    "sizeM": asset["stats"]["sizeM"],
    "triangles": asset["stats"]["triangles"],
    "triangleBudget": asset["triangleBudget"],
    "matchingFramesUseYardPaint": True,
}, indent=2))
