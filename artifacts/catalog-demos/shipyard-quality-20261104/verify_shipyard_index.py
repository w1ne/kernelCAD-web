#!/usr/bin/env python3
"""Audit generated source hashes, controls, mesh budgets, and preview paths."""
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
    min_up_m = row["stats"].get("minUpM")
    material_knobs = [param["name"] for param in row.get("params", []) if param["name"] != "scale"]
    checks.append({
        "id": row["id"],
        "sourceSha256Matches": source_sha == row["sourceSha256"],
        "triangles": triangles,
        "triangleBudget": row["triangleBudget"],
        "withinBudget": 0 < triangles <= row["triangleBudget"] <= 1800,
        "materialColorControls": len(material_knobs),
        "hasTwoPresets": len(row.get("presets", {})) == 2,
        "baseOriginAtFloor": row["origin"] != "base" or (min_up_m is not None and abs(min_up_m) < 1e-6),
        "indexHasPreview": bool(row.get("preview")),
        "previewFileExists": preview.is_file(),
    })
summary = {
    "totalAssets": len(all_rows),
    "totalKits": len(index["kits"]),
    "shipyardAssets": len(rows),
    "refreshedPreviews": sum(bool(row.get("preview")) for row in rows),
    "allRowsUnique": len({(row["kit"], row["id"]) for row in all_rows}) == len(all_rows),
    "allShipyardRowsPass": len(rows) == 70 and all(
        check["sourceSha256Matches"] and check["withinBudget"]
        and 2 <= check["materialColorControls"] <= 4 and check["hasTwoPresets"]
        and check["baseOriginAtFloor"] and check["indexHasPreview"] and check["previewFileExists"]
        for check in checks
    ),
    "assets": checks,
}
path = BUNDLE / "catalog-index-check.json"
path.write_text(json.dumps(summary, indent=2) + "\n")
print(json.dumps({key: value for key, value in summary.items() if key != "assets"}, indent=2))
if not summary["allShipyardRowsPass"]:
    raise SystemExit(f"catalog index audit failed; see {path}")
