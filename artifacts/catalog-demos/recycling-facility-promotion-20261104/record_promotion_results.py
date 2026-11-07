#!/usr/bin/env python3
"""Record source, hash, preset, preview and verification results for the demo."""

import hashlib
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/recycling-facility"
index = json.loads((ROOT / "catalog/index.json").read_text())
rows = [asset for asset in index["assets"] if asset["kit"] == "recycling-facility"]
counts = []
preset_counts = []
geometry_sources = 0
hash_mismatches = []
missing_previews = []
triangles = []

for asset in rows:
    source = ROOT / asset["source"]
    text = source.read_text()
    knobs = [name for name in re.findall(r"\bparam\s*\(\s*['\"]([^'\"]+)['\"]", text) if name != "scale"]
    preset_block = re.search(r"\bpreset[s]?\s*\(\s*\{(.*?)\}\s*\);", text, re.S)
    presets = re.findall(r"^\s{2}([A-Za-z_]\w*)\s*:", preset_block.group(1), re.M) if preset_block else []
    counts.append(len(knobs))
    preset_counts.append(len(presets))
    geometry_sources += bool(re.search(r"\.(?:path|loft|rotate[A-Z][A-Za-z]*)\s*\(", text))
    actual_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    if actual_hash != asset["sourceSha256"]:
        hash_mismatches.append(asset["id"])
    preview_file = KIT / "previews" / f"{asset['id']}.png"
    if not asset.get("preview") or not preview_file.is_file():
        missing_previews.append(asset["id"])
    triangles.append(asset["stats"]["triangles"])

quality_log = BUNDLE / "catalog-quality-output.txt"
eslint_log = BUNDLE / "catalog-eslint-final-output.txt"
test_log = BUNDLE / "catalog-test-output.txt"
pages = json.loads((BUNDLE / "catalog-pages-check.json").read_text())
test_text = test_log.read_text()
file_match = re.search(r"Test Files\s+(\d+) passed", test_text)
test_match = re.search(r"Tests\s+(\d+) passed", test_text)
tests_passed = file_match is not None and test_match is not None

eslint_status = {
    "command": "npx eslint catalog/kits/recycling-facility/",
    "passed": eslint_log.exists() and eslint_log.stat().st_size == 0,
    "errors": 0 if eslint_log.exists() and eslint_log.stat().st_size == 0 else None,
    "output": eslint_log.name,
}
test_status = {
    "command": "npx vitest run tests/integration/catalog/",
    "passed": tests_passed and "FAIL" not in test_text,
    "filesPassed": int(file_match.group(1)) if file_match else 0,
    "testsPassed": int(test_match.group(1)) if test_match else 0,
    "output": test_log.name,
}
(BUNDLE / "catalog-eslint-status.json").write_text(json.dumps(eslint_status, indent=2) + "\n")
(BUNDLE / "catalog-test-status.json").write_text(json.dumps(test_status, indent=2) + "\n")

result = {
    "kit": "recycling-facility",
    "assetsPromoted": len(rows),
    "newAssetsAdded": 0,
    "materialKnobsMin": min(counts) if counts else 0,
    "materialKnobsMax": max(counts) if counts else 0,
    "materialKnobsTotal": sum(counts),
    "netMaterialKnobsAdded": sum(count - 1 for count in counts),
    "presetNamesPerAsset": sorted(set(preset_counts)),
    "presetEntries": min(preset_counts) if preset_counts and len(set(preset_counts)) == 1 else 0,
    "presetEntriesTotal": sum(preset_counts),
    "curvedGeometryAssets": geometry_sources,
    "previewsRendered": sum(1 for path in KIT.glob("previews/*.png") if path.stem in {a["id"] for a in rows}),
    "indexedRowsWithPreview": sum(1 for asset in rows if asset.get("preview")),
    "catalogRows": len(index["assets"]),
    "sourceHashesFresh": not hash_mismatches,
    "sourceHashMismatches": hash_mismatches,
    "missingPreviews": missing_previews,
    "triangleRange": [min(triangles), max(triangles)] if triangles else [0, 0],
    "qualityGate": "153/153 pass" if len(rows) == 153 and min(counts) >= 2 and max(counts) <= 4 and min(preset_counts) >= 1 else "FAIL",
    "eslint": "passed" if eslint_status["passed"] else "failed",
    "integration": f"{test_status['filesPassed']} files · {test_status['testsPassed']} tests passed" if test_status["passed"] else "failed",
    "localPages": "passed" if pages.get("passed") else "failed",
    "localPagePairs": pages.get("pageAndPreviewPairs", 0),
    "liveProduction": "not deployed; verify after merge/deployment",
}
(BUNDLE / "promotion-audit.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if (
    result["assetsPromoted"] != 153
    or result["qualityGate"] == "FAIL"
    or not result["sourceHashesFresh"]
    or result["missingPreviews"]
    or not eslint_status["passed"]
    or not test_status["passed"]
    or not pages.get("passed")
):
    raise SystemExit(1)
