#!/usr/bin/env python3
"""Verify the generated static page, indexed preview and source hash."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
PAGE_ROOT = Path(sys.argv[1]).resolve()
INDEX = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
row = next(asset for asset in INDEX["assets"] if asset["kit"] == "recycling-facility" and asset["id"] == "horizontal-baler")
source_path = ROOT / row["source"]
preview_path = ROOT / "catalog/kits/recycling-facility/previews/horizontal-baler.png"
page_path = PAGE_ROOT / "catalog/recycling-facility/horizontal-baler/index.html"
copied_preview = PAGE_ROOT / "catalog/recycling-facility/horizontal-baler/preview.png"
page = page_path.read_text(encoding="utf-8")

checks = {
    "page_exists": page_path.is_file(),
    "page_title": row["title"] in page,
    "open_mouth_description": "open-front horizontal baler" in page.lower(),
    "material_controls": all(name in page for name in ("paintedSteel", "stainlessSteel", "rubber", "recoveredMaterial")),
    "presets": all(name in page for name in ("weathered", "highVisibility")),
    "preview_exists": copied_preview.is_file(),
    "preview_hash_matches": copied_preview.is_file() and hashlib.sha256(copied_preview.read_bytes()).hexdigest() == hashlib.sha256(preview_path.read_bytes()).hexdigest(),
    "source_hash_matches_index": hashlib.sha256(source_path.read_bytes()).hexdigest() == row["sourceSha256"],
    "preview_path_indexed": row.get("preview") == "/assets/recycling-facility-horizontal-baler.png",
    "triangle_budget_honest": row["stats"]["triangles"] == 676 and row["stats"]["triangles"] <= row["triangleBudget"],
}
report = {
    "asset": "recycling-facility/horizontal-baler",
    "page": str(page_path),
    "checks": checks,
    "allPassed": all(checks.values()),
    "triangles": row["stats"]["triangles"],
    "triangleBudget": row["triangleBudget"],
    "materialControls": [param["name"] for param in row["params"] if param["type"] == "color"],
    "presetNames": sorted(row.get("presets", {}).keys()),
    "sourceSha256": row["sourceSha256"],
    "previewSha256": hashlib.sha256(preview_path.read_bytes()).hexdigest(),
}
(OUT / "local-page-check.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
if not report["allPassed"]:
    raise SystemExit(1)
