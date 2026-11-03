#!/usr/bin/env python3
"""Summarize retained lint, full-catalog integration, and theatre-production index evidence."""

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
index = json.loads((ROOT / "catalog" / "index.json").read_text())
rows = [asset for asset in index["assets"] if asset["kit"] == "theatre-production"]
test_output = (BUNDLE / "catalog-test-output.txt").read_text()
lint_output = (BUNDLE / "catalog-lint-output.txt").read_text()
test_files = re.search(r"Test Files\s+(\d+) passed \((\d+)\)", test_output)
test_counts = re.search(r"Tests\s+(\d+) passed \((\d+)\)", test_output)
if test_files is None or test_counts is None or len(rows) != 52:
    raise SystemExit("full catalog test evidence or the 52 indexed theatre-production rows are missing")

triangles = [row["stats"]["triangles"] for row in rows]
materials = sorted({row["stats"]["materials"] for row in rows})
knobs = sorted({" + ".join(param["name"] for param in row["params"]) for row in rows})
minimum_z = min(row["stats"]["minUpM"] for row in rows)
passed = all(row["stats"]["triangles"] <= row["triangleBudget"] for row in rows) and materials == [1] and knobs == ["scale + color"] and minimum_z == 0

tests = {
    "command": "npx vitest run tests/integration/catalog/",
    "assetsInIndex": len(index["assets"]),
    "kit": "theatre-production",
    "kitAssets": len(rows),
    "loadKnobsMeshBudgetsMaterialsAndStudio": "passed by the full catalog integration suite",
    "integration": {"filesPassed": int(test_files.group(1)), "filesTotal": int(test_files.group(2)), "testsPassed": int(test_counts.group(1)), "testsTotal": int(test_counts.group(2))},
    "triangleRange": [min(triangles), max(triangles)],
    "materials": materials,
    "knobs": knobs,
    "minimumBaseZ": minimum_z,
    "allWithinTriangleBudget": all(row["stats"]["triangles"] <= row["triangleBudget"] for row in rows),
    "passed": int(test_files.group(1)) == int(test_files.group(2)) and int(test_counts.group(1)) == int(test_counts.group(2)) and passed,
}
(BUNDLE / "catalog-tests.json").write_text(json.dumps(tests, indent=2) + "\n")

lint = {
    "command": "npx eslint catalog/",
    "assetSources": len(index["assets"]),
    "errorCount": 0 if not lint_output.strip() else None,
    "warningCount": 0 if not lint_output.strip() else None,
    "output": lint_output,
    "passed": not lint_output.strip(),
}
(BUNDLE / "catalog-eslint.json").write_text(json.dumps(lint, indent=2) + "\n")
print(json.dumps({"tests": tests, "lint": lint}, indent=2))
if not tests["passed"] or not lint["passed"]:
    raise SystemExit(1)
