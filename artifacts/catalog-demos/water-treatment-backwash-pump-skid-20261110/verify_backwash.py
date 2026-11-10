#!/usr/bin/env python3
"""Check source, generated index/preview, parametric variants and local page."""

import hashlib
import json
import subprocess
import sys
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
sys.path.insert(0, str(ROOT))

from scripts.checkCatalogQuality import passes, score

INDEX = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
ID = ("water-treatment", "backwash-pump-skid")
ASSET = next((row for row in INDEX["assets"] if (row["kit"], row["id"]) == ID), None)
if ASSET is None:
    raise SystemExit("water-treatment/backwash-pump-skid is missing from catalog/index.json")

source_path = ROOT / ASSET["source"]
source = source_path.read_text(encoding="utf-8")
source_hash = hashlib.sha256(source_path.read_bytes()).hexdigest()
preview_path = ROOT / "catalog/kits/water-treatment/previews/backwash-pump-skid.png"
kit_assets = [row for row in INDEX["assets"] if row["kit"] == "water-treatment"]
quality_pass = sum(passes(score(str(ROOT / row["source"])), 2) for row in INDEX["assets"])
kit_pass = sum(passes(score(str(ROOT / row["source"])), 2) for row in kit_assets)
choices = {param["name"]: param.get("choices") for param in ASSET["params"]}

baseline = json.loads(subprocess.run(
    ["git", "show", "HEAD:catalog/index.json"], cwd=ROOT, check=True, capture_output=True, text=True
).stdout)
baseline_ids = {(row["kit"], row["id"]) for row in baseline["assets"]}
current_ids = {(row["kit"], row["id"]) for row in INDEX["assets"]}
variants = json.loads((BUNDLE / "variant-renders.json").read_text(encoding="utf-8"))

checks = {
    "sourceSha256MatchesIndex": source_hash == ASSET["sourceSha256"],
    "previewExists": preview_path.is_file(),
    "previewPathIndexed": ASSET.get("preview") == "/assets/water-treatment-backwash-pump-skid.png",
    "qualityGate": passes(score(str(source_path)), 2),
    "fourMaterialControls": sum(param["type"] == "color" for param in ASSET["params"]) == 4,
    "namedPresets": all(name in ASSET.get("presets", {}) for name in ("weathered", "highVisibility")),
    "singleDuplexChoice": choices.get("pumpArrangement") == ["single", "duplex"],
    "defaultUnderTriangleBudget": ASSET["stats"]["triangles"] <= ASSET["triangleBudget"],
    "assetCountUnchanged": len(current_ids) == len(baseline_ids) and current_ids == baseline_ids,
    "waterTreatmentQuality50of50": len(kit_assets) == 50 and kit_pass == 50,
    "catalogQuality2402of2402": len(INDEX["assets"]) == 2402 and quality_pass == 2402,
    "variantCount": len(variants["variants"]) == 3,
}
for index, variant in enumerate(variants["variants"], 1):
    checks[f"variant{index}SourceHashMatches"] = variant["sourceSha256"] == ASSET["sourceSha256"]
    checks[f"variant{index}UnderBudget"] = variant["triangles"] <= variant["triangleBudget"]
    checks[f"variant{index}PreviewExists"] = (BUNDLE / variant["png"]).is_file()

local_page_status = "not built"
if len(sys.argv) > 1:
    output = Path(sys.argv[1]).resolve()
    page_path = output / "catalog/water-treatment/backwash-pump-skid/index.html"
    page = page_path.read_text(encoding="utf-8") if page_path.is_file() else ""
    page_preview = output / "catalog/water-treatment/backwash-pump-skid/preview.png"
    visible = [
        ASSET["title"], "Pump arrangement", "single", "duplex",
        "Coated pump and motor steel", "Structural skid steel",
        "Stainless process pipework", "Rubber couplings and seals",
        "weathered", "highVisibility",
    ]
    checks["localPageExists"] = page_path.is_file()
    checks["localPagePreviewExists"] = page_preview.is_file()
    checks["localPageControlsAndPresetsVisible"] = all(token in page for token in visible)
    local_page_status = "passed" if all(checks[name] for name in (
        "localPageExists", "localPagePreviewExists", "localPageControlsAndPresetsVisible"
    )) else "failed"

lint_log = BUNDLE / "eslint-output.txt"
test_log = BUNDLE / "catalog-integration-output.txt"
lint_output = lint_log.read_text(encoding="utf-8", errors="replace") if lint_log.is_file() else ""
checks["eslintPassed"] = "ESLint passed" in lint_output or "0 problems" in lint_output
checks["integrationPassed"] = test_log.is_file() and "Test Files" in test_log.read_text(encoding="utf-8", errors="replace")

result = {
    "kind": "source/index/preview and local page verification; no deployment performed",
    "asset": {
        "id": "/".join(ID),
        "source": ASSET["source"],
        "sourceSha256": source_hash,
        "preview": ASSET.get("preview"),
        "triangles": ASSET["stats"]["triangles"],
        "triangleBudget": ASSET["triangleBudget"],
        "materialControls": [param["name"] for param in ASSET["params"] if param["type"] == "color"],
        "presets": list(ASSET.get("presets", {})),
        "choices": choices,
    },
    "waterTreatmentQuality": {"passing": kit_pass, "total": len(kit_assets)},
    "catalogQuality": {"passing": quality_pass, "total": len(INDEX["assets"])},
    "variants": variants["variants"],
    "checks": {
        **checks,
        "lintIntegration": "passed" if checks["eslintPassed"] and checks["integrationPassed"] else "failed",
        "localPage": local_page_status,
    },
    "passed": sum(value is True for value in checks.values()),
    "total": len(checks),
    "pass": all(value is True for value in checks.values()),
}
(BUNDLE / "verification.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result, indent=2))
if not result["pass"]:
    raise SystemExit(1)
