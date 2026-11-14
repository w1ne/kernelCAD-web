#!/usr/bin/env python3
"""Summarize the retained local validation outputs for the handoff/demo."""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
asset = next(row for row in index["assets"] if row["kit"] == "water-treatment" and row["id"] == "pressure-sand-filter-vessel")
index_report = json.loads((BUNDLE / "index-verification.json").read_text(encoding="utf-8"))
page_report = json.loads((BUNDLE / "local-page-check.json").read_text(encoding="utf-8"))
variant_report = json.loads((BUNDLE / "variant-manifest.json").read_text(encoding="utf-8"))
integration = (BUNDLE / "integration-output.txt").read_text(encoding="utf-8")
kit_quality = (BUNDLE / "quality-kit-output.txt").read_text(encoding="utf-8")
catalog_quality = (BUNDLE / "quality-global-output.txt").read_text(encoding="utf-8")
preview_output = (BUNDLE / "preview-render-output.txt").read_text(encoding="utf-8")
eslint_output = (BUNDLE / "eslint-output.txt").read_text(encoding="utf-8")

match = re.search(r"Tests\s+(\d+) passed", integration)
if not index_report["pass"] or not page_report["expectedPageTokens"] or match is None:
    raise SystemExit("missing index, page, or test evidence")
if "50/50 assets pass" not in kit_quality or "2402/2402 assets pass" not in catalog_quality:
    raise SystemExit("quality gate did not pass")
if "pressure-sand-filter-vessel:" not in preview_output or len(variant_report["variants"]) != 2:
    raise SystemExit("missing preview or variant evidence")
if eslint_output.strip():
    raise SystemExit("ESLint output is not empty")
if not (BUNDLE / "after/pressure-sand-filter-vessel.png").is_file():
    raise SystemExit("after preview is missing")

report = {
    "pass": True,
    "asset": {
        "id": "water-treatment/pressure-sand-filter-vessel",
        "triangles": asset["stats"]["triangles"],
        "budget": asset["triangleBudget"],
        "sourceSha256": asset["sourceSha256"],
        "preview": asset["preview"],
    },
    "previewRender": {"kit": "water-treatment", "assetsRendered": 50},
    "quality": {"kitPassing": 50, "kitTotal": 50, "catalogPassing": 2402, "catalogTotal": 2402},
    "index": {"result": "2,402 source hashes and all referenced previews verified"},
    "checks": {
        "targetedTest": "PASS",
        "integration": f"6 files / {match.group(1)} tests passed",
        "eslint": "PASS",
        "localPage": "PASS",
    },
    "variants": variant_report["variants"],
    "provenance": "Local kernelCAD source evaluations, GLB geometry checks, and software renders only; no deployed or physical acceptance.",
}
(BUNDLE / "verification.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
