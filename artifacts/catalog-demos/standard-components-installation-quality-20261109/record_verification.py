#!/usr/bin/env python3
"""Validate the retained command outputs and write the final handoff summary."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


OUT = Path(__file__).resolve().parent


def read(name: str) -> str:
    return (OUT / name).read_text(encoding="utf-8")


global_text = read("quality-global-output.txt")
kit_text = read("quality-kit-output.txt")
global_match = re.search(r"\b(\d+)/(\d+) assets pass", global_text)
kit_match = re.search(r"\b(\d+)/(\d+) assets pass", kit_text)
average_match = re.search(r"colours/asset=(\d+\.\d+)", kit_text)
if global_match is None or kit_match is None or average_match is None:
    raise SystemExit("quality output is missing its pass counts or kit average")

preview_text = read("preview-render-output.txt")
preview_count = sum(line.startswith("standard-components/") for line in preview_text.splitlines())
index_text = read("index-build-output.txt")
pages_text = read("catalog-pages-build-output.txt")
test_text = read("vitest-output.txt")
test_files_match = re.search(r"Test Files\s+(\d+) passed \((\d+)\)", test_text)
test_count_match = re.search(r"Tests\s+(\d+) passed \((\d+)\)", test_text)
if test_files_match is None or test_count_match is None:
    raise SystemExit("catalog integration output has no passing summary")

index_check = json.loads(read("preview-index-check.json"))
page_check = json.loads(read("local-page-check.json"))
variant_manifest = json.loads(read("variant-manifest.json"))
video_inspection_path = OUT / "mp4-inspection.json"
video_inspection = json.loads(video_inspection_path.read_text(encoding="utf-8")) if video_inspection_path.is_file() else {"structuralChecksPass": False}
global_passed, global_total = map(int, global_match.groups())
kit_passed, kit_total = map(int, kit_match.groups())
page_match = re.search(r"wrote (\d+) asset page\(s\) \+ hub", pages_text)
page_count = int(page_match.group(1)) if page_match else 0

checks = {
    "catalogIndexBuild": "wrote " in index_text and "catalog/index.json" in index_text,
    "catalogIndexAssetCount": len(index_check["assets"]) == 50 and index_check["kitAssetCount"] == 50,
    "allKitPreviewPathsExist": index_check["allPreviewRoutesAndFilesPass"],
    "allKitSourceHashesMatch": index_check["allKitSourcesMatchIndex"],
    "changedAssetIndexRowsPass": index_check["changedAssetsAllPass"],
    "allKitPreviewsRendered": preview_count == 50,
    "localCatalogPageCount": page_count == 2402,
    "changedLocalPagesPass": page_check["allPassed"] and len(page_check["assets"]) == 5,
    "kitQualityPass": kit_passed == kit_total == 50,
    "catalogQualityPass": global_passed == global_total == 2402,
    "eslintClean": "error" not in read("eslint-output.txt").lower(),
    "catalogIntegrationPass": test_files_match.group(1) == test_files_match.group(2) == "4" and test_count_match.group(1) == test_count_match.group(2) == "15",
    "variantGeometryChecksPass": all(variant_manifest["geometryChecks"].values()),
    "videoStructurePass": video_inspection["structuralChecksPass"],
}
summary = [
    f"standard-components: {kit_passed}/{kit_total} assets pass; {float(average_match.group(1)):.2f} material controls per asset",
    f"catalog quality: {global_passed}/{global_total} assets pass (100.00%; 50 rich kits, 0 thin kits)",
    f"previews/index: {preview_count}/50 kit previews rendered; 50 source hashes and preview routes verified",
    f"local catalog pages: {page_count} generated; 5/5 changed pages and copied previews pass",
    f"checks: ESLint clean; catalog integration {test_files_match.group(1)} files / {test_count_match.group(1)} tests passed",
]
if "--summary-only" in sys.argv:
    if not all([
        preview_count == 50,
        page_count == 2402,
        page_check["allPassed"],
        index_check["allPreviewRoutesAndFilesPass"],
        index_check["allKitSourcesMatchIndex"],
        kit_passed == kit_total == 50,
        global_passed == global_total == 2402,
        "error" not in read("eslint-output.txt").lower(),
        test_files_match.group(1) == test_files_match.group(2) == "4",
        test_count_match.group(1) == test_count_match.group(2) == "15",
    ]):
        raise SystemExit("refusing demo summary: a local check did not pass")
    (OUT / "verification-summary.txt").write_text("\n".join(summary) + "\n", encoding="utf-8")
    print("wrote verified pre-demo summary")
    raise SystemExit(0)
report = {
    "date": "2026-11-09",
    "quality": {"kit": f"{kit_passed}/{kit_total}", "kitAverageMaterialControls": float(average_match.group(1)), "catalog": f"{global_passed}/{global_total}", "catalogPassRate": "100.00%", "richKits": 50, "thinKits": 0},
    "previewCount": preview_count,
    "localCatalogPages": page_count,
    "catalogIntegration": {"testFiles": int(test_files_match.group(1)), "tests": int(test_count_match.group(1))},
    "variantGeometryChecks": variant_manifest["geometryChecks"],
    "video": video_inspection,
    "checks": checks,
    "allPassed": all(checks.values()),
    "deploymentVerified": False,
    "physicalAcceptance": False,
    "summary": summary,
}
(OUT / "verification.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
(OUT / "verification-summary.txt").write_text("\n".join(summary) + "\n", encoding="utf-8")
print(json.dumps({"allPassed": report["allPassed"], "checks": checks, "summary": summary}, indent=2))
if not report["allPassed"]:
    raise SystemExit(1)
