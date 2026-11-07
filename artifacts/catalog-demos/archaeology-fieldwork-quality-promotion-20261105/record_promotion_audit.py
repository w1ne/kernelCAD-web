#!/usr/bin/env python3
"""Record source, index, preview and unchanged-catalog integrity for this round."""

import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/archaeology-fieldwork"
INDEX = ROOT / "catalog/index.json"


def main() -> None:
    index = json.loads(INDEX.read_text())
    baseline = json.loads(subprocess.check_output(
        ["git", "show", "HEAD:catalog/index.json"], cwd=ROOT, text=True
    ))
    rows = [row for row in index["assets"] if row["kit"] == "archaeology-fieldwork"]
    old_ids = {(row["kit"], row["id"]) for row in baseline["assets"]}
    new_ids = {(row["kit"], row["id"]) for row in index["assets"]}
    issues = []
    material_controls = 0
    preset_entries = 0
    source_hashes = {}
    max_triangles = 0
    min_triangles = None

    if len(rows) != 50:
        issues.append("expected 50 archaeology-fieldwork rows, found " + str(len(rows)))
    if len(index["assets"]) != len(baseline["assets"]) or old_ids != new_ids:
        issues.append("catalog IDs/count changed during an in-place promotion")

    for row in rows:
        asset_id = row["id"]
        source_path = ROOT / row["source"]
        source = source_path.read_text()
        actual_hash = hashlib.sha256(source_path.read_bytes()).hexdigest()
        source_hashes[asset_id] = {
            "sourceSha256": row["sourceSha256"],
            "actualSha256": actual_hash,
            "matches": row["sourceSha256"] == actual_hash,
        }
        if row["sourceSha256"] != actual_hash:
            issues.append(asset_id + ": source hash mismatch")
        if not row.get("preview"):
            issues.append(asset_id + ": index row has no preview")
        if not (KIT / "previews" / (asset_id + ".png")).is_file():
            issues.append(asset_id + ": generated preview PNG is missing")
        colors = [p for p in row["params"] if p["type"] == "color"]
        material_controls += len(colors)
        if not 2 <= len(colors) <= 4:
            issues.append(asset_id + ": expected 2-4 material controls")
        applied_colors = set(re.findall(r"\.color\(\s*([A-Za-z_]\w*)", source))
        for param in colors:
            if param["name"] not in applied_colors:
                issues.append(asset_id + ": material control " + param["name"] + " is unused")
        if "scale" not in {p["name"] for p in row["params"]}:
            issues.append(asset_id + ": scale control was lost")
        presets = row.get("presets", {})
        preset_entries += len(presets)
        if not {"fieldReady", "weathered"}.issubset(presets):
            issues.append(asset_id + ": expected fieldReady and weathered presets")
        triangles = row["stats"]["triangles"]
        budget = row["triangleBudget"]
        max_triangles = max(max_triangles, triangles)
        min_triangles = triangles if min_triangles is None else min(min_triangles, triangles)
        if triangles > budget:
            issues.append(asset_id + ": " + str(triangles) + " triangles exceed budget " + str(budget))

    quality = subprocess.run(
        [sys.executable, "scripts/checkCatalogQuality.py", "--kit", "archaeology-fieldwork"],
        cwd=ROOT, text=True, capture_output=True,
    )
    quality_output = quality.stdout.strip()
    quality_pass = quality.returncode == 0 and "50/50 assets pass" in quality_output
    if not quality_pass:
        issues.append("catalog quality checker did not report 50/50 pass")

    eslint = json.loads((BUNDLE / "catalog-eslint-status.json").read_text())
    tests = json.loads((BUNDLE / "catalog-test-status.json").read_text())
    pages = json.loads((BUNDLE / "catalog-pages-check.json").read_text())
    local_checks = (
        eslint.get("status") == "passed"
        and tests.get("status") == "passed"
        and pages.get("status") == "passed"
    )
    if not local_checks:
        issues.append("one or more required local checks did not pass")

    result = {
        "date": "2026-11-05",
        "kit": "archaeology-fieldwork",
        "passed": not issues,
        "assetsPromoted": len(rows),
        "materialControls": material_controls,
        "presetEntries": preset_entries,
        "indexedRowsWithPreview": sum(bool(row.get("preview")) for row in rows),
        "catalogTotal": len(index["assets"]),
        "catalogTotalUnchanged": len(index["assets"]) == len(baseline["assets"]),
        "catalogIdsUnchanged": old_ids == new_ids,
        "qualityGate": "50/50 pass" if quality_pass else quality_output,
        "globalQualityGate": (BUNDLE / "catalog-quality-output.txt").read_text().strip().splitlines()[-2:],
        "minimumTriangles": min_triangles,
        "maximumTriangles": max_triangles,
        "eslint": eslint.get("summary", eslint.get("status")),
        "catalogIntegration": tests.get("summary", tests.get("status")),
        "localPages": pages.get("status") == "passed",
        "sourceHashes": source_hashes,
        "issues": issues,
    }
    (BUNDLE / "promotion-audit.json").write_text(json.dumps(result, indent=2) + "\n")
    (BUNDLE / "quality-kit-output.txt").write_text(quality_output + "\n")
    (BUNDLE / "index-integrity-status.json").write_text(json.dumps({
        "kit": "archaeology-fieldwork",
        "sourceRows": len(rows),
        "hashesMatch": all(row["matches"] for row in source_hashes.values()),
        "allPreviewRowsPresent": all(bool(row.get("preview")) for row in rows),
        "allPreviewFilesPresent": all((KIT / "previews" / (row["id"] + ".png")).is_file() for row in rows),
        "catalogIdsUnchanged": old_ids == new_ids,
        "catalogTotalUnchanged": len(index["assets"]) == len(baseline["assets"]),
    }, indent=2) + "\n")
    print(json.dumps({key: result[key] for key in (
        "passed", "assetsPromoted", "materialControls", "presetEntries",
        "indexedRowsWithPreview", "catalogTotal", "qualityGate", "issues"
    )}, indent=2))
    if issues:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
