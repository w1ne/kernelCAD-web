#!/usr/bin/env python3
"""Verify the ground test well source hash, parameter rows, preview, and kit IDs."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
ASSET = "substation-ground-grid-test-well"
KIT = "grid-substation"


def main() -> None:
    index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
    rows = [row for row in index["assets"] if row["id"] == ASSET]
    if len(rows) != 1:
        raise SystemExit("expected exactly one ground test well row")
    row = rows[0]
    source = ROOT / row["source"]
    preview = ROOT / "catalog/kits" / KIT / "previews" / (ASSET + ".png")
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    if source_hash != row["sourceSha256"]:
        raise SystemExit("sourceSha256 does not match the edited model")
    if row["preview"] != "/assets/" + KIT + "-" + ASSET + ".png" or not preview.is_file():
        raise SystemExit("catalog row is missing the current preview path")
    params = {entry["name"]: entry for entry in row["params"]}
    depth = params.get("wellDepth")
    if depth is None or depth.get("type") != "choice" or depth.get("choices") != ["360", "480", "620"]:
        raise SystemExit("catalog row has incorrect wellDepth choices")
    for name in ("concrete", "stainlessSteel", "copper"):
        if params.get(name, {}).get("type") != "color":
            raise SystemExit("missing material-named color control: " + name)
    if sorted(row["presets"]) != ["maintenance", "weathered"]:
        raise SystemExit("catalog row is missing a named preset")
    expected_maintenance = {
        "concrete": "#c5c8bc",
        "stainlessSteel": "#eef2ef",
        "copper": "#e99a32",
    }
    if row["presets"]["maintenance"] != expected_maintenance:
        raise SystemExit("catalog row has stale maintenance palette values")
    if row["stats"]["triangles"] > row["triangleBudget"] or row["triangleBudget"] != 1800:
        raise SystemExit("measured mesh exceeds the 1,800 triangle budget")
    ids = (BUNDLE / "kit-preview-asset-ids.txt").read_text(encoding="utf-8").splitlines()
    grid_rows = [asset for asset in index["assets"] if asset["kit"] == KIT]
    if len(ids) != 80 or len(grid_rows) != 80 or set(ids) != {asset["id"] for asset in grid_rows}:
        raise SystemExit("the rendered asset list does not match the complete 80-asset kit")
    if len(index["assets"]) != 2402:
        raise SystemExit("catalog count changed unexpectedly: " + str(len(index["assets"])))
    result = {
        "asset": ASSET,
        "kit": KIT,
        "catalogAssetCount": len(index["assets"]),
        "kitAssetCount": len(grid_rows),
        "preview": row["preview"],
        "previewBytes": preview.stat().st_size,
        "sourceSha256": source_hash,
        "sourceSha256MatchesIndex": True,
        "params": row["params"],
        "presets": sorted(row["presets"]),
        "maintenancePalette": row["presets"]["maintenance"],
        "triangles": row["stats"]["triangles"],
        "triangleBudget": row["triangleBudget"],
    }
    (BUNDLE / "index-verification.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print("verified " + KIT + "/" + ASSET + ": hash, depth choices, materials, presets, preview, and budget; 80 kit assets; 2,402 catalog assets")


if __name__ == "__main__":
    main()
