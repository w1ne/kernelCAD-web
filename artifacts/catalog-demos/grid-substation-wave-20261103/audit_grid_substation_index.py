#!/usr/bin/env python3
"""Audit every grid-substation index row against its source and preview."""

import hashlib
import json
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
ROOT = Path(__file__).resolve().parents[3]
index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
assets = [row for row in index["assets"] if row["kit"] == "grid-substation"]
seen = [row["id"] for row in index["assets"]]
rows = []
for row in assets:
    source = ROOT / row["source"]
    preview_path = ROOT / "catalog/kits/grid-substation/previews" / f"{row['id']}.png"
    source_hash_matches = hashlib.sha256(source.read_bytes()).hexdigest() == row["sourceSha256"]
    triangles = row["stats"]["triangles"]
    materials = row["stats"]["materials"]
    knobs = sorted(param["name"] for param in row["params"])
    min_up = row["stats"]["minUpM"]
    rows.append({
        "id": row["id"],
        "sourceSha256Matches": source_hash_matches,
        "triangles": triangles,
        "triangleBudget": row["triangleBudget"],
        "withinBudget": 0 < triangles <= row["triangleBudget"] <= 1800,
        "materials": materials,
        "oneMaterial": materials == 1,
        "minUpM": min_up,
        "baseOriginAtFloor": abs(min_up) < 1e-7,
        "knobs": knobs,
        "hasScaleAndColor": {"scale", "color"}.issubset(knobs),
        "indexHasPreview": bool(row.get("preview")),
        "previewFileExists": preview_path.is_file(),
        "previewBytes": preview_path.stat().st_size if preview_path.is_file() else 0,
    })
checks = {
    "totalAssets": len(index["assets"]),
    "totalKits": len(index["kits"]),
    "gridSubstationAssets": len(assets),
    "previewBackedGridSubstationAssets": sum(bool(row.get("preview")) for row in assets),
    "allCatalogIdsUnique": len(seen) == len(set(seen)),
    "allNewAssetsPass": len(rows) == 80 and all(
        item["sourceSha256Matches"] and item["withinBudget"] and item["oneMaterial"]
        and item["baseOriginAtFloor"] and item["hasScaleAndColor"]
        and item["indexHasPreview"] and item["previewFileExists"]
        for item in rows
    ),
    "assets": rows,
}
target = BUNDLE / "source-and-preview-audit.json"
target.write_text(json.dumps(checks, indent=2) + "\n", encoding="utf-8")
print(json.dumps({key: value for key, value in checks.items() if key != "assets"}, indent=2))
if not checks["allCatalogIdsUnique"] or not checks["allNewAssetsPass"]:
    raise SystemExit(f"catalog audit failed; see {target}")
