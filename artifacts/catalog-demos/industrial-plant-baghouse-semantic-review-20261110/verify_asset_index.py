#!/usr/bin/env python3
"""Verify generated catalog hashes, preview references, and unchanged asset IDs."""

import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
assets = index["assets"]
source_mismatches = []
bad_preview_rows = []
missing_preview_files = []
for row in assets:
    source = ROOT / row["source"]
    if hashlib.sha256(source.read_bytes()).hexdigest() != row["sourceSha256"]:
        source_mismatches.append(row["kit"] + "/" + row["id"])
    expected_path = f"/assets/{row['kit']}-{row['id']}.png"
    preview = ROOT / "catalog/kits" / row["kit"] / "previews" / f"{row['id']}.png"
    if row.get("preview"):
        if row["preview"] != expected_path:
            bad_preview_rows.append(row["kit"] + "/" + row["id"])
        if not preview.is_file():
            missing_preview_files.append(row["kit"] + "/" + row["id"])
changed = next(row for row in assets if row["kit"] == "industrial-plant" and row["id"] == "baghouse-dust-collector")
before_text = subprocess.run(
    ["git", "show", "HEAD:catalog/index.json"], cwd=ROOT, check=True, capture_output=True, text=True
).stdout
before_assets = json.loads(before_text)["assets"]
before_ids = sorted((row["kit"], row["id"]) for row in before_assets)
after_ids = sorted((row["kit"], row["id"]) for row in assets)
changed_preview = ROOT / "catalog/kits/industrial-plant/previews/baghouse-dust-collector.png"
result = {
    "invocation": "python3 artifacts/catalog-demos/industrial-plant-baghouse-semantic-review-20261110/verify_asset_index.py",
    "assetCountBefore": len(before_assets),
    "assetCountAfter": len(assets),
    "assetIdsUnchanged": before_ids == after_ids,
    "sourceShaMismatches": source_mismatches,
    "badPreviewRows": bad_preview_rows,
    "missingPreviewFiles": missing_preview_files,
    "changedAsset": {
        "id": changed["kit"] + "/" + changed["id"],
        "sourceSha256": changed["sourceSha256"],
        "previewSha256": hashlib.sha256(changed_preview.read_bytes()).hexdigest(),
        "preview": changed.get("preview"),
        "triangles": changed["stats"]["triangles"],
        "triangleBudget": changed["triangleBudget"],
        "params": [param["name"] for param in changed["params"]],
        "presets": sorted(changed.get("presets", {}).keys()),
    },
}
result["pass"] = (
    result["assetIdsUnchanged"] and not source_mismatches and not bad_preview_rows
    and not missing_preview_files and changed.get("preview") == "/assets/industrial-plant-baghouse-dust-collector.png"
)
(BUNDLE / "index-verification.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
if not result["pass"]:
    raise SystemExit("catalog index verification failed")
print(f"Verified {len(assets)} source hashes and preview references; asset IDs are unchanged.")
