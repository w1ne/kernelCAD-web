#!/usr/bin/env python3
"""Write reproducible settings for the construction-equipment refinement demo."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = "construction-equipment"
TARGETS = {
    "towable-light-tower": {
        "triangleBudget": 2200,
        "materialControls": ["equipmentPaintColor", "structuralSteelColor", "tireRubberColor", "lampLensColor"],
        "shapeChoices": {"mastHeight": ["1200", "1800", "2400"], "lampCount": ["2", "4", "6"]},
    },
    "ride-on-power-trowel": {
        "triangleBudget": 2200,
        "materialControls": ["equipmentPaintColor", "structuralSteelColor", "rubberColor", "seatVinylColor"],
        "shapeChoices": {"bladeCount": ["4", "6"], "rotorSize": ["compact", "standard", "wide"]},
    },
    "concrete-batch-plant": {
        "triangleBudget": 2200,
        "materialControls": ["equipmentPaintColor", "structuralSteelColor", "aggregateColor", "cementSiloColor"],
        "shapeChoices": {"aggregateBinCount": ["2", "3", "4"], "siloHeight": ["1200", "1500", "1900"]},
    },
}

index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
kit_rows = sorted((row for row in index["assets"] if row["kit"] == KIT), key=lambda row: row["id"])
if len(kit_rows) != 60:
    raise SystemExit(f"expected 60 {KIT} assets, found {len(kit_rows)}")

sources = []
for asset_id, details in TARGETS.items():
    before = BUNDLE / "before" / f"{asset_id}.kcad.ts"
    sources.append({
        "id": asset_id,
        "source": f"catalog/kits/{KIT}/{asset_id}.kcad.ts",
        "beforeSourceSha256": hashlib.sha256(before.read_bytes()).hexdigest(),
        "triangleBudget": details["triangleBudget"],
        "materialControls": details["materialControls"],
        "shapeChoices": details["shapeChoices"],
        "presets": ["weathered", "highVisibility"],
        "defaultPreview": f"catalog/kits/{KIT}/previews/{asset_id}.png",
    })

settings = {
    "kit": KIT,
    "assetCount": len(kit_rows),
    "previewAssetIDs": [row["id"] for row in kit_rows],
    "sources": sources,
    "comparisonDate": "2026-11-06",
    "video": {"width": 1280, "height": 720, "fps": 30, "frameSeconds": 3, "codec": "H.264 / yuv420p"},
    "workflow": [
        "npx tsx scripts/checkCatalogAsset.ts catalog/kits/construction-equipment/<id>.kcad.ts --png artifacts/catalog-demos/construction-equipment-silhouette-20261106/asset-renders/<id>.png",
        "npx tsx artifacts/catalog-demos/construction-equipment-silhouette-20261106/render_construction_equipment_variants.ts",
        "npx tsx scripts/renderCatalogPreviews.ts <all 60 construction-equipment IDs>",
        "npx tsx scripts/buildAssetCatalog.ts",
        "python3 artifacts/catalog-demos/construction-equipment-silhouette-20261106/verify_catalog_index.py",
        "npx tsx scripts/buildCatalogPages.ts <temporary output directory>",
        "python3 artifacts/catalog-demos/construction-equipment-silhouette-20261106/verify_local_pages.py <temporary output directory>",
        "python3 scripts/checkCatalogQuality.py --kit construction-equipment",
        "python3 scripts/checkCatalogQuality.py",
        "npx eslint catalog/kits/construction-equipment/",
        "npx vitest run tests/integration/catalog/",
    ],
    "claims": "Local source evaluation, software-rendered previews, static-page generation and catalog checks only. The branch is not deployed. No equipment specification, operating simulation, safety, manufacturing, performance or physical acceptance claim.",
}
(BUNDLE / "demo-settings.json").write_text(json.dumps(settings, indent=2) + "\n", encoding="utf-8")
print(f"wrote demo-settings.json for {len(kit_rows)} preview IDs and {len(TARGETS)} refined assets")
