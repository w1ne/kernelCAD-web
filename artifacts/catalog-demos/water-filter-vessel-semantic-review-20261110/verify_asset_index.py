#!/usr/bin/env python3
"""Verify every catalog row's source hash and referenced preview after rebuild."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
assets = index["assets"]
source_mismatches = []
missing_preview_rows = []
missing_preview_files = []
for row in assets:
    source = ROOT / row["source"]
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    if digest != row["sourceSha256"]:
        source_mismatches.append(row["kit"] + "/" + row["id"])
    if row.get("preview"):
        expected = f"/assets/{row['kit']}-{row['id']}.png"
        preview = ROOT / "catalog/kits" / row["kit"] / "previews" / f"{row['id']}.png"
        if row["preview"] != expected:
            missing_preview_rows.append(row["kit"] + "/" + row["id"])
        if not preview.is_file():
            missing_preview_files.append(row["kit"] + "/" + row["id"])
changed = next(row for row in assets if row["kit"] == "water-treatment" and row["id"] == "pressure-sand-filter-vessel")
result = {
    "invocation": "python3 artifacts/catalog-demos/water-filter-vessel-semantic-review-20261110/verify_asset_index.py",
    "assetCount": len(assets),
    "sourceShaMismatches": source_mismatches,
    "missingPreviewRows": missing_preview_rows,
    "missingPreviewFiles": missing_preview_files,
    "changedAsset": {
        "id": changed["kit"] + "/" + changed["id"],
        "sourceSha256": changed["sourceSha256"],
        "preview": changed.get("preview"),
        "triangles": changed["stats"]["triangles"],
        "triangleBudget": changed["triangleBudget"],
    },
}
result["pass"] = not source_mismatches and not missing_preview_rows and not missing_preview_files
(BUNDLE / "index-verification.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
if not result["pass"]:
    raise SystemExit("catalog index verification failed")
print(f"Verified {len(assets)} source hashes and preview paths; {changed['kit']}/{changed['id']} is indexed.")
