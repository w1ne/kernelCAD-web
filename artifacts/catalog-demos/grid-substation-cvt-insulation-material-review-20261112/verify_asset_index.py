#!/usr/bin/env python3
"""Verify the regenerated catalog index changes only the reviewed CVT row."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
TARGET = ("grid-substation", "substation-capacitive-voltage-transformer")
before = json.loads(subprocess.check_output(
    ["git", "show", "HEAD:catalog/index.json"], cwd=ROOT, text=True,
))
after = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
before_rows = {(row["kit"], row["id"]): row for row in before["assets"]}
after_rows = {(row["kit"], row["id"]): row for row in after["assets"]}
changed = [key for key in sorted(set(before_rows) | set(after_rows)) if before_rows.get(key) != after_rows.get(key)]
assert changed == [TARGET], "expected only the CVT index row to change: {}".format(changed)
row = after_rows[TARGET]
source = ROOT / row["source"]
preview = ROOT / "catalog/kits/grid-substation/previews/substation-capacitive-voltage-transformer.png"
source_sha = hashlib.sha256(source.read_bytes()).hexdigest()
preview_sha = hashlib.sha256(preview.read_bytes()).hexdigest()
assert source_sha == row["sourceSha256"], "stale sourceSha256"
assert preview.exists(), "referenced preview is missing"
assert row["preview"] == "/assets/grid-substation-substation-capacitive-voltage-transformer.png"
assert len(after["assets"]) == len(before["assets"]) == 2402
assert len(after["kits"]) == len(before["kits"]) == 50
result = {
    "onlyChangedIndexRow": list(TARGET),
    "assetCount": len(after["assets"]),
    "kitCount": len(after["kits"]),
    "sourceSha256Matches": source_sha,
    "previewSha256": preview_sha,
    "previewExists": True,
    "previewPath": row["preview"],
    "triangleCount": row["stats"]["triangles"],
    "triangleBudget": row["triangleBudget"],
    "sizeM": row["stats"]["sizeM"],
    "colorParams": [param["name"] for param in row["params"] if param["type"] == "color"],
}
(BUNDLE / "index-verification.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result, indent=2))
