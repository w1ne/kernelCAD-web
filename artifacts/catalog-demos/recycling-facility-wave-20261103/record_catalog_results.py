#!/usr/bin/env python3
"""Summarize retained full-catalog Vitest and ESLint output for the demo."""

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
index = json.loads((ROOT / "catalog" / "index.json").read_text())
assets = index["assets"]
kit = [asset for asset in assets if asset["kit"] == "recycling-facility"]
test_output = (BUNDLE / "catalog-test-output.txt").read_text()
lint_output = (BUNDLE / "catalog-eslint-output.txt").read_text()
test_files = re.search(r"Test Files\s+(\d+) passed", test_output)
tests = re.search(r"Tests\s+(\d+) passed", test_output)
triangles = [asset["stats"]["triangles"] for asset in kit]
materials = sorted({asset["stats"]["materials"] for asset in kit})
knobs_exact = all([param["name"] for param in asset["params"]] == ["scale", "color"] for asset in kit)
kit_passed = len(kit) == 153 and knobs_exact and all(asset["stats"]["triangles"] <= asset["triangleBudget"] for asset in kit) and materials == [1]
integration = {
    "filesPassed": int(test_files.group(1)) if test_files else 0,
    "testsPassed": int(tests.group(1)) if tests else 0,
    "passed": test_files is not None and tests is not None and "failed" not in test_output.lower(),
}
test_summary = {
    "command": "npx vitest run tests/integration/catalog/",
    "indexedAssetsTotal": len(assets),
    "recyclingFacilitySources": len(kit),
    "triangleRange": [min(triangles), max(triangles)] if triangles else [],
    "triangleBudgetMax": max((asset["triangleBudget"] for asset in kit), default=0),
    "materialCounts": materials,
    "knobsExactScaleAndColor": knobs_exact,
    "integration": integration,
    "passed": integration["passed"] and kit_passed and len(assets) == 2000,
}
lint_errors = len(re.findall(r"\berror\b", lint_output, re.IGNORECASE))
lint_warnings = len(re.findall(r"\bwarning\b", lint_output, re.IGNORECASE))
lint_summary = {
    "command": "npx --silent eslint catalog/",
    "assetSourcesAudited": len(assets),
    "errorCount": lint_errors,
    "warningCount": lint_warnings,
    "passed": lint_errors == 0 and lint_warnings == 0 and not lint_output.strip(),
}
(BUNDLE / "catalog-tests.json").write_text(json.dumps(test_summary, indent=2) + "\n")
(BUNDLE / "catalog-eslint.json").write_text(json.dumps(lint_summary, indent=2) + "\n")
print(json.dumps({"tests": test_summary, "lint": lint_summary}, indent=2))
if not test_summary["passed"] or not lint_summary["passed"]:
    raise SystemExit(1)
