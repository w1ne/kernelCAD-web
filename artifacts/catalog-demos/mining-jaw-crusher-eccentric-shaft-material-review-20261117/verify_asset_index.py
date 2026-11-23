#!/usr/bin/env python3
"""Verify the regenerated index changes only the jaw-crusher asset row."""

import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KEY = ("mining", "jaw-crusher-module")
BASE_REF = "f5167a953f44f838bd08d99fc1a9b64ed6dec5c6"
SOURCE = ROOT / "catalog/kits/mining/jaw-crusher-module.kcad.ts"
PREVIEW = ROOT / "catalog/kits/mining/previews/jaw-crusher-module.png"
INDEX = json.loads((ROOT / "catalog/index.json").read_text())
BASELINE = json.loads(subprocess.check_output(
    ["git", "show", f"{BASE_REF}:catalog/index.json"], cwd=ROOT, text=True,
))


def rows(index: dict) -> dict[tuple[str, str], dict]:
    return {(row["kit"], row["id"]): row for row in index["assets"]}


before = rows(BASELINE)
after = rows(INDEX)
changed = sorted(key for key in before.keys() | after.keys() if before.get(key) != after.get(key))
if changed != [KEY]:
    raise SystemExit(f"expected only {KEY} to change, found {changed}")
if len(after) != 2402:
    raise SystemExit(f"expected 2,402 catalog rows, found {len(after)}")

row = after[KEY]
source_hash = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
if row["sourceSha256"] != source_hash:
    raise SystemExit("jaw-crusher sourceSha256 does not match the current source")
if not row.get("preview") or not PREVIEW.is_file():
    raise SystemExit("jaw-crusher preview is missing from the index or filesystem")

(BUNDLE / "after" / "index-row.json").write_text(json.dumps(row, indent=2) + "\n")
report = {
    "assetRows": len(after),
    "changedRows": [f"{kit}/{asset}" for kit, asset in changed],
    "sourceSha256": source_hash,
    "sourceHashMatches": True,
    "preview": row["preview"],
    "previewExists": PREVIEW.is_file(),
}
(BUNDLE / "verification" / "index-verification.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
