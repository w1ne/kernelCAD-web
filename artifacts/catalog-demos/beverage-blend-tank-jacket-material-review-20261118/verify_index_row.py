#!/usr/bin/env python3
"""Verify regenerated catalog index provenance and one-row scope."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ARTIFACTS = Path(__file__).resolve().parent
ROOT = ARTIFACTS.parents[2]
TARGET = "beverage-blend-tank"
KIT = "beverage-bottling-line"


def row(index: dict, asset_id: str) -> dict:
    matches = [asset for asset in index["assets"] if asset["id"] == asset_id]
    if len(matches) != 1:
        raise SystemExit(f"expected one {asset_id} row, found {len(matches)}")
    return matches[0]


before_text = subprocess.run(
    ["git", "show", "HEAD:catalog/index.json"],
    check=True, cwd=ROOT, text=True, capture_output=True,
).stdout
before = json.loads(before_text)
after = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
before_row = row(before, TARGET)
after_row = row(after, TARGET)
source_path = ROOT / after_row["source"]
source_sha256 = hashlib.sha256(source_path.read_bytes()).hexdigest()
preview_path = ROOT / "catalog" / "kits" / KIT / "previews" / f"{TARGET}.png"
before_rows = {asset["id"]: asset for asset in before["assets"]}
after_rows = {asset["id"]: asset for asset in after["assets"]}
changed = sorted(
    asset_id
    for asset_id in before_rows.keys() | after_rows.keys()
    if before_rows.get(asset_id) != after_rows.get(asset_id)
)

checks = {
    "changedAssetIds": changed,
    "onlyTargetRowChanged": changed == [TARGET],
    "sourceSha256": after_row["sourceSha256"],
    "sourceSha256MatchesFile": after_row["sourceSha256"] == source_sha256,
    "previewPath": after_row.get("preview"),
    "previewPathMatchesExpected": after_row.get("preview") == f"/assets/{KIT}-{TARGET}.png",
    "previewFileExists": preview_path.is_file(),
    "triangleCountBeforeAndAfter": [before_row["stats"]["triangles"], after_row["stats"]["triangles"]],
    "triangleCountUnchanged": before_row["stats"]["triangles"] == after_row["stats"]["triangles"] == 492,
    "dimensionsBeforeAndAfterM": [before_row["stats"]["sizeM"], after_row["stats"]["sizeM"]],
    "dimensionsUnchanged": before_row["stats"]["sizeM"] == after_row["stats"]["sizeM"],
    "presetsUnchanged": before_row["presets"] == after_row["presets"],
    "paramsUnchanged": before_row["params"] == after_row["params"],
}
checks["passed"] = all(
    checks[name]
    for name in (
        "onlyTargetRowChanged",
        "sourceSha256MatchesFile",
        "previewPathMatchesExpected",
        "previewFileExists",
        "triangleCountUnchanged",
        "dimensionsUnchanged",
        "presetsUnchanged",
        "paramsUnchanged",
    )
)

(ARTIFACTS / "after" / "index-row.json").write_text(json.dumps(after_row, indent=2) + "\n")
(ARTIFACTS / "verification" / "index-row-check.json").write_text(json.dumps(checks, indent=2) + "\n")
print(json.dumps(checks, indent=2))
if not checks["passed"]:
    raise SystemExit(1)
