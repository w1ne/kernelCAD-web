#!/usr/bin/env python3
"""Check catalog index freshness and stable IDs for the roller conveyor correction."""

import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
before = json.loads(subprocess.run(
    ["git", "show", "HEAD:catalog/index.json"],
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
    source_sha = hashlib.sha256(source.read_bytes()).hexdigest()
    if source_sha != row["sourceSha256"]:
        source_mismatches.append(f'{row["kit"]}/{row["id"]}')
    if row.get("preview"):
        expected = f'/assets/{row["kit"]}-{row["id"]}.png'
        preview = ROOT / "catalog/kits" / row["kit"] / "previews" / f'{row["id"]}.png'
        if row["preview"] != expected:
            bad_preview_paths.append(f'{row["kit"]}/{row["id"]}')
        if not preview.is_file():
            missing_previews.append(f'{row["kit"]}/{row["id"]}')

target = ("industrial-plant", "roller-conveyor-line")
target_row = new_rows.get(target)
changed_rows = sorted(
    f"{kit}/{asset_id}"
    for (kit, asset_id) in old_rows.keys() | new_rows.keys()
    if old_rows.get((kit, asset_id)) != new_rows.get((kit, asset_id))
)
before_ids = sorted(old_rows)
after_ids = sorted(new_rows)
target_preview = ROOT / "catalog/kits/industrial-plant/previews/roller-conveyor-line.png"
result = {
    "invocation": "python3 artifacts/catalog-demos/industrial-plant-roller-conveyor-line-semantic-review-20261116/verify_asset_index.py",
    "assetCountBefore": len(old_rows),
    "assetCountAfter": len(new_rows),
    "assetIdsUnchanged": before_ids == after_ids,
    "changedIndexRows": changed_rows,
    "sourceShaMismatches": source_mismatches,
    "badPreviewPaths": bad_preview_paths,
    "missingPreviewFiles": missing_previews,
    "changedAsset": None if target_row is None else {
        "id": f"{target[0]}/{target[1]}",
        "sourceSha256": target_row["sourceSha256"],
        "previewSha256": hashlib.sha256(target_preview.read_bytes()).hexdigest(),
        "preview": target_row.get("preview"),
        "triangles": target_row["stats"]["triangles"],
        "triangleBudget": target_row["triangleBudget"],
        "params": [param["name"] for param in target_row["params"]],
        "presets": sorted(target_row.get("presets", {}).keys()),
    },
}
result["pass"] = (
    result["assetIdsUnchanged"]
    and not source_mismatches
    and not bad_preview_paths
    and not missing_previews
    and target_row is not None
    and target_row.get("preview") == "/assets/industrial-plant-roller-conveyor-line.png"
)
(BUNDLE / "index-verification.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
if not result["pass"]:
    raise SystemExit("catalog index verification failed")
print(
    f'Verified {len(new_rows)} source hashes and preview references; '
    f'asset IDs unchanged; changed index rows: {len(changed_rows)}.'
)
