#!/usr/bin/env python3
"""Record quality deltas, palette settings, and check outcomes for the handoff."""

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/theatre-production"


def read_json(name):
    return json.loads((BUNDLE / name).read_text())


def quality_summary(name):
    text = (BUNDLE / name).read_text()
    match = re.search(r"(\d+)/(\d+) assets pass", text)
    thin = re.search(r"(\d+) thin assets", text)
    if not match or not thin:
        raise ValueError(f"could not parse catalog quality summary from {name}")
    passing, total = map(int, match.groups())
    return {
        "passing": passing,
        "total": total,
        "thin": int(thin.group(1)),
        "passRatePercent": round(100 * passing / total, 2),
    }


source_audit = read_json("promotion-audit.json")
old_assets = {item["id"]: item for item in source_audit["assets"]}
index = json.loads((ROOT / "catalog/index.json").read_text())
indexed_assets = [item for item in index["assets"] if item["kit"] == "theatre-production"]
enhancements = {
    "touring-road-case": "Raised shell; four exposed low-profile caster wheels and mounting plates.",
    "motorized-chain-hoist": "Extruded J-shaped hook reaches the floor below the chain.",
    "rolling-stage-platform": "Four floor-level caster wheels with steel forks below the deck.",
    "scenic-wagon": "Four exposed caster wheels with brackets connected to the deck.",
}
asset_rows = []
for row in indexed_assets:
    asset_id = row["id"]
    source = (ROOT / row["source"]).read_text()
    asset_rows.append({
        "id": asset_id,
        "theme": old_assets[asset_id]["theme"],
        "materials": [param["name"] for param in row["params"] if param["type"] == "color"],
        "namedParts": len(re.findall(r"\bp\.part\(", source)),
        "presetNames": list(row.get("presets", {})),
        "geometryEnhancement": enhancements.get(asset_id),
    })
controls = [len(item["materials"]) for item in asset_rows]
roles = sorted({role for item in asset_rows for role in item["materials"]})
baseline = quality_summary("baseline-catalog-quality-output.txt")
current = quality_summary("quality-gate-full-output.txt")
kit_status = read_json("kit-quality-status.json")
lint_status = read_json("catalog-eslint-status.json")
test_status = read_json("catalog-test-status.json")
index_status = read_json("catalog-index-build-status.json")
index_check = read_json("catalog-index-check.json")
pages_check = read_json("catalog-pages-check.json")

if not (
    kit_status["status"] == "pass"
    and lint_status["status"] == "pass"
    and test_status["status"] == "pass"
    and index_status["status"] == "pass"
    and index_check["passed"]
    and pages_check["passed"]
):
    raise SystemExit("cannot record a completed promotion while a required check is failing")

result = {
    "kit": "theatre-production",
    "assetsPromoted": len(asset_rows),
    "newIds": 0,
    "materialControls": {
        "total": sum(controls),
        "minimumPerAsset": min(controls),
        "maximumPerAsset": max(controls),
        "rolesUsed": roles,
    },
    "presetsAdded": {
        "presetsBlocks": len(asset_rows),
        "namedAppearanceVariants": len(asset_rows) * 2,
        "names": ["houseShow", "touring"],
    },
    "geometryEnhancements": enhancements,
    "baselineCatalog": baseline,
    "catalogAfter": current,
    "kitQualityGate": "52/52 passed",
    "lint": lint_status["status"],
    "integration": test_status["status"],
    "index": index_status["status"],
    "sourceHashesMatch": index_check["sourceHashesMatch"],
    "previewsRenderedAndIndexed": index_check["previewsPresentAndIndexed"],
    "assetsWithTwoPresets": index_check["assetsWithTwoPresets"],
    "triangleRange": index_check["triangleRange"],
    "triangleBudget": index_check["triangleBudget"],
    "localPages": {
        "status": "pass" if pages_check["passed"] else "fail",
        "pageAndPreviewPairs": pages_check["pageAndPreviewPairs"],
        "assetsInIndex": pages_check["assetsInIndex"],
    },
    "assets": asset_rows,
}
(BUNDLE / "promotion-audit.json").write_text(json.dumps(result, indent=2) + "\n")

ids = sorted(path.name.removesuffix(".kcad.ts") for path in KIT.glob("*.kcad.ts"))
commands = {
    "promoteSources": "PYTHONDONTWRITEBYTECODE=1 python artifacts/catalog-demos/theatre-production-quality-promotion-20261105/promote_theatre_production.py",
    "renderPreviews": "npx tsx scripts/renderCatalogPreviews.ts " + " ".join(ids),
    "rebuildIndex": "npx tsx scripts/buildAssetCatalog.ts",
    "catalogIndexCheck": "python artifacts/catalog-demos/theatre-production-quality-promotion-20261105/verify_theatre_catalog.py",
    "qualityGate": "python scripts/checkCatalogQuality.py --kit theatre-production",
    "lint": "npx eslint catalog/kits/theatre-production/",
    "integration": "NODE_OPTIONS=--max-old-space-size=8192 npx vitest run tests/integration/catalog/ --maxWorkers=1 --no-file-parallelism",
    "localPages": "npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-theatre-production-quality-20261105-pages",
    "pageCheck": "python artifacts/catalog-demos/theatre-production-quality-promotion-20261105/verify_theatre_pages.py /tmp/kernelcad-theatre-production-quality-20261105-pages",
    "presetRender": "npx tsx artifacts/catalog-demos/theatre-production-quality-promotion-20261105/render_theatre_variant.mts",
    "videoCapture": "PYTHONDONTWRITEBYTECODE=1 python artifacts/catalog-demos/theatre-production-quality-promotion-20261105/capture_theatre_promotion.py",
    "videoInspection": "PYTHONDONTWRITEBYTECODE=1 python artifacts/catalog-demos/theatre-production-quality-promotion-20261105/inspect_theatre_video.py",
}
settings = {
    "date": "2026-11-05",
    "sourceRevision": (BUNDLE / "source-revision.txt").read_text().strip(),
    "scope": {
        "kit": "theatre-production",
        "existingAssets": len(asset_rows),
        "newIds": 0,
        "triangleBudgetPerAsset": 1800,
        "materialRolesUsed": roles,
        "materialControlsPerAsset": {"minimum": min(controls), "maximum": max(controls)},
        "presets": ["houseShow", "touring"],
        "geometryEnhancements": enhancements,
    },
    "paletteSource": "promote_theatre_production.py (material defaults and named preset overrides)",
    "commands": commands,
    "claimBoundaries": [
        "local .kcad.ts source authoring and geometry evaluation",
        "software-rendered default and touring preset previews",
        "regenerated local catalog index, source hashes, and static asset pages",
        "local ESLint and catalog integration checks",
        "feature branch is not deployed; public deployed behavior is unverified",
        "no rigging capacity, electrical rating, venue compliance, operational safety, or physical acceptance claimed",
    ],
}
(BUNDLE / "settings.json").write_text(json.dumps(settings, indent=2) + "\n")
print(json.dumps({"promotionAudit": str(BUNDLE / "promotion-audit.json"), "settings": str(BUNDLE / "settings.json")}, indent=2))
