#!/usr/bin/env python3
"""Assemble repeatable source, preview, index, lint and integration evidence."""

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
SOURCE = ROOT / "catalog/kits/standard-components/linear-guide-carriage.kcad.ts"
BEFORE_SOURCE = BUNDLE / "before/linear-guide-carriage.kcad.ts"
PREVIEW = ROOT / "catalog/kits/standard-components/previews/linear-guide-carriage.png"
BEFORE_PREVIEW = BUNDLE / "before/linear-guide-carriage.png"
INDEX = ROOT / "catalog/index.json"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def exit_code(name):
    first = (BUNDLE / name).read_text().splitlines()[1]
    return int(first.removeprefix("EXIT CODE: ").removeprefix("exit code: "))


index = json.loads(INDEX.read_text())
asset = next(item for item in index["assets"] if item["kit"] == "standard-components" and item["id"] == "linear-guide-carriage")
kit = next(item for item in index["kits"] if item["id"] == "standard-components")
quality_text = (BUNDLE / "catalog-quality-output.txt").read_text()
kit_quality_text = (BUNDLE / "kit-quality-output.txt").read_text()
match = re.search(r"(\d+)/(\d+) assets pass", quality_text)
kit_match = re.search(r"(\d+)/(\d+) assets pass", kit_quality_text)
test_text = (BUNDLE / "catalog-integration-output.txt").read_text()
files_match = re.search(r"Test Files\s+(\d+) passed", test_text)
tests_match = re.search(r"Tests\s+(\d+) passed", test_text)
index_preview = json.loads((BUNDLE / "preview-index-check.json").read_text())
local_page = json.loads((BUNDLE / "local-page-check.json").read_text())
variant_renders = json.loads((BUNDLE / "variant-renders.json").read_text())
default_variant = next(item for item in variant_renders["renders"] if item["id"] == "standard-default")

if not all((match, kit_match, files_match, tests_match)):
    raise SystemExit("could not parse the required verification outputs")

catalog_passing, catalog_total = map(int, match.groups())
kit_passing, kit_total = map(int, kit_match.groups())
report = {
    "date": "2026-11-06",
    "asset": "standard-components/linear-guide-carriage",
    "source": "catalog/kits/standard-components/linear-guide-carriage.kcad.ts",
    "sourceSha256": digest(SOURCE),
    "beforeSourceSha256": digest(BEFORE_SOURCE),
    "indexSourceSha256": asset["sourceSha256"],
    "sourceHashMatchesIndex": digest(SOURCE) == asset["sourceSha256"],
    "preview": "catalog/kits/standard-components/previews/linear-guide-carriage.png",
    "previewSha256": digest(PREVIEW),
    "beforePreviewSha256": digest(BEFORE_PREVIEW),
    "previewPath": asset.get("preview"),
    "previewExists": PREVIEW.is_file(),
    "triangleCount": asset["stats"]["triangles"],
    "triangleBudget": asset["triangleBudget"],
    "dimensionsMm": default_variant["dimensionsMm"],
    "kitAssets": len(kit["assets"]),
    "catalogAssets": len(index["assets"]),
    "kitPassing": kit_passing,
    "kitTotal": kit_total,
    "kitPassRate": f"{kit_passing / kit_total:.0%}",
    "catalogPassing": catalog_passing,
    "catalogTotal": catalog_total,
    "catalogPassRate": f"{catalog_passing / catalog_total:.0%}",
    "thinAssets": catalog_total - catalog_passing,
    "previewCount": index_preview["indexedAndPresent"],
    "allKitPreviewPathsPresent": index_preview["indexedAndPresent"] == index_preview["kitAssets"] == 50,
    "eslint": "PASS" if exit_code("eslint-output.txt") == 0 else "FAIL",
    "eslintExitCode": exit_code("eslint-output.txt"),
    "integrationFiles": int(files_match.group(1)),
    "integrationTests": int(tests_match.group(1)),
    "integrationExitCode": exit_code("catalog-integration-output.txt"),
    "localPage": "PASS" if local_page["passed"] else "FAIL",
    "localPageCheckCount": len(local_page["checks"]),
    "catalogBuildExitCode": exit_code("catalog-build-output.txt"),
    "previewRenderExitCode": exit_code("preview-render-output.txt"),
    "deploymentVerified": False,
    "physicalAcceptance": False,
}
report["passed"] = all([
    report["sourceHashMatchesIndex"],
    report["previewExists"],
    report["allKitPreviewPathsPresent"],
    report["eslintExitCode"] == 0,
    report["integrationExitCode"] == 0,
    report["localPage"] == "PASS",
    report["catalogBuildExitCode"] == 0,
    report["previewRenderExitCode"] == 0,
    report["triangleCount"] <= report["triangleBudget"],
    report["kitPassing"] == report["kitTotal"],
    report["catalogPassing"] == report["catalogTotal"],
])
(BUNDLE / "verification.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
if not report["passed"]:
    raise SystemExit(1)
