#!/usr/bin/env python3
"""Check generated catalog freshness, preview coverage, and the scoped diff."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BASE_HEAD = "75667bcbe97312a05a521ef7fe8336cd03f4a329"
TARGET = "beverage-bottling-line/case-checkweigher"


def load_json(data: bytes | str):
    return json.loads(data)


baseline = load_json(subprocess.check_output(
    ["git", "show", f"{BASE_HEAD}:catalog/index.json"], cwd=ROOT,
))
current = load_json((ROOT / "catalog/index.json").read_text())
old_assets = {(row["kit"], row["id"]): row for row in baseline["assets"]}
new_assets = {(row["kit"], row["id"]): row for row in current["assets"]}
changed = sorted(
    f"{kit}/{asset_id}"
    for (kit, asset_id), row in new_assets.items()
    if old_assets.get((kit, asset_id)) != row
)
source_mismatches = []
missing_previews = []
for row in current["assets"]:
    source = ROOT / row["source"]
    if not source.is_file() or hashlib.sha256(source.read_bytes()).hexdigest() != row["sourceSha256"]:
        source_mismatches.append(f"{row['kit']}/{row['id']}")
    if row.get("preview"):
        preview = ROOT / "catalog/kits" / row["kit"] / "previews" / f"{row['id']}.png"
        if not preview.is_file():
            missing_previews.append(f"{row['kit']}/{row['id']}")

target_row = new_assets.get(tuple(TARGET.split("/")))
expected_preview = "/assets/beverage-bottling-line-case-checkweigher.png"
report = {
    "baselineHead": BASE_HEAD,
    "assetCount": len(current["assets"]),
    "kitCount": len(current["kits"]),
    "changedAssetRows": changed,
    "changedAssetRowCount": len(changed),
    "sourceHashMismatches": source_mismatches,
    "sourceHashMismatchCount": len(source_mismatches),
    "missingReferencedPreviews": missing_previews,
    "missingReferencedPreviewCount": len(missing_previews),
    "targetSourceSha256Matches": target_row is not None and hashlib.sha256(
        (ROOT / target_row["source"]).read_bytes()
    ).hexdigest() == target_row["sourceSha256"],
    "targetPreview": target_row.get("preview") if target_row else None,
    "targetPreviewIsExpected": target_row is not None and target_row.get("preview") == expected_preview,
}
output = Path(__file__).resolve().parent / "verification/index-verification.json"
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))

if (len(current["assets"]) != len(baseline["assets"])
        or len(current["kits"]) != len(baseline["kits"])
        or changed != [TARGET]
        or source_mismatches
        or missing_previews
        or not report["targetSourceSha256Matches"]
        or not report["targetPreviewIsExpected"]):
    raise SystemExit(1)
