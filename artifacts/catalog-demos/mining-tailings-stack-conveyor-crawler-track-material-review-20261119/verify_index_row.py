#!/usr/bin/env python3
"""Verify the generated catalog row, source digest, preview and narrow index diff."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
BASE = (BUNDLE / "verification" / "audit-base-commit.txt").read_text().strip()
ASSET = ("mining", "tailings-stack-conveyor")
EXPECTED_PARTS = [
    "track-0", "track-1",
    *[f"grouser-0-{i}" for i in range(9)],
    *[f"grouser-1-{i}" for i in range(9)],
]


def load_json(path: Path):
    return json.loads(path.read_text())


def rows(document):
    return {(row["kit"], row["id"]): row for row in document["assets"]}


source_path = ROOT / "catalog/kits/mining/tailings-stack-conveyor.kcad.ts"
preview_path = ROOT / "catalog/kits/mining/previews/tailings-stack-conveyor.png"
index_path = ROOT / "catalog/index.json"
current = load_json(index_path)
baseline = json.loads(
    subprocess.run(
        ["git", "show", f"{BASE}:catalog/index.json"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    ).stdout
)
current_rows, baseline_rows = rows(current), rows(baseline)
row = current_rows[ASSET]
before = load_json(BUNDLE / "before" / "index-row.json")
source_sha = hashlib.sha256(source_path.read_bytes()).hexdigest()

assert row["sourceSha256"] == source_sha, "index source SHA does not match the model source"
assert row["source"] == "catalog/kits/mining/tailings-stack-conveyor.kcad.ts"
assert row["preview"] == "/assets/mining-tailings-stack-conveyor.png"
assert preview_path.is_file(), "indexed preview PNG is missing"
assert row["stats"]["triangles"] == 3792
assert row["stats"]["sizeM"] == [31.303732, 8.344869, 16.150847]
assert row["triangleBudget"] == 5000
assert row["stats"] == before["stats"], "geometry summary changed"
assert row["triangleBudget"] == before["triangleBudget"]
assert [param["name"] for param in row["params"] if param["type"] == "color"] == [
    "boomPaint", "crawlerSteel", "beltRubber", "tailings",
]
assert list(row["presets"]) == ["weathered", "ironTailings", "coalReject"]
crawler = next(zone for zone in row["palette"] if zone["name"] == "crawlerSteel")
rubber = next(zone for zone in row["palette"] if zone["name"] == "beltRubber")
assert all(part in crawler["parts"] for part in EXPECTED_PARTS)
assert not any(part in rubber["parts"] for part in EXPECTED_PARTS)
assert {"belt-carry", "head-pulley"}.issubset(set(rubber["parts"]))
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
(BUNDLE / "verification" / "index-row-check.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
