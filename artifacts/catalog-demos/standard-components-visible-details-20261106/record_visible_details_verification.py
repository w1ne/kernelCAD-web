#!/usr/bin/env python3
"""Assemble source, preview, index, quality and test results into one report."""

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
INDEX = json.loads((ROOT / "catalog/index.json").read_text())
KIT = next(row for row in INDEX["kits"] if row["id"] == "standard-components")


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def exit_code(name):
    first = (BUNDLE / name).read_text().splitlines()[0]
    return int(first.removeprefix("EXIT CODE: "))


def quality_pass(name):
    text = (BUNDLE / name).read_text()
    match = re.search(r"(\d+)/(\d+) assets pass", text)
    if not match:
        raise SystemExit(f"could not parse pass rate from {name}")
    return tuple(map(int, match.groups()))


all_quality = quality_pass("catalog-quality-output.txt")
kit_quality = quality_pass("kit-quality-output.txt")
test_text = (BUNDLE / "catalog-integration-output.txt").read_text()
files_match = re.search(r"Test Files\s+(\d+) passed", test_text)
tests_match = re.search(r"Tests\s+(\d+) passed", test_text)
if not (files_match and tests_match):
    raise SystemExit("could not parse integration test results")
index_check = json.loads((BUNDLE / "preview-index-check.json").read_text())
page_check = json.loads((BUNDLE / "local-page-check.json").read_text())
asset_checks = json.loads((BUNDLE / "asset-check-results.json").read_text())
preview_count, kit_total = kit_quality
catalog_count, catalog_total = all_quality

report = {
    "date": "2026-11-06",
    "assetsRefined": ["standard-components/timing-belt-pulley", "standard-components/door-hinge", "standard-components/din-rail-terminal-block"],
    "newAssetIDs": 0,
    "newKits": 0,
    "newMaterialControls": 3,
    "newPresetBlocks": 0,
    "presetEntriesExpanded": 9,
    "assetResults": asset_checks,
    "kitAssets": len(KIT["assets"]),
    "catalogAssets": len(INDEX["assets"]),
    "kitPassing": preview_count,
    "kitTotal": kit_total,
    "kitPassRate": f"{preview_count / kit_total:.0%}",
    "catalogPassing": catalog_count,
    "catalogTotal": catalog_total,
    "catalogPassRate": f"{catalog_count / catalog_total:.0%}",
    "thinAssets": catalog_total - catalog_count,
    "previewCount": index_check["indexedAndPresent"],
    "allKitPreviewPathsPresent": index_check["passed"],
    "sourceSha256Matches": all(index_check["checks"].values()),
    "eslint": "PASS" if exit_code("eslint-output.txt") == 0 else "FAIL",
    "eslintExitCode": exit_code("eslint-output.txt"),
    "integrationFiles": int(files_match.group(1)),
    "integrationTests": int(tests_match.group(1)),
    "integrationExitCode": exit_code("catalog-integration-output.txt"),
    "localPage": "PASS" if page_check["passed"] else "FAIL",
    "localPageCheckCount": len(page_check["checks"]),
    "catalogBuildExitCode": exit_code("catalog-build-output.txt"),
    "previewRenderExitCode": exit_code("catalog-preview-render-output.txt"),
    "variantRenderExitCode": exit_code("variant-render-output.txt"),
    "deploymentVerified": False,
    "physicalAcceptance": False,
}
report["passed"] = all([
    report["newAssetIDs"] == 0,
    report["newKits"] == 0,
    report["kitPassing"] == report["kitTotal"],
    report["catalogPassing"] == report["catalogTotal"],
    report["allKitPreviewPathsPresent"],
    report["sourceSha256Matches"],
    report["eslintExitCode"] == 0,
    report["integrationExitCode"] == 0,
    report["localPage"] == "PASS",
    report["catalogBuildExitCode"] == 0,
    report["previewRenderExitCode"] == 0,
    report["variantRenderExitCode"] == 0,
    all(item["triangles"] <= item["triangleBudget"] for item in asset_checks.values()),
])
(BUNDLE / "verification.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
if not report["passed"]:
    raise SystemExit(1)
