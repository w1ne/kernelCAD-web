#!/usr/bin/env python3
"""Verify the generated index differs from the audit baseline only at target."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
BUNDLE = Path(__file__).resolve().parents[1]
TARGET = ("industrial-plant", "air-compressor")


def row_map(index: dict):
    return {(row["kit"], row["id"]): row for row in index["assets"]}


base_commit = (BUNDLE / "verification" / "audit-base-commit.txt").read_text().strip()
baseline_text = subprocess.run(
    ["git", "show", f"{base_commit}:catalog/index.json"],
    cwd=ROOT,
    check=True,
    capture_output=True,
    text=True,
).stdout
baseline = json.loads(baseline_text)
current = json.loads((ROOT / "catalog/index.json").read_text())
before_rows = row_map(baseline)
after_rows = row_map(current)
changed = sorted(
    f"{kit}/{asset_id}"
    for key in set(before_rows) | set(after_rows)
    if before_rows.get(key) != after_rows.get(key)
    for kit, asset_id in [key]
)
target_row = after_rows[TARGET]
source_path = ROOT / target_row["source"]
preview_path = ROOT / "catalog/kits" / TARGET[0] / "previews" / f"{TARGET[1]}.png"
source_sha = hashlib.sha256(source_path.read_bytes()).hexdigest()

report = {
    "baselineCommit": base_commit,
    "baselineAssets": len(baseline["assets"]),
    "currentAssets": len(current["assets"]),
    "baselineKits": len(baseline["kits"]),
    "currentKits": len(current["kits"]),
    "changedRows": changed,
    "targetRow": target_row,
    "sourceSha256MatchesIndex": source_sha == target_row["sourceSha256"],
    "previewPathExists": preview_path.exists(),
    "previewPath": f"catalog/kits/{TARGET[0]}/previews/{TARGET[1]}.png",
}
(BUNDLE / "verification" / "index-row-check.json").write_text(
    json.dumps(report, indent=2) + "\n"
)
if report["changedRows"] != [f"{TARGET[0]}/{TARGET[1]}"]:
    raise SystemExit(f"unexpected index rows changed: {report['changedRows']}")
if report["baselineAssets"] != 2402 or report["currentAssets"] != 2402:
    raise SystemExit("catalog asset count changed")
if report["baselineKits"] != 50 or report["currentKits"] != 50:
    raise SystemExit("catalog kit count changed")
if not report["sourceSha256MatchesIndex"] or not report["previewPathExists"]:
    raise SystemExit("target source hash or preview path is stale")
print("Index fresh: 2,402 assets / 50 kits; only industrial-plant/air-compressor changed.")
