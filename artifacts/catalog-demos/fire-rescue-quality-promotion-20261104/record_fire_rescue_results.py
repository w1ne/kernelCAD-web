#!/usr/bin/env python3
"""Record the final source, preview, index, lint, test, and page evidence."""

import hashlib
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
INDEX = json.loads((ROOT / "catalog/index.json").read_text())
PROMOTION = json.loads((BUNDLE / "promotion-output.json").read_text())
ASSETS = [asset for asset in INDEX["assets"] if asset["kit"] == "fire-rescue"]
COLOR_COUNTS = [sum(param["type"] == "color" for param in asset["params"]) for asset in ASSETS]
PRESET_COUNTS = [len(asset.get("presets", {})) for asset in ASSETS]


def status(name):
    return json.loads((BUNDLE / name).read_text())


source_hashes_fresh = True
for asset in ASSETS:
    source = (ROOT / asset["source"]).read_bytes()
    if hashlib.sha256(source).hexdigest() != asset["sourceSha256"]:
        source_hashes_fresh = False

render_lines = (BUNDLE / "catalog-preview-render-output.txt").read_text().splitlines()
rendered = len([line for line in render_lines if line.startswith("fire-rescue/") and " tris" in line])
quality_text = (BUNDLE / "catalog-quality-output.txt").read_text()
quality_match = re.search(r"(\d+)/(\d+) assets pass", quality_text)
eslint = status("catalog-eslint-status.json")
integration = status("catalog-test-status.json")
pages = status("catalog-pages-check.json")
budgets_ok = all(asset["stats"]["triangles"] <= asset["triangleBudget"] for asset in ASSETS)
base_assets = [asset for asset in ASSETS if asset["origin"] == "base"]
ground_contact_ok = all(abs(asset["stats"]["minUpM"]) < 1e-6 for asset in base_assets)
preview_rows = sum(asset.get("preview") is not None for asset in ASSETS)
result = {
    "kit": "fire-rescue",
    "assetsPromoted": len(ASSETS),
    "newAssets": 0,
    "namedMaterialColorControls": sum(COLOR_COUNTS),
    "materialControlsMin": min(COLOR_COUNTS) if COLOR_COUNTS else 0,
    "materialControlsMax": max(COLOR_COUNTS) if COLOR_COUNTS else 0,
    "presetEntries": sum(PRESET_COUNTS),
    "presetNames": sorted({name for asset in ASSETS for name in asset.get("presets", {})}),
    "partAssignments": sum(item["partAssignments"] for item in PROMOTION["assets"]),
    "previewsRendered": rendered,
    "indexedRowsWithPreview": preview_rows,
    "sourceHashesFresh": source_hashes_fresh,
    "maxTriangleCount": max((asset["stats"]["triangles"] for asset in ASSETS), default=0),
    "maxTriangleBudget": max((asset["triangleBudget"] for asset in ASSETS), default=0),
    "triangleBudgetsHonest": budgets_ok,
    "baseAssetsOnGround": ground_contact_ok,
    "qualityGate": f"{quality_match.group(1)}/{quality_match.group(2)} assets pass" if quality_match else "missing result",
    "eslint": "passed" if eslint.get("passed") else "failed",
    "integration": "passed" if integration.get("passed") else "failed",
    "catalogPages": "passed" if pages.get("passed") else "failed",
    "catalogPagePairs": pages.get("pageAndPreviewPairs", 0),
    "status": "passed" if (
        len(ASSETS) == 60
        and len(PROMOTION["assets"]) == 60
        and min(COLOR_COUNTS) >= 2
        and max(COLOR_COUNTS) <= 4
        and all(count >= 1 for count in PRESET_COUNTS)
        and rendered == 60
        and preview_rows == 60
        and source_hashes_fresh
        and budgets_ok
        and ground_contact_ok
        and quality_match is not None
        and quality_match.group(1) == quality_match.group(2)
        and eslint.get("passed")
        and integration.get("passed")
        and pages.get("passed")
    ) else "failed",
    "claimBoundary": "Local source replay, software-rendered previews, catalog pages, lint, and integration tests; production deployment, field simulation, safety certification, and hardware acceptance are not established.",
}
(BUNDLE / "promotion-audit.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if result["status"] != "passed":
    raise SystemExit(1)
