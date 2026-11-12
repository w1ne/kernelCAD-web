#!/usr/bin/env python3
"""Verify regenerated catalog metadata and that only the target row changed."""
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[3]
INDEX = ROOT / "catalog/index.json"
TARGET = "blast-dust-collector"
SOURCE = ROOT / "catalog/kits/shipyard/blast-dust-collector.kcad.ts"
PREVIEW = ROOT / "catalog/kits/shipyard/previews/blast-dust-collector.png"

current = json.loads(INDEX.read_text(encoding="utf-8"))
previous_bytes = subprocess.run(
    ["git", "show", "HEAD:catalog/index.json"],
    cwd=ROOT,
    check=True,
    capture_output=True,
).stdout
previous = json.loads(previous_bytes)

assert current["schemaVersion"] == 1
assert len(current["assets"]) == len(previous["assets"]) == 2402
assert len(current["kits"]) == len(previous["kits"]) == 50
assert current["kits"] == previous["kits"]
current_by_id = {asset["id"]: asset for asset in current["assets"]}
previous_by_id = {asset["id"]: asset for asset in previous["assets"]}
assert current_by_id.keys() == previous_by_id.keys()
changed = sorted(asset_id for asset_id in current_by_id if current_by_id[asset_id] != previous_by_id[asset_id])
assert changed == [TARGET], f"unexpected catalog rows changed: {changed}"

row = current_by_id[TARGET]
source_hash = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
assert row["sourceSha256"] == source_hash
assert row["preview"] == "/assets/shipyard-blast-dust-collector.png"
assert PREVIEW.is_file()
assert row["stats"]["triangles"] == 356
assert row["stats"]["triangles"] <= row["triangleBudget"]
assert row["stats"]["sizeM"] == [2.05, 2.13, 0.995]
assert [param["name"] for param in row["params"] if param["type"] == "color"] == [
    "yardPaint", "filterMedia", "elastomer",
]
assert row["presets"]["fresh-coat"]["filterMedia"] == "#e4e8e3"
assert row["presets"]["weathered-yard"]["filterMedia"] == "#c4ccc5"
assert row["palette"] and next(zone for zone in row["palette"] if zone["name"] == "filterMedia")["parts"] == [
    "filter-canister-0", "filter-canister-1", "filter-canister-2",
]

missing = [
    asset["id"] for asset in current["assets"]
    if asset.get("preview") and not (ROOT / "catalog/kits" / asset["kit"] / "previews" / f"{asset['id']}.png").is_file()
]
assert not missing, f"missing catalog previews: {missing[:10]}"

record = {
    "assetCount": len(current["assets"]),
    "kitCount": len(current["kits"]),
    "changedIndexRows": changed,
    "targetSourceSha256": source_hash,
    "targetPreview": row["preview"],
    "targetPreviewSha256": hashlib.sha256(PREVIEW.read_bytes()).hexdigest(),
    "triangles": row["stats"]["triangles"],
    "triangleBudget": row["triangleBudget"],
    "sizeM": row["stats"]["sizeM"],
    "missingReferencedPreviews": len(missing),
}
out = Path(__file__).resolve().parent / "index-verification.json"
out.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
print(json.dumps(record, indent=2))
