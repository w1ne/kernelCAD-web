#!/usr/bin/env python3
"""Verify generated catalog rows, source hashes, preview paths, and stable IDs."""

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
TARGET = ("industrial-plant", "palletizer-robot-cell")


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
before = json.loads(subprocess.run(
    ["git", "show", "origin/develop:catalog/index.json"],
    cwd=ROOT,
    check=True,
    capture_output=True,
    text=True,
).stdout)
old_rows = {(row["kit"], row["id"]): row for row in before["assets"]}
new_rows = {(row["kit"], row["id"]): row for row in index["assets"]}
source_mismatches = []
missing_previews = []
bad_preview_paths = []
for row in index["assets"]:
    source = ROOT / row["source"]
    if sha(source) != row["sourceSha256"]:
        source_mismatches.append(f'{row["kit"]}/{row["id"]}')
    if row.get("preview"):
        expected = f'/assets/{row["kit"]}-{row["id"]}.png'
        preview = ROOT / "catalog/kits" / row["kit"] / "previews" / f'{row["id"]}.png'
        if row["preview"] != expected:
            bad_preview_paths.append(f'{row["kit"]}/{row["id"]}')
        if not preview.is_file():
            missing_previews.append(f'{row["kit"]}/{row["id"]}')

old_ids = sorted(old_rows)
new_ids = sorted(new_rows)
row = new_rows.get(TARGET)
after_preview = ROOT / "catalog/kits/industrial-plant/previews/palletizer-robot-cell.png"
changed_rows = sorted(
    f"{kit}/{asset_id}"
    for kit, asset_id in old_rows.keys() | new_rows.keys()
    if old_rows.get((kit, asset_id)) != new_rows.get((kit, asset_id))
)
result = {
    "invocation": "python3 artifacts/catalog-demos/industrial-plant-palletizer-robot-cell-semantic-review-20261127/verify_asset_index.py",
    "baseline": "origin/develop:catalog/index.json",
    "assetCountBefore": len(old_rows),
    "assetCountAfter": len(new_rows),
    "assetIdsUnchanged": old_ids == new_ids,
    "changedIndexRows": changed_rows,
    "sourceShaMismatches": source_mismatches,
    "badPreviewPaths": bad_preview_paths,
    "missingPreviewFiles": missing_previews,
    "changedAsset": None if row is None else {
        "id": f"{TARGET[0]}/{TARGET[1]}",
        "sourceSha256": row["sourceSha256"],
        "previewSha256": sha(after_preview),
        "preview": row.get("preview"),
        "triangles": row["stats"]["triangles"],
        "triangleBudget": row["triangleBudget"],
        "params": [param["name"] for param in row["params"]],
        "presets": sorted(row.get("presets", {}).keys()),
    },
}
result["pass"] = (
    result["assetCountBefore"] == result["assetCountAfter"]
    and result["assetIdsUnchanged"]
    and not source_mismatches
    and not bad_preview_paths
    and not missing_previews
    and row is not None
    and row.get("preview") == "/assets/industrial-plant-palletizer-robot-cell.png"
    and row["stats"]["triangles"] <= row["triangleBudget"]
    and set(result["changedAsset"]["params"]) >= {"concrete", "steel", "safetyPaint", "carton"}
    and set(result["changedAsset"]["presets"]) >= {"weathered", "highVisibility"}
)
(BUNDLE / "index-verification.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
if not result["pass"]:
    raise SystemExit("catalog index verification failed")
print(
    f'Verified {len(new_rows)} source hashes and preview references; '
    f'asset IDs unchanged; changed index rows: {len(changed_rows)}.'
)
