#!/usr/bin/env python3
"""Record source/index/mesh and catalog-suite evidence for the postal kit."""

import hashlib
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
index = json.loads((ROOT / "catalog" / "index.json").read_text())
rows = [asset for asset in index["assets"] if asset["kit"] == "postal-logistics"]
log = (BUNDLE / "catalog-test-output.txt").read_text()
files_match = re.search(r"Test Files\s+(\d+) passed", log)
tests_match = re.search(r"Tests\s+(\d+) passed", log)
duration_match = re.search(r"Duration\s+([\d.]+)s", log)
if not (files_match and tests_match and duration_match):
    raise SystemExit("catalog integration summary is missing or did not pass")

assets = []
for asset in rows:
    source = ROOT / asset["source"]
    actual_sha = hashlib.sha256(source.read_bytes()).hexdigest()
    preview = ROOT / "catalog" / "kits" / asset["kit"] / "previews" / f"{asset['id']}.png"
    knobs = [param["name"] for param in asset["params"]]
    passed = (
        actual_sha == asset["sourceSha256"]
        and knobs == ["scale", "color"]
        and asset["stats"]["materials"] == 1
        and asset["stats"]["minUpM"] == 0
        and asset["stats"]["triangles"] <= asset["triangleBudget"]
        and preview.is_file()
    )
    assets.append(
        {
            "id": asset["id"],
            "triangles": asset["stats"]["triangles"],
            "budget": asset["triangleBudget"],
            "materials": asset["stats"]["materials"],
            "minUpM": asset["stats"]["minUpM"],
            "knobs": knobs,
            "sourceSha256Matches": actual_sha == asset["sourceSha256"],
            "previewPresent": preview.is_file(),
            "passed": passed,
        }
    )

triangles = [asset["triangles"] for asset in assets]
summary = {
    "kit": "postal-logistics",
    "added": len(rows),
    "catalogTotal": len(index["assets"]),
    "passed": sum(asset["passed"] for asset in assets),
    "total": len(rows),
    "triangleRange": [min(triangles), max(triangles)] if triangles else [],
    "allOneMaterial": all(asset["materials"] == 1 for asset in assets),
    "allWithinBudget": all(asset["triangles"] <= asset["budget"] for asset in assets),
    "allBaseOrigin": all(asset["minUpM"] == 0 for asset in assets),
    "allKnobsExact": all(asset["knobs"] == ["scale", "color"] for asset in assets),
    "allSourceHashesMatch": all(asset["sourceSha256Matches"] for asset in assets),
    "allPreviewsPresent": all(asset["previewPresent"] for asset in assets),
    "integration": {
        "passed": True,
        "filesPassed": int(files_match.group(1)),
        "testsPassed": int(tests_match.group(1)),
        "durationSeconds": float(duration_match.group(1)),
    },
    "assets": assets,
}
(BUNDLE / "asset-check-results.json").write_text(json.dumps(summary, indent=2) + "\n")
(BUNDLE / "catalog-tests.json").write_text(
    json.dumps(
        {
            "command": "npx vitest run tests/integration/catalog/",
            "status": "passed",
            "filesPassed": summary["integration"]["filesPassed"],
            "testsPassed": summary["integration"]["testsPassed"],
            "durationSeconds": summary["integration"]["durationSeconds"],
        },
        indent=2,
    )
    + "\n"
)
print(json.dumps({key: value for key, value in summary.items() if key != "assets"}, indent=2))
if len(rows) != 52 or summary["passed"] != len(rows):
    raise SystemExit("one or more postal assets did not satisfy the source/index/mesh audit")
