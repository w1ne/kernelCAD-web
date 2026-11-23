#!/usr/bin/env python3
"""Check source, index, preview, variants, local page and required CI commands."""

import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path


BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
sys.path.insert(0, str(ROOT))

from scripts.checkCatalogQuality import passes, score


INDEX = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
ID = ("industrial-plant", "centrifugal-chiller")
ASSET = next((row for row in INDEX["assets"] if (row["kit"], row["id"]) == ID), None)
if ASSET is None:
    raise SystemExit("industrial-plant/centrifugal-chiller is missing from catalog/index.json")

source_path = ROOT / ASSET["source"]
source = source_path.read_text(encoding="utf-8")
source_hash = hashlib.sha256(source_path.read_bytes()).hexdigest()
preview_path = ROOT / "catalog/kits/industrial-plant/previews/centrifugal-chiller.png"
kit_assets = [row for row in INDEX["assets"] if row["kit"] == "industrial-plant"]
quality_pass = sum(passes(score(str(ROOT / row["source"])), 2) for row in INDEX["assets"])
kit_pass = sum(passes(score(str(ROOT / row["source"])), 2) for row in kit_assets)
params = {param["name"]: param for param in ASSET["params"]}
presets = ASSET.get("presets", {})
variants = json.loads((BUNDLE / "variant-renders.json").read_text(encoding="utf-8"))

baseline = json.loads(subprocess.run(
    ["git", "show", "HEAD:catalog/index.json"], cwd=ROOT, check=True, capture_output=True, text=True
).stdout)
baseline_ids = {(row["kit"], row["id"]) for row in baseline["assets"]}
current_ids = {(row["kit"], row["id"]) for row in INDEX["assets"]}

checks = {
    "sourceSha256MatchesIndex": source_hash == ASSET["sourceSha256"],
    "previewExists": preview_path.is_file(),
    "previewPathIndexed": ASSET.get("preview") == "/assets/industrial-plant-centrifugal-chiller.png",
    "qualityGate": passes(score(str(source_path)), 2),
    "fourMaterialControls": sum(param["type"] == "color" for param in ASSET["params"]) == 4,
    "materialNamesAreSpecific": all(name in params for name in ("shellSteel", "frameSteel", "compressorPaint", "pipework")),
    "namedPresets": all(name in presets for name in ("plant", "weathered", "highVisibility", "stainless")),
    "shellCapacityChoices": params["shellCapacity"].get("choices") == ["compact", "large"],
    "realSilhouetteGeometry": score(str(source_path)).geometry > 0,
    "defaultUnderTriangleBudget": ASSET["stats"]["triangles"] <= ASSET["triangleBudget"],
    "assetIdsUnchanged": current_ids == baseline_ids,
    "industrialPlantQuality60of60": len(kit_assets) == 60 and kit_pass == 60,
    "catalogQuality2402of2402": len(INDEX["assets"]) == 2402 and quality_pass == 2402,
    "variantCount": len(variants["variants"]) == 4,
    "compactAndLargeGeometryDiffer": variants["geometryChoiceCheck"]["changedByAtLeast80mm"],
}
for index, variant in enumerate(variants["variants"], 1):
    checks[f"variant{index}SourceHashMatches"] = variant["sourceSha256"] == source_hash
    checks[f"variant{index}UnderBudget"] = variant["triangles"] <= variant["triangleBudget"]
    checks[f"variant{index}HasVisibleColorSeparation"] = variant["uniqueColors"] >= 4
    checks[f"variant{index}PreviewExists"] = (BUNDLE / variant["png"]).is_file()

local_page_status = "not built"
if len(sys.argv) > 1:
    output = Path(sys.argv[1]).resolve()
    page_path = output / "catalog/industrial-plant/centrifugal-chiller/index.html"
    page = page_path.read_text(encoding="utf-8") if page_path.is_file() else ""
    page_preview = output / "catalog/industrial-plant/centrifugal-chiller/preview.png"
    visible = [
        "Centrifugal chiller", "Shell package", "compact", "large",
        "Heat-exchanger shell steel", "Skid and support steel", "Compressor paint",
        "Pipework and flanges", "weathered", "highVisibility", "stainless",
    ]
    checks["localPageExists"] = page_path.is_file()
    checks["localPagePreviewExists"] = page_preview.is_file()
    checks["localPageControlsAndPresetsVisible"] = all(token.lower() in page.lower() for token in visible)
    local_page_status = "passed" if all(checks[name] for name in (
        "localPageExists", "localPagePreviewExists", "localPageControlsAndPresetsVisible"
    )) else "failed"

lint_output = (BUNDLE / "eslint-output.txt").read_text(encoding="utf-8", errors="replace") if (BUNDLE / "eslint-output.txt").is_file() else ""
test_output = (BUNDLE / "catalog-integration-output.txt").read_text(encoding="utf-8", errors="replace") if (BUNDLE / "catalog-integration-output.txt").is_file() else ""
checks["eslintPassed"] = "ESLint passed" in lint_output
checks["integrationPassed"] = re.search(r"Test Files\s+\d+ passed", test_output) is not None
result = {
    "kind": "local source/index/preview and generated detail-page verification; no deployment performed",
    "pass": all(value is True for value in checks.values()) and checks["eslintPassed"] and checks["integrationPassed"] and local_page_status == "passed",
    "asset": {
        "id": "/".join(ID),
        "source": ASSET["source"],
        "sourceSha256": source_hash,
        "preview": ASSET.get("preview"),
        "triangles": ASSET["stats"]["triangles"],
        "triangleBudget": ASSET["triangleBudget"],
        "materialControls": [param["name"] for param in ASSET["params"] if param["type"] == "color"],
        "presets": list(presets),
        "choices": {"shellCapacity": params["shellCapacity"].get("choices")},
    },
    "industrialPlantQuality": {"passing": kit_pass, "total": len(kit_assets)},
    "catalogQuality": {"passing": quality_pass, "total": len(INDEX["assets"]), "passRate": f"{quality_pass / len(INDEX['assets']) * 100:.2f}%"},
    "variants": variants["variants"],
    "checks": {**checks, "lintIntegration": "passed" if checks["eslintPassed"] and checks["integrationPassed"] else "failed", "localPage": local_page_status},
    "deployment": "not performed; feature branch changes are local and not deployed",
    "physicalAcceptance": "not performed",
}
(BUNDLE / "verification.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result, indent=2))
if not result["pass"]:
    raise SystemExit(1)
