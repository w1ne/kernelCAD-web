#!/usr/bin/env python3
"""Audit source hashes, knobs, mesh budgets, origins, and preview files."""
import hashlib
import json
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
index = json.loads((ROOT / "catalog" / "index.json").read_text())
all_rows = index["assets"]
rows = [row for row in all_rows if row["kit"] == "shipyard"]
checks = []
for row in rows:
    source = ROOT / row["source"]
    source_sha = hashlib.sha256(source.read_bytes()).hexdigest()
    preview = ROOT / "catalog" / "kits" / row["kit"] / "previews" / f"{row['id']}.png"
    triangles = row["stats"]["triangles"]
    materials = row["stats"]["materials"]
    min_up_m = row["stats"].get("minUpM")
    knobs = sorted(param["name"] for param in row["params"])
    checks.append({
        "id": row["id"], "sourceSha256Matches": source_sha == row["sourceSha256"],
        "triangles": triangles, "triangleBudget": row["triangleBudget"],
        "withinBudget": 0 < triangles <= row["triangleBudget"] <= 1800,
        "materials": materials, "oneMaterial": materials == 1,
        "minUpM": min_up_m,
        "baseOriginAtFloor": row["origin"] != "base" or (min_up_m is not None and abs(min_up_m) < 1e-6),
        "knobs": knobs, "hasScaleAndColor": {"scale", "color"}.issubset(knobs),
        "indexHasPreview": bool(row["preview"]), "previewFileExists": preview.is_file(),
    })
summary = {
    "totalAssets": len(all_rows), "totalKits": len(index["kits"]), "shipyardAssets": len(rows),
    "previewBackedAssets": sum(bool(row["preview"]) for row in all_rows),
    "allRowsUnique": len({(row["kit"], row["id"]) for row in all_rows}) == len(all_rows),
    "allNewAssetsPass": len(rows) == 70 and all(
        check["sourceSha256Matches"] and check["withinBudget"] and check["oneMaterial"]
        and check["baseOriginAtFloor"] and check["hasScaleAndColor"]
        and check["indexHasPreview"] and check["previewFileExists"] for check in checks
    ),
    "assets": checks,
}
path = BUNDLE / "source-and-preview-audit.json"
path.write_text(json.dumps(summary, indent=2) + "\n")
print(json.dumps({key: value for key, value in summary.items() if key != "assets"}, indent=2))
if not summary["allNewAssetsPass"]:
    raise SystemExit(f"catalog audit failed; see {path}")
