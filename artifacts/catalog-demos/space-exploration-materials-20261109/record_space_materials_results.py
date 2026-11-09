#!/usr/bin/env python3
"""Record and assert the source, preview, index and local-check evidence."""

from __future__ import annotations

import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/space-exploration"
sys.path.insert(0, str(ROOT / "scripts"))
from checkCatalogQuality import score  # noqa: E402


index = json.loads((ROOT / "catalog/index.json").read_text())
all_assets = index["assets"]
assets = [asset for asset in all_assets if asset["kit"] == "space-exploration"]
paths = sorted(KIT.glob("*.kcad.ts"))
if len(assets) != 52 or len(paths) != 52:
    raise SystemExit(f"expected 52 kit assets and index rows; found {len(paths)} sources and {len(assets)} rows")

color_counts = Counter()
hash_mismatches = []
missing_previews = []
over_budget = []
missing_presets = []
for asset in assets:
    source_path = ROOT / asset["source"]
    source = source_path.read_text(encoding="utf-8")
    digest = hashlib.sha256(source_path.read_bytes()).hexdigest()
    if digest != asset["sourceSha256"]:
        hash_mismatches.append(asset["id"])
    preview = KIT / "previews" / f"{asset['id']}.png"
    if not preview.is_file() or not asset.get("preview"):
        missing_previews.append(asset["id"])
    if asset["stats"]["triangles"] > asset["triangleBudget"]:
        over_budget.append(asset["id"])
    if not asset.get("presets"):
        missing_presets.append(asset["id"])
    color_counts[score(str(source_path)).colours] += 1

if hash_mismatches or missing_previews or over_budget or missing_presets:
    raise SystemExit(json.dumps({
        "hashMismatches": hash_mismatches,
        "missingPreviews": missing_previews,
        "overBudget": over_budget,
        "missingPresets": missing_presets,
    }, indent=2))

quality = json.loads((BUNDLE / "catalog-quality-status.json").read_text())
eslint = json.loads((BUNDLE / "catalog-eslint-status.json").read_text())
integration = json.loads((BUNDLE / "catalog-test-status.json").read_text())
pages = json.loads((BUNDLE / "catalog-pages-check.json").read_text())
if not all((quality["passed"], eslint["passed"], integration["passed"], pages["passed"])):
    raise SystemExit("one or more required local verification checks failed")

results = {
    "assetsRefined": 36,
    "materialControlsAdded": 36,
    "kitAssets": len(assets),
    "catalogAssets": len(all_assets),
    "catalogQualityGate": quality["summary"],
    "kitMaterialControlDistribution": {str(key): color_counts[key] for key in sorted(color_counts)},
    "kitPresetCoverage": f"{len(assets)}/{len(assets)}",
    "previewsRendered": 52,
    "indexedRowsWithPreview": sum(bool(asset.get("preview")) for asset in assets),
    "sourceHashesMatched": len(assets) - len(hash_mismatches),
    "triangles": {
        asset["id"]: asset["stats"]["triangles"]
        for asset in assets if asset["id"] in {"robotic-arm-pedestal", "oxygen-cylinder-rack"}
    },
    "eslint": "passed",
    "integration": "passed",
    "localPages": pages["pageAndPreviewPairs"],
    "localCatalogHubListsKit": pages["hubListsKit"],
    "deployed": False,
    "simulation": False,
    "hardwareAcceptance": False,
}
if color_counts[2] != 1 or color_counts[3] + color_counts[4] != 51:
    raise SystemExit(f"unexpected material-control distribution: {dict(color_counts)}")
if results["indexedRowsWithPreview"] != 52 or results["sourceHashesMatched"] != 52:
    raise SystemExit("not every asset has a matching source hash and preview path")
(BUNDLE / "verification.json").write_text(json.dumps(results, indent=2) + "\n")
print(json.dumps(results, indent=2))
