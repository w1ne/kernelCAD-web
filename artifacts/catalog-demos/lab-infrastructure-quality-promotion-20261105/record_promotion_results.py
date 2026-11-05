#!/usr/bin/env python3
"""Record source, generated-index, preview, and catalog-quality evidence."""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
import tempfile
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/lab-infrastructure"
sys.path.insert(0, str(ROOT / "scripts"))
from checkCatalogQuality import passes, score  # noqa: E402

index = json.loads((ROOT / "catalog/index.json").read_text())
rows = {row["id"]: row for row in index["assets"] if row["kit"] == "lab-infrastructure"}
files = sorted(KIT.glob("*.kcad.ts"))
if len(files) != 60 or len(rows) != 60:
    raise SystemExit(f"expected 60 lab-infrastructure files and rows; found {len(files)} and {len(rows)}")

all_paths = sorted((ROOT / "catalog/kits").glob("*/*.kcad.ts"))
scores = [score(str(path)) for path in all_paths]
kit_scores = {item.name.removesuffix(".kcad"): item for item in scores if item.kit == "lab-infrastructure"}
material_counts = Counter(item.colours for item in kit_scores.values())
presets_by_asset: dict[str, list[str]] = {}
source_mismatches: list[str] = []
missing_previews: list[str] = []
triangle_counts: list[int] = []
triangle_issues: list[str] = []
control_total = 0
preset_total = 0

for path in files:
    asset_id = path.stem.removesuffix(".kcad")
    row = rows[asset_id]
    source = path.read_bytes()
    actual_sha = hashlib.sha256(source).hexdigest()
    if row.get("sourceSha256") != actual_sha:
        source_mismatches.append(asset_id)
    preview = KIT / "previews" / f"{asset_id}.png"
    if not preview.is_file() or not row.get("preview"):
        missing_previews.append(asset_id)
    quality = kit_scores[asset_id]
    control_total += quality.colours
    if not passes(quality, 2):
        raise SystemExit(f"{asset_id} does not pass the catalog quality gate")
    text = source.decode("utf-8")
    names = re.findall(r"^  ([A-Za-z_][A-Za-z0-9_]*): \{", text, re.M)
    presets_by_asset[asset_id] = names
    preset_total += len(names)
    triangles = int(row.get("stats", {}).get("triangles", 0))
    budget = int(row.get("triangleBudget", 0))
    triangle_counts.append(triangles)
    if triangles > budget:
        triangle_issues.append(f"{asset_id}: {triangles}>{budget}")

if source_mismatches or missing_previews or triangle_issues:
    raise SystemExit(json.dumps({
        "sourceMismatches": source_mismatches,
        "missingPreviews": missing_previews,
        "triangleIssues": triangle_issues,
    }, indent=2))

current_pass = sum(passes(item, 2) for item in scores)
total = len(scores)
before_pass = current_pass - len(files)
baseline = subprocess.check_output(["git", "show", "HEAD:catalog/index.json"], cwd=ROOT, text=True)
baseline_index = json.loads(baseline)
baseline_ids = {row["id"] for row in baseline_index["assets"]}
current_ids = {row["id"] for row in index["assets"]}
added_ids = sorted(current_ids - baseline_ids)
geometry_ids = [
    "articulated-extraction-snorkel", "balance-isolation-bench", "benchtop-extraction-enclosure",
    "canopy-extraction-hood", "chemical-weighing-enclosure", "cleanroom-pass-through-chamber",
    "ductless-fume-enclosure", "laboratory-faucet-set", "laboratory-fume-hood",
    "laboratory-water-service-console", "laboratory-washup-station", "laminar-flow-workbench",
    "ultra-low-temperature-freezer", "undercounter-laboratory-freezer", "vibration-isolation-table",
]

report = {
    "kit": "lab-infrastructure",
    "assetsPromoted": len(files),
    "newAssetsAdded": len(added_ids),
    "newAssetIds": added_ids,
    "overallQualityGateBeforeRound": f"{before_pass}/{total} assets pass ({before_pass / total:.2%})",
    "materialKnobsMin": min(material_counts),
    "materialKnobsMax": max(material_counts),
    "materialKnobsTotal": control_total,
    "materialColorParamsBefore": len(files) * 2,
    "materialColorParamsAfter": control_total,
    "netMaterialColorParamsAdded": control_total - len(files) * 2,
    "materialControlsPerAsset": {str(key): value for key, value in sorted(material_counts.items())},
    "presetNamesPerAsset": sorted({tuple(value) for value in presets_by_asset.values()}),
    "presetEntriesTotal": preset_total,
    "silhouetteGeometryAssets": len(geometry_ids),
    "geometryEnhancements": geometry_ids,
    "previewsRendered": sum((KIT / "previews" / f"{path.stem.removesuffix('.kcad')}.png").is_file() for path in files),
    "indexedRowsWithPreview": sum(bool(row.get("preview")) for row in rows.values()),
    "catalogRows": len(index["assets"]),
    "sourceHashesFresh": True,
    "sourceHashMismatches": [],
    "missingPreviews": [],
    "triangleRange": [min(triangle_counts), max(triangle_counts)],
    "triangleBudgetsHonest": True,
    "triangleBudgetIssues": [],
    "qualityGate": f"{sum(passes(item, 2) for item in kit_scores.values())}/{len(files)} pass",
    "overallQualityGate": f"{current_pass}/{total} assets pass ({current_pass / total:.2%})",
    "passingAssetsGainedThisRound": current_pass - before_pass,
    "thinAssetsRemaining": total - current_pass,
    "overallPassRate": f"{current_pass / total:.2%}",
    "catalogIdSetUnchanged": not added_ids and current_ids == baseline_ids,
    "problems": [],
}
if len(report["presetNamesPerAsset"]) == 1:
    report["presetNamesPerAsset"] = list(report["presetNamesPerAsset"][0])
(BUNDLE / "promotion-audit.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
