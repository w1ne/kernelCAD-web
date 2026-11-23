#!/usr/bin/env python3
"""Verify the generated tower row and ensure only that catalog row changed."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
BUNDLE = Path(__file__).resolve().parents[1]
BASE = (BUNDLE / "verification/audit-base-commit.txt").read_text().strip()
ASSET = ("recycling-facility", "conveyor-transfer-tower")


def rows(document):
    return {(row["kit"], row["id"]): row for row in document["assets"]}


def load(path: Path):
    return json.loads(path.read_text())


source_path = ROOT / "catalog/kits/recycling-facility/conveyor-transfer-tower.kcad.ts"
preview_path = ROOT / "catalog/kits/recycling-facility/previews/conveyor-transfer-tower.png"
current = load(ROOT / "catalog/index.json")
baseline = json.loads(subprocess.run(
    ["git", "show", f"{BASE}:catalog/index.json"],
    cwd=ROOT,
    check=True,
    capture_output=True,
    text=True,
).stdout)
current_rows, baseline_rows = rows(current), rows(baseline)
row, before = current_rows[ASSET], load(BUNDLE / "before/index-row.json")
source_sha = hashlib.sha256(source_path.read_bytes()).hexdigest()

assert row["sourceSha256"] == source_sha, "index source SHA does not match the edited model source"
assert row["source"] == "catalog/kits/recycling-facility/conveyor-transfer-tower.kcad.ts"
assert row["preview"] == "/assets/recycling-facility-conveyor-transfer-tower.png"
assert preview_path.is_file(), "indexed preview is missing"
assert row["stats"] == before["stats"], "geometry summary changed"
assert row["triangleBudget"] == before["triangleBudget"]
assert row["params"] == before["params"], "parameters changed"
assert row["presets"] == before["presets"], "presets changed"

cladding = next(zone for zone in row["palette"] if zone["name"] == "cladding")
structure = next(zone for zone in row["palette"] if zone["name"] == "structure")
assert {"roof", "tail-house-roof"}.issubset(set(cladding["parts"]))
assert {"column-lf", "roof-vent-cap", "ladder-rung-0"}.issubset(set(structure["parts"]))
assert "roof" not in structure["parts"] and "tail-house-roof" not in structure["parts"]

changed = sorted(
    key for key in current_rows.keys() | baseline_rows.keys()
    if current_rows.get(key) != baseline_rows.get(key)
)
assert changed == [ASSET], f"unexpected generated index row changes: {changed}"

report = {
    "asset": f"{ASSET[0]}/{ASSET[1]}",
    "sourceSha256": source_sha,
    "preview": row["preview"],
    "previewExists": True,
    "triangles": row["stats"]["triangles"],
    "sizeM": row["stats"]["sizeM"],
    "triangleBudget": row["triangleBudget"],
    "catalogAssets": len(current_rows),
    "changedIndexRows": [f"{kit}/{asset}" for kit, asset in changed],
    "nonTargetRowsUnchanged": True,
}
(BUNDLE / "verification/index-row-check.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
