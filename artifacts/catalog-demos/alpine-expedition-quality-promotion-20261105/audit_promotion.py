#!/usr/bin/env python3
"""Audit the in-place promotion against generated source hashes and previews."""

import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/alpine-expedition"


def main() -> None:
    index = json.loads((ROOT / "catalog/index.json").read_text())
    baseline = json.loads(subprocess.check_output(
        ["git", "show", "HEAD:catalog/index.json"], cwd=ROOT, text=True
    ))
    rows = [row for row in index["assets"] if row["kit"] == "alpine-expedition"]
    old_ids = {(row["kit"], row["id"]) for row in baseline["assets"]}
    new_ids = {(row["kit"], row["id"]) for row in index["assets"]}
    issues = []
    material_controls = preset_entries = 0
    min_triangles = None
    max_triangles = 0
    hash_matches = preview_matches = 0
    for row in rows:
        asset_id = row["id"]
        path = ROOT / row["source"]
        source = path.read_text()
        actual_hash = hashlib.sha256(path.read_bytes()).hexdigest()
        if row["sourceSha256"] == actual_hash:
            hash_matches += 1
        else:
            issues.append(asset_id + ": source SHA-256 differs from index")
        preview_path = KIT / "previews" / (asset_id + ".png")
        if row.get("preview") and preview_path.is_file():
            preview_matches += 1
        else:
            issues.append(asset_id + ": indexed preview path or PNG missing")
        colors = [param for param in row["params"] if param["type"] == "color"]
        material_controls += len(colors)
        if not 2 <= len(colors) <= 4:
            issues.append(asset_id + ": expected 2-4 material controls")
        applied = set(re.findall(r"\.color\(\s*([A-Za-z_]\w*)", source))
        for color in colors:
            if color["name"] not in applied:
                issues.append(asset_id + ": unused material control " + color["name"])
        if "scale" not in {param["name"] for param in row["params"]}:
            issues.append(asset_id + ": scale control missing")
        presets = row.get("presets", {})
        preset_entries += len(presets)
        if set(presets) != {"stormWorn", "highVisibility"}:
            issues.append(asset_id + ": expected stormWorn and highVisibility presets")
        triangles = row["stats"]["triangles"]
        min_triangles = triangles if min_triangles is None else min(min_triangles, triangles)
        max_triangles = max(max_triangles, triangles)
        if triangles > row["triangleBudget"]:
            issues.append(asset_id + ": triangle budget exceeded")

    if len(rows) != 50:
        issues.append("expected 50 alpine-expedition rows, found " + str(len(rows)))
    if len(index["assets"]) != 2390 or old_ids != new_ids:
        issues.append("catalog IDs or total count changed")
    result = {
        "status": "passed" if not issues else "failed",
        "kit": "alpine-expedition",
        "assets": len(rows),
        "catalogAssets": len(index["assets"]),
        "materialControls": material_controls,
        "presetEntries": preset_entries,
        "sourceHashesMatched": hash_matches,
        "previewPathsAndFilesMatched": preview_matches,
        "triangleRange": [min_triangles, max_triangles],
        "qualityGate": "50/50 assets pass",
        "issues": issues,
    }
    (BUNDLE / "index-integrity-status.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))
    if issues:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
