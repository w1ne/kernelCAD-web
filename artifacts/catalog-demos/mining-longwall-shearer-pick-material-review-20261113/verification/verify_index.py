#!/usr/bin/env python3
"""Check the generated catalog index against the committed baseline and source."""

from hashlib import sha256
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[4]
INDEX = ROOT / "catalog/index.json"
SOURCE = ROOT / "catalog/kits/mining/longwall-shearer.kcad.ts"
PREVIEW = ROOT / "catalog/kits/mining/previews/longwall-shearer.png"

baseline_bytes = subprocess.run(
    ["git", "show", "HEAD:catalog/index.json"], cwd=ROOT, check=True, capture_output=True
).stdout
baseline = json.loads(baseline_bytes)
current = json.loads(INDEX.read_text(encoding="utf-8"))
old_rows = {row["id"]: row for row in baseline["assets"]}
new_rows = {row["id"]: row for row in current["assets"]}
changed = sorted(asset_id for asset_id in old_rows if old_rows[asset_id] != new_rows[asset_id])
assert old_rows.keys() == new_rows.keys(), "catalog asset IDs changed"
assert changed == ["longwall-shearer"], f"unexpected changed rows: {changed}"

row = new_rows["longwall-shearer"]
source_hash = sha256(SOURCE.read_bytes()).hexdigest()
preview_hash = sha256(PREVIEW.read_bytes()).hexdigest()
assert row["sourceSha256"] == source_hash, "index source hash is stale"
assert row["preview"] == "/assets/mining-longwall-shearer.png", "index preview path is stale"
assert PREVIEW.is_file(), "indexed preview is missing"
assert row["stats"]["triangles"] == 3504
assert row["stats"]["sizeM"] == [20, 3.35, 5.85]
assert len(current["assets"]) == len(baseline["assets"])
assert len(current["kits"]) == len(baseline["kits"])

print(json.dumps({
    "changedAssetRows": changed,
    "assetCount": len(current["assets"]),
    "kitCount": len(current["kits"]),
    "sourceSha256": source_hash,
    "previewSha256": preview_hash,
    "triangles": row["stats"]["triangles"],
    "sizeM": row["stats"]["sizeM"],
}, indent=2))
