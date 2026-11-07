#!/usr/bin/env python3
"""Audit promoted source, index hashes, previews, triangle budgets, and pass rate."""

import hashlib
import json
import re
import sys
from pathlib import Path


BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from checkCatalogQuality import passes, score  # noqa: E402


KIT = ROOT / "catalog/kits/industrial-plant"
index = json.loads((ROOT / "catalog/index.json").read_text())
rows = [asset for asset in index["assets"] if asset["kit"] == "industrial-plant"]
row_by_id = {row["id"]: row for row in rows}
sources = sorted(KIT.glob("*.kcad.ts"))
problems = []
material_counts = []
preset_counts = []
triangle_counts = []
missing_previews = []
hash_mismatches = []
budget_issues = []

for path in sources:
    asset_id = path.stem.removesuffix(".kcad")
    source = path.read_text()
    asset_score = score(str(path))
    row = row_by_id.get(asset_id)
    if row is None:
        problems.append(f"{asset_id}: missing from generated index")
        continue
    if not passes(asset_score, 2):
        problems.append(f"{asset_id}: failed material/preset gate ({asset_score.colours} colors, {asset_score.presets} presets)")
    material_counts.append(asset_score.colours)
    preset_counts.append(len(row.get("presets", {})))
    triangle_counts.append(row["stats"]["triangles"])
    if len(row.get("presets", {})) < 1:
        problems.append(f"{asset_id}: generated index has no preset")
    material_names = {param["name"] for param in row["params"] if param["type"] == "color"}
    if not (2 <= len(material_names) <= 4):
        problems.append(f"{asset_id}: has {len(material_names)} color params")
    if row["triangleBudget"] < row["stats"]["triangles"]:
        budget_issues.append(asset_id)
    expected_preview = f"/assets/industrial-plant-{asset_id}.png"
    preview = KIT / "previews" / f"{asset_id}.png"
    if row.get("preview") != expected_preview or not preview.is_file():
        missing_previews.append(asset_id)
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if row["sourceSha256"] != digest:
        hash_mismatches.append(asset_id)

if len(sources) != 60 or len(rows) != 60:
    problems.append(f"expected 60 stable IDs, found {len(sources)} sources and {len(rows)} indexed rows")

all_scores = [score(str(path)) for path in sorted((ROOT / "catalog/kits").glob("*/*.kcad.ts"))]
global_passed = sum(passes(asset, 2) for asset in all_scores)
global_total = len(all_scores)
global_rate = global_passed / global_total if global_total else 0.0
source_pattern = re.compile(r"\.\b(path|loft|rotate[A-Za-z]*)\(")
silhouette_calls = sum(bool(source_pattern.search(path.read_text())) for path in sources)
material_total = sum(material_counts)
preset_entries_total = sum(preset_counts)

result = {
    "kit": "industrial-plant",
    "assetsPromoted": len(sources),
    "newAssetsAdded": 0,
    "overallQualityGateBeforeRound": "1120/2390 assets pass (46.86%)",
    "materialKnobsMin": min(material_counts) if material_counts else 0,
    "materialKnobsMax": max(material_counts) if material_counts else 0,
    "materialKnobsTotal": material_total,
    "netMaterialKnobsAdded": material_total - 2 * len(sources),
    "materialControlsPerAsset": {str(count): material_counts.count(count) for count in sorted(set(material_counts))},
    "presetNamesPerAsset": sorted(set(preset_counts)),
    "presetEntriesTotal": preset_entries_total,
    "silhouetteGeometryAssets": silhouette_calls,
    "geometryEnhancements": [
        "axial-flow-fan: hollow shroud and swept rotor blades",
        "evaporative-cooling-tower: multi-profile lofted shell",
        "weigh-hopper: tapered transition into the outlet",
    ],
    "previewsRendered": sum((KIT / "previews" / f"{path.stem.removesuffix('.kcad')}.png").is_file() for path in sources),
    "indexedRowsWithPreview": sum(bool(row.get("preview")) for row in rows),
    "catalogRows": len(index["assets"]),
    "sourceHashesFresh": not hash_mismatches,
    "sourceHashMismatches": hash_mismatches,
    "missingPreviews": missing_previews,
    "triangleRange": [min(triangle_counts), max(triangle_counts)] if triangle_counts else [0, 0],
    "triangleBudgetsHonest": not budget_issues,
    "triangleBudgetIssues": budget_issues,
    "qualityGate": f"{sum(passes(score(str(path)), 2) for path in sources)}/{len(sources)} pass",
    "overallQualityGate": f"{global_passed}/{global_total} assets pass ({global_rate:.2%})",
    "passingAssetsGainedThisRound": global_passed - 1120,
    "thinAssetsRemaining": global_total - global_passed,
    "overallPassRate": f"{global_rate:.2%}",
    "problems": problems,
}
(BUNDLE / "promotion-audit.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if problems or hash_mismatches or missing_previews or budget_issues:
    raise SystemExit(1)
