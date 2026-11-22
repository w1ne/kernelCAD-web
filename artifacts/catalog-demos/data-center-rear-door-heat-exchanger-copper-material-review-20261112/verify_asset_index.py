#!/usr/bin/env python3
"""Verify the generated catalog index contains only the intended row change."""
import hashlib
import json
from pathlib import Path
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
TARGET = "rear-door-heat-exchanger"
KIT = "data-center-infrastructure"
SOURCE = ROOT / "catalog/kits" / KIT / f"{TARGET}.kcad.ts"
PREVIEW = ROOT / "catalog/kits" / KIT / "previews" / f"{TARGET}.png"
INDEX_PATH = ROOT / "catalog/index.json"
IDS = [
    "coolant-distribution-unit",
    "high-density-server-chassis",
    TARGET,
    "monolithic-ups-cabinet",
    "overhead-coolant-header",
]

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
assert row["stats"]["triangles"] == 532
assert row["stats"]["sizeM"] == [0.885, 2.1, 0.61]
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
