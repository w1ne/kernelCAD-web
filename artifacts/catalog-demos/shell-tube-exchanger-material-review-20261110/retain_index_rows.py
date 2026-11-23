#!/usr/bin/env python3
"""Retain the changed catalog row before and after the material correction."""

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
asset_id = "shell-and-tube-exchanger"


def row_from(index):
    rows = [row for row in index["assets"] if row["kit"] == "industrial-plant" and row["id"] == asset_id]
    if len(rows) != 1:
        raise SystemExit(f"expected one {asset_id} index row, found {len(rows)}")
    return rows[0]


before = json.loads(subprocess.run(
    ["git", "show", "HEAD:catalog/index.json"], cwd=ROOT, check=True, capture_output=True, text=True,
).stdout)
after = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
(BUNDLE / "before/index-row.json").write_text(json.dumps(row_from(before), indent=2) + "\n", encoding="utf-8")
(BUNDLE / "after/index-row.json").write_text(json.dumps(row_from(after), indent=2) + "\n", encoding="utf-8")
print("Retained pre-fix and regenerated catalog rows for the exchanger.")
