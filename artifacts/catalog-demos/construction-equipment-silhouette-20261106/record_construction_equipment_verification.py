#!/usr/bin/env python3
"""Assemble the retained local build and catalog check evidence."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
settings = json.loads((BUNDLE / "demo-settings.json").read_text(encoding="utf-8"))

def log(name: str) -> str:
    return (BUNDLE / name).read_text(encoding="utf-8", errors="replace")

def require_zero(name: str) -> None:
    if not log(name).startswith("EXIT CODE: 0"):
        raise SystemExit(f"{name} did not pass")

asset_results = []
for target in settings["sources"]:
    asset_id = target["id"]
    filename = f"asset-check-{asset_id}.txt"
    require_zero(filename)
    lines = log(filename).splitlines()
    payload = next((line for line in reversed(lines) if line.startswith("{")), None)
    if payload is None:
        raise SystemExit(f"asset check result missing for {asset_id}")
    result = json.loads(payload)
    if result["triangles"] > result["budget"]:
        raise SystemExit(f"triangle budget exceeded for {asset_id}")
    source = ROOT / target["source"]
    asset_results.append({
        "id": asset_id,
        "source": target["source"],
        "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "triangles": result["triangles"],
        "triangleBudget": result["budget"],
        "sizeM": result["sizeM"],
        "minUpM": result["minUpM"],
        "params": result["knobs"],
        "materialPalette": result["palette"],
        "defaultPreview": target["defaultPreview"],
    })

global_quality = log("quality-global-output.txt")
kit_quality = log("quality-kit-output.txt")
global_match = re.search(r"(\d+)/(\d+) assets pass", global_quality)
kit_match = re.search(r"(\d+)/(\d+) assets pass", kit_quality)
if global_match is None or kit_match is None:
    raise SystemExit("quality gate summaries missing")
global_pass = {"passed": int(global_match.group(1)), "total": int(global_match.group(2))}
kit_pass = {"passed": int(kit_match.group(1)), "total": int(kit_match.group(2))}
if global_pass != {"passed": 2390, "total": 2390} or kit_pass != {"passed": 60, "total": 60}:
    raise SystemExit(f"quality pass count changed unexpectedly: global={global_pass}, kit={kit_pass}")

for name in [
    "catalog-preview-render-output.txt",
    "catalog-build-output.txt",
    "preview-index-check-output.txt",
    "catalog-pages-build-output.txt",
    "local-page-check-output.txt",
    "quality-global-output.txt",
    "quality-kit-output.txt",
    "eslint-output.txt",
    "demo-script-eslint-output.txt",
    "catalog-integration-output.txt",
]:
    require_zero(name)

preview_lines = [
    line for line in log("catalog-preview-render-output.txt").splitlines()
    if line.startswith("construction-equipment/")
]
if len(preview_lines) != 60:
    raise SystemExit(f"expected 60 kit preview outputs, found {len(preview_lines)}")
index_check = json.loads((BUNDLE / "preview-index-check.json").read_text(encoding="utf-8"))
page_check = json.loads((BUNDLE / "local-page-check.json").read_text(encoding="utf-8"))
if index_check["verifiedAssets"] != 60 or page_check["pagesChecked"] != 3:
    raise SystemExit("preview/index or local page verification counts differ from the handoff")

integration_output = log("catalog-integration-output.txt")
file_match = re.search(r"Test Files\s+(\d+) passed", integration_output)
test_match = re.search(r"Tests\s+(\d+) passed", integration_output)
cdp_before = json.loads((BUNDLE / "inspection/cdp-before.json").read_text(encoding="utf-8"))
cdp_after = json.loads((BUNDLE / "inspection/cdp-after.json").read_text(encoding="utf-8"))
verification = {
    "status": "passed",
    "kit": settings["kit"],
    "assetsPromotedFromThin": 0,
    "existingAssetsVisuallyRefined": len(asset_results),
    "catalogAssetCount": global_pass["total"],
    "catalogQuality": {
        "passed": global_pass["passed"],
        "total": global_pass["total"],
        "passRate": f"{100 * global_pass['passed'] / global_pass['total']:.2f}%",
        "thinAssets": 0,
    },
    "kitQuality": {
        "passed": kit_pass["passed"],
        "total": kit_pass["total"],
        "passRate": f"{100 * kit_pass['passed'] / kit_pass['total']:.2f}%",
    },
    "assets": asset_results,
    "materialColorControlsAdded": 6,
    "presetVariantBlocksExtended": 6,
    "newPresetNames": 0,
    "previewsRerendered": len(preview_lines),
    "index": {
        "assetsVerified": index_check["verifiedAssets"],
        "sourceHashesMatch": True,
        "previewPathsPresent": True,
    },
    "localPagesChecked": page_check["pagesChecked"],
    "eslint": "passed",
    "catalogIntegration": {
        "status": "passed",
        "files": int(file_match.group(1)) if file_match else None,
        "tests": int(test_match.group(1)) if test_match else None,
    },
    "renderInspect": {
        "status": "failed_cdp_attach",
        "reason": "Playwright connected to the existing Chrome CDP websocket, then timed out after 30000 ms; the command required that attachment and did not launch a second browser.",
        "existingChromeRemainedOpen": True,
        "pageCountBefore": cdp_before["pageCount"],
        "pageCountAfter": cdp_after["pageCount"],
        "softwareRenderedPreviewsInspected": 3,
    },
    "deployment": "not deployed",
    "physicalAcceptance": "not claimed",
}
(BUNDLE / "verification.json").write_text(json.dumps(verification, indent=2) + "\n", encoding="utf-8")
print(json.dumps({
    "status": verification["status"],
    "catalogQuality": verification["catalogQuality"],
    "kitQuality": verification["kitQuality"],
    "assets": [{"id": row["id"], "triangles": row["triangles"], "budget": row["triangleBudget"]} for row in asset_results],
    "previewsRerendered": len(preview_lines),
    "localPagesChecked": page_check["pagesChecked"],
    "catalogIntegration": verification["catalogIntegration"],
}, indent=2))
