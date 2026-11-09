#!/usr/bin/env python3
"""Audit every generated catalog source hash and preview after index rebuild."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
asset_rows = index["assets"]
missing_previews = []
stale_sources = []
for row in asset_rows:
    source = ROOT / row["source"]
    if hashlib.sha256(source.read_bytes()).hexdigest() != row["sourceSha256"]:
        stale_sources.append(f'{row["kit"]}/{row["id"]}')
    preview = ROOT / "catalog/kits" / row["kit"] / "previews" / f'{row["id"]}.png'
    if not row.get("preview") or not preview.is_file():
        missing_previews.append(f'{row["kit"]}/{row["id"]}')

garden = [row for row in asset_rows if row["kit"] == "garden"]
compost = next(row for row in garden if row["id"] == "compost-bin")
checks = {
    "assetCount": len(asset_rows) == 2402,
    "kitCount": len(index["kits"]) == 50,
    "gardenCount": len(garden) == 40,
    "allSourceHashesMatch": not stale_sources,
    "allRowsHavePreviewPathsAndFiles": not missing_previews,
    "compostBinIndexSourceHashMatches": hashlib.sha256((ROOT / compost["source"]).read_bytes()).hexdigest() == compost["sourceSha256"],
    "compostBinPreviewPathIndexed": compost["preview"] == "/assets/garden-compost-bin.png",
    "compostBinStatsMatch": compost["stats"]["triangles"] == 296 and compost["triangleBudget"] == 420,
    "compostBinControlsAndPresetsIndexed": (
        {item["name"] for item in compost["params"]} == {"width", "frontAccess", "timber", "compost"}
        and set(compost["presets"]) == {"recycled", "painted", "mature"}
    ),
}
report = {
    "indexAssetCount": len(asset_rows),
    "indexKitCount": len(index["kits"]),
    "gardenAssetCount": len(garden),
    "staleSources": stale_sources,
    "missingPreviews": missing_previews,
    "compostBin": {
        "source": compost["source"],
        "sourceSha256": compost["sourceSha256"],
        "preview": compost["preview"],
        "triangles": compost["stats"]["triangles"],
        "triangleBudget": compost["triangleBudget"],
        "params": [item["name"] for item in compost["params"]],
        "presets": sorted(compost["presets"]),
    },
    "checks": checks,
    "allPassed": all(checks.values()),
}
print(json.dumps(report, indent=2))
if not report["allPassed"]:
    raise SystemExit(1)
