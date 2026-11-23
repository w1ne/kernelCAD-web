#!/usr/bin/env python3
"""Verify the regenerated index and prove only the reviewed row changed."""
import hashlib
import json
from pathlib import Path
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
TARGET = "wind-farm-pad-mount-transformer"
KIT = "wind-energy"
SOURCE = ROOT / "catalog/kits" / KIT / f"{TARGET}.kcad.ts"
PREVIEW = ROOT / "catalog/kits" / KIT / "previews" / f"{TARGET}.png"
INDEX_PATH = ROOT / "catalog/index.json"

before = json.loads(subprocess.check_output(
    ["git", "show", "HEAD:catalog/index.json"], cwd=ROOT, text=True,
))
after = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
before_by_id = {asset["id"]: asset for asset in before["assets"]}
after_by_id = {asset["id"]: asset for asset in after["assets"]}
changed = [asset_id for asset_id in before_by_id if before_by_id[asset_id] != after_by_id.get(asset_id)]
source_hash = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
preview_hash = hashlib.sha256(PREVIEW.read_bytes()).hexdigest()
row = after_by_id[TARGET]

assert len(before["assets"]) == len(after["assets"]) == 2402
assert len(before["kits"]) == len(after["kits"]) == 50
assert changed == [TARGET], f"unexpected changed index rows: {changed}"
assert row["sourceSha256"] == source_hash
assert row["preview"] == f"/assets/{KIT}-{TARGET}.png"
assert row["stats"]["triangles"] == 360
assert row["stats"]["sizeM"] == [0.9, 0.973, 0.7]
assert PREVIEW.is_file()

record = {
    "assetCount": len(after["assets"]),
    "kitCount": len(after["kits"]),
    "changedIndexRows": changed,
    "sourceSha256": source_hash,
    "previewSha256": preview_hash,
    "previewPath": row["preview"],
    "triangles": row["stats"]["triangles"],
    "sizeM": row["stats"]["sizeM"],
    "sourceIndexFresh": True,
    "previewExists": True,
}
(HERE / "index-verification.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
print(json.dumps(record, indent=2))
