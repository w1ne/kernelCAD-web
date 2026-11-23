#!/usr/bin/env python3
"""Verify generated source hashes, preview paths, and unchanged mesh bounds."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
BUNDLE = Path(__file__).resolve().parents[1]
KIT = "mining"
TARGET = "assay-sample-divider"
ASSETS = [
    TARGET,
    "core-tray-rack",
    "mine-refuge-chamber",
    "mine-survey-tripod",
    "mine-ventilation-fan",
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rows(index: dict) -> dict[str, dict]:
    return {
        row["id"]: row for row in index["assets"]
        if row["kit"] == KIT and row["id"] in ASSETS
    }


old_index_rows = json.loads((BUNDLE / "live-baseline/index-rows.json").read_text())
old = {row["id"]: row for row in old_index_rows}
current_index = json.loads((ROOT / "catalog/index.json").read_text())
current = rows(current_index)
if set(current) != set(ASSETS):
    raise SystemExit("Generated index is missing one or more sampled mining assets")

checks = []
for asset in ASSETS:
    source_path = ROOT / "catalog/kits" / KIT / f"{asset}.kcad.ts"
    preview_path = ROOT / "catalog/kits" / KIT / "previews" / f"{asset}.png"
    row = current[asset]
    old_row = old[asset]
    checks.append({
        "asset": f"{KIT}/{asset}",
        "sourceSha256": row["sourceSha256"],
        "sourceHashMatches": row["sourceSha256"] == sha256(source_path),
        "preview": row.get("preview"),
        "previewPathExists": bool(row.get("preview")) and preview_path.exists(),
        "sourceHashChanged": row["sourceSha256"] != old_row["sourceSha256"],
        "geometryUnchanged": row["stats"]["triangles"] == old_row["stats"]["triangles"]
        and row["stats"]["sizeM"] == old_row["stats"]["sizeM"]
        and row["triangleBudget"] == old_row["triangleBudget"],
    })

if not all(
    row["sourceHashMatches"]
    and row["previewPathExists"]
    and row["geometryUnchanged"]
    and (row["sourceHashChanged"] == (row["asset"] == f"{KIT}/{TARGET}"))
    for row in checks
):
    raise SystemExit("Generated catalog rows do not match expected source/preview/geometry state")

report = {
    "assetCount": len(current_index["assets"]),
    "kitCount": len(current_index["kits"]),
    "checks": checks,
}
(BUNDLE / "verification/index-row-check.json").write_text(json.dumps(report, indent=2) + "\n")
(BUNDLE / "verification/index-row-check.txt").write_text(
    f"Catalog index: {report['assetCount']} assets / {report['kitCount']} kits.\n"
    + "\n".join(
        f"OK {row['asset']}: source SHA current, preview path exists, mesh bounds unchanged"
        for row in checks
    )
    + "\n"
)
print((BUNDLE / "verification/index-row-check.txt").read_text(), end="")
