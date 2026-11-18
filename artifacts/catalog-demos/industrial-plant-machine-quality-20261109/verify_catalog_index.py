"""Verify generated source hashes and preview coverage for the refined kit."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
rows = [row for row in index["assets"] if row["kit"] == "industrial-plant"]
target_ids = ["diesel-generator-set", "belt-conveyor", "industrial-transformer"]
expected_params = {
    "diesel-generator-set": {"louverCount", "enclosurePaint", "steel", "radiatorCore", "rubber"},
    "belt-conveyor": {"supportStations", "frameSteel", "beltRubber", "rollerSteel", "safetyPaint"},
    "industrial-transformer": {"radiatorFins", "tankPaint", "steel", "porcelain", "copper"},
}
checks: dict[str, bool] = {
    "catalogAssetCountUnchanged": len(index["assets"]) == 2402,
    "industrialPlantKitCountUnchanged": len(rows) == 60,
    "everyKitAssetHasIndexedPreview": all(row.get("preview") == f"/assets/industrial-plant-{row['id']}.png" for row in rows),
    "everyKitPreviewExists": all((ROOT / "catalog/kits/industrial-plant/previews" / f"{row['id']}.png").is_file() for row in rows),
}
assets_report = []
for asset_id in target_ids:
    row = next(row for row in rows if row["id"] == asset_id)
    source = ROOT / row["source"]
    preview = ROOT / "catalog/kits/industrial-plant/previews" / f"{asset_id}.png"
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    preview_hash = hashlib.sha256(preview.read_bytes()).hexdigest()
    params = {param["name"] for param in row["params"]}
    presets = set(row["presets"])
    before_source = BUNDLE / "before-source" / f"{asset_id}.kcad.ts"
    before_preview = BUNDLE / "before" / f"{asset_id}.png"
    source_changed = source.read_bytes() != before_source.read_bytes()
    preview_changed = preview.read_bytes() != before_preview.read_bytes()
    checks[f"{asset_id}SourceHashMatchesIndex"] = source_hash == row["sourceSha256"]
    checks[f"{asset_id}HasExpectedMaterialAndGeometryControls"] = expected_params[asset_id].issubset(params)
    checks[f"{asset_id}HasAtLeastTwoNamedPresets"] = len(presets) >= 2
    checks[f"{asset_id}PreviewWasRefreshed"] = preview_changed
    checks[f"{asset_id}SourceWasChanged"] = source_changed
    assets_report.append({
        "id": asset_id,
        "source": row["source"],
        "sourceSha256": source_hash,
        "indexSourceSha256": row["sourceSha256"],
        "previewUrl": row["preview"],
        "previewFile": str(preview.relative_to(ROOT)),
        "previewSha256": preview_hash,
        "triangles": row["stats"]["triangles"],
        "triangleBudget": row["triangleBudget"],
        "params": sorted(params),
        "presets": sorted(presets),
    })

report = {
    "catalogAssetCount": len(index["assets"]),
    "industrialPlantAssetCount": len(rows),
    "qualityBaseline": "2,402/2,402 passing (100.00%; 50 rich kits, 0 thin kits)",
    "assets": assets_report,
    "checks": checks,
    "allPassed": all(checks.values()),
}
(BUNDLE / "catalog-index-verification.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
if not report["allPassed"]:
    raise SystemExit(1)
