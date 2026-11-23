#!/usr/bin/env python3
"""Verify the generated catalog row matches the edited source and preview."""

import hashlib
import json
from pathlib import Path


BUNDLE = Path(__file__).resolve().parent
REPO = BUNDLE.parents[2]
SOURCE = REPO / "catalog/kits/industrial-plant/palletizer-robot-cell.kcad.ts"
PREVIEW = REPO / "catalog/kits/industrial-plant/previews/palletizer-robot-cell.png"
INDEX = REPO / "catalog/index.json"

row = next(
    asset for asset in json.loads(INDEX.read_text(encoding="utf-8"))["assets"]
    if asset["kit"] == "industrial-plant" and asset["id"] == "palletizer-robot-cell"
)
actual_sha = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
result = {
    "asset": "industrial-plant/palletizer-robot-cell",
    "sourceSha256": actual_sha,
    "indexedSourceSha256": row["sourceSha256"],
    "sourceHashMatches": actual_sha == row["sourceSha256"],
    "preview": row.get("preview"),
    "previewExists": PREVIEW.is_file(),
    "triangleBudget": row["triangleBudget"],
    "triangles": row["stats"]["triangles"],
    "colorParams": [param["name"] for param in row["params"] if param["type"] == "color"],
    "presetNames": sorted(row["presets"]),
}
(BUNDLE / "verification/index-verification.json").write_text(
    json.dumps(result, indent=2) + "\n", encoding="utf-8"
)
print(json.dumps(result, indent=2))
if not result["sourceHashMatches"] or not result["previewExists"]:
    raise SystemExit(1)
