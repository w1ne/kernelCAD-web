#!/usr/bin/env python3
"""Verify the regenerated source hash, preview path, and material controls."""

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
ASSET_ID = "substation-transformer-radiator-bank"
SOURCE = ROOT / "catalog/kits/grid-substation" / f"{ASSET_ID}.kcad.ts"
PREVIEW = ROOT / "catalog/kits/grid-substation/previews" / f"{ASSET_ID}.png"
INDEX = json.loads((ROOT / "catalog/index.json").read_text())
ROW = next(row for row in INDEX["assets"] if row["id"] == ASSET_ID)
EXPECTED = json.loads((BUNDLE / "before/index-row.json").read_text())

source_sha = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
color_params = [param["name"] for param in ROW["params"] if param["type"] == "color"]
report = {
    "asset": ASSET_ID,
    "sourceSha256": source_sha,
    "indexSourceSha256": ROW["sourceSha256"],
    "sourceHashMatches": source_sha == ROW["sourceSha256"],
    "preview": ROW["preview"],
    "previewFileExists": bool(ROW["preview"]) and PREVIEW.is_file(),
    "triangleCount": ROW["stats"]["triangles"],
    "triangleBudget": ROW["triangleBudget"],
    "colorParams": color_params,
    "presets": sorted(ROW["presets"]),
    "beforeRowSourceSha256": EXPECTED["sourceSha256"],
    "beforeRowPreview": EXPECTED["preview"],
}
out = BUNDLE / "verification/index-row-check.json"
out.write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
if not report["sourceHashMatches"] or not report["previewFileExists"]:
    raise SystemExit(1)
