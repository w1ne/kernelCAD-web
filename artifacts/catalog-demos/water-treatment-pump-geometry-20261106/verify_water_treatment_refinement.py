#!/usr/bin/env python3
"""Verify selected sources, regenerated previews, index rows and local pages."""

import hashlib
import json
import sys
from pathlib import Path

from scripts.checkCatalogQuality import passes, score

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
OUTPUT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else None
INDEX = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
IDS = ("high-lift-pump-skid", "horizontal-split-case-pump", "reverse-osmosis-skid")
ASSETS = {
    (asset["kit"], asset["id"]): asset
    for asset in INDEX["assets"]
    if asset["kit"] == "water-treatment"
}

checks = {}
records = []
for asset_id in IDS:
    key = ("water-treatment", asset_id)
    asset = ASSETS.get(key)
    if asset is None:
        checks[f"{asset_id}.indexed"] = False
        continue
    source_path = ROOT / asset["source"]
    source = source_path.read_text(encoding="utf-8")
    source_hash = hashlib.sha256(source_path.read_bytes()).hexdigest()
    preview_path = ROOT / "catalog/kits/water-treatment/previews" / f"{asset_id}.png"
    quality = score(str(source_path))
    choices = {param["name"]: param.get("choices") for param in asset["params"]}
    expected_choice = {
        "high-lift-pump-skid": "pumpCapacity",
        "horizontal-split-case-pump": "casingSize",
        "reverse-osmosis-skid": "membraneVessels",
    }[asset_id]
    checks.update({
        f"{asset_id}.indexed": True,
        f"{asset_id}.sourceHashMatches": source_hash == asset["sourceSha256"],
        f"{asset_id}.previewFileExists": preview_path.is_file(),
        f"{asset_id}.previewIndexed": asset.get("preview") == f"/assets/water-treatment-{asset_id}.png",
        f"{asset_id}.qualityGate": passes(quality, 2),
        f"{asset_id}.materialControls": sum(param["type"] == "color" for param in asset["params"]) >= 3,
        f"{asset_id}.namedPresets": all(name in asset.get("presets", {}) for name in ("weathered", "highVisibility")),
        f"{asset_id}.usefulChoice": bool(choices.get(expected_choice)),
        f"{asset_id}.silhouetteSource": any(token in source for token in (".loft(", ".extrude(", ".rotateX(", ".rotateY(")),
        f"{asset_id}.underTriangleBudget": asset["stats"]["triangles"] <= asset["triangleBudget"],
    })
    local_page = None
    local_preview = None
    if OUTPUT is not None:
        local_page = OUTPUT / "catalog" / "water-treatment" / asset_id / "index.html"
        local_preview = OUTPUT / "catalog" / "water-treatment" / asset_id / "preview.png"
        page = local_page.read_text(encoding="utf-8") if local_page.is_file() else ""
        controls = [param.get("label", param["name"]) for param in asset["params"] if param["type"] == "color"]
        expected_text = [asset["title"], *controls, *asset.get("presets", {}).keys(), expected_choice]
        checks[f"{asset_id}.localPageAndPreview"] = local_page.is_file() and local_preview.is_file()
        checks[f"{asset_id}.localPageControlsAndPresets"] = all(token in page for token in expected_text)
    records.append({
        "id": asset_id,
        "source": asset["source"],
        "sourceSha256": source_hash,
        "preview": asset.get("preview"),
        "triangles": asset["stats"]["triangles"],
        "triangleBudget": asset["triangleBudget"],
        "colorControls": [param["name"] for param in asset["params"] if param["type"] == "color"],
        "presets": list(asset.get("presets", {}).keys()),
        "choices": choices,
    })

water_count = len(ASSETS)
checks["waterTreatmentKitHas50Ids"] = water_count == 50
kit_pass = sum(passes(score(str(ROOT / asset["source"])), 2) for asset in ASSETS.values())
checks["waterTreatmentKitQuality50of50"] = kit_pass == 50
catalog_pass = sum(passes(score(str(ROOT / asset["source"])), 2) for asset in INDEX["assets"])
checks["catalogQuality2390of2390"] = catalog_pass == 2390 and len(INDEX["assets"]) == 2390
if OUTPUT is not None:
    hub = OUTPUT / "catalog" / "index.html"
    checks["localHubListsWaterTreatment"] = hub.is_file() and "water-treatment" in hub.read_text(encoding="utf-8")

result = {
    "kind": "source/index and generated local page verification; no deployment performed",
    "localPagesDirectory": str(OUTPUT) if OUTPUT is not None else None,
    "waterTreatmentAssetCount": water_count,
    "waterTreatmentQuality": {"passing": kit_pass, "total": water_count},
    "catalogQuality": {"passing": catalog_pass, "total": len(INDEX["assets"])},
    "assets": records,
    "checks": checks,
    "passed": sum(checks.values()),
    "total": len(checks),
    "pass": all(checks.values()),
}
(BUNDLE / "verification.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result, indent=2))
if not result["pass"]:
    raise SystemExit(1)
