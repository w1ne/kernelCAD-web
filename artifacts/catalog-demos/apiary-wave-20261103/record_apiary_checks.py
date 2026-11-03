#!/usr/bin/env python3
"""Summarize retained catalog, lint, test and page-check evidence."""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
index = json.loads((ROOT / "catalog" / "index.json").read_text())
assets = [asset for asset in index["assets"] if asset["kit"] == "apiary"]
if len(assets) != 50:
    raise SystemExit(f"expected 50 apiary rows, found {len(assets)}")

preview_files = [ROOT / "catalog" / "kits" / "apiary" / "previews" / f"{asset['id']}.png" for asset in assets]
bad_rows = [
    asset["id"] for asset, preview in zip(assets, preview_files)
    if asset.get("preview") != f"/assets/apiary-{asset['id']}.png"
    or asset["stats"]["triangles"] > asset["triangleBudget"]
    or asset["stats"]["materials"] != 1
    or [parameter["name"] for parameter in asset["params"]] != ["scale", "color"]
    or not preview.is_file()
]
if bad_rows:
    raise SystemExit("catalog evidence failed for: " + ", ".join(bad_rows))

test_text = (BUNDLE / "catalog-test-output.txt").read_text()
files_match = re.search(r"Test Files\s+(\d+) passed", test_text)
tests_match = re.search(r"Tests\s+(\d+) passed", test_text)
if not files_match or not tests_match:
    raise SystemExit("could not find passing Vitest file and test counts")

lint_path = BUNDLE / "catalog-lint-output.txt"
lint_text = lint_path.read_text()
if "error" in lint_text.lower() or "warning" in lint_text.lower():
    raise SystemExit("eslint output contains a warning or error")

triangles = [asset["stats"]["triangles"] for asset in assets]
result = {
    "kit": "apiary",
    "total": len(assets),
    "passed": len(assets),
    "triangleRange": [min(triangles), max(triangles)],
    "triangleBudget": 1800,
    "materialsPerAsset": 1,
    "indexedKnobs": ["scale", "color"],
    "renderedPreviewFiles": sum(preview.is_file() for preview in preview_files),
    "runningTotal": len(index["assets"]),
    "runningTotalWithPreviews": sum(bool(asset.get("preview")) for asset in index["assets"]),
    "integration": {
        "filesPassed": int(files_match.group(1)),
        "testsPassed": int(tests_match.group(1)),
        "command": "npx vitest run tests/integration/catalog/",
    },
    "lint": {"passed": True, "command": "npx eslint catalog/"},
    "localPages": json.loads((BUNDLE / "catalog-pages-check.json").read_text()),
}
(BUNDLE / "asset-check-results.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
