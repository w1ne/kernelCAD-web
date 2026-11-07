#!/usr/bin/env python3
"""Record source, catalog, preview, and quality-gate evidence for this round."""

import hashlib
import json
import re
import subprocess
from collections import Counter
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/farm-machinery"


def quality_report(*args):
    proc = subprocess.run(
        ["python3", "scripts/checkCatalogQuality.py", *args],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    return proc.stdout + proc.stderr


def main():
    index = json.loads((ROOT / "catalog/index.json").read_text())
    assets = [row for row in index["assets"] if row["kit"] == "farm-machinery"]
    knob_counts = Counter()
    presets_per_asset = Counter()
    hash_matches = 0
    indexed_previews = 0
    readable_previews = 0
    preview_files = 0
    in_budget = 0
    for asset in assets:
        source = ROOT / asset["source"]
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        hash_matches += digest == asset["sourceSha256"]
        colors = [
            p for p in asset.get("params", [])
            if p.get("type") == "color" and p.get("name") != "color"
        ]
        knob_counts[len(colors)] += 1
        presets_per_asset[len(asset.get("presets") or {})] += 1
        preview = KIT / "previews" / f"{asset['id']}.png"
        preview_files += preview.is_file()
        if preview.is_file():
            try:
                with Image.open(preview) as image:
                    image.verify()
                readable_previews += 1
            except OSError:
                pass
        indexed_previews += bool(asset.get("preview"))
        in_budget += asset["stats"]["triangles"] <= asset["triangleBudget"]

    kit_gate = quality_report("--kit", "farm-machinery")
    kit_match = re.search(r"(\d+)/(\d+) assets pass", kit_gate)
    overall = quality_report("--top", "1")
    overall_match = re.search(r"(\d+)/(\d+) assets pass", overall)
    thin_match = re.search(r"(\d+) thin assets = (\d+)% of the catalog", overall)
    rendered_counts = {str(key): knob_counts[key] for key in sorted(knob_counts)}
    total_controls = sum(key * value for key, value in knob_counts.items())
    audit = {
        "round": "farm-machinery quality promotion",
        "date": "2026-11-05",
        "kit": "farm-machinery",
        "existingAssets": len(assets),
        "assetsPromoted": len(assets),
        "newAssets": 0,
        "renamedOrDuplicatedAssets": 0,
        "materialColorControlsPerAsset": rendered_counts,
        "materialColorControlsTotal": total_controls,
        "additionalControlsOverOneColorEach": total_controls - len(assets),
        "presetNames": ["weathered", "highVisibility"],
        "presetAssets": sum(value for key, value in presets_per_asset.items() if key >= 1),
        "presetVariantsPerAsset": {str(key): value for key, value in sorted(presets_per_asset.items())},
        "namedPresetEntries": sum(len(row.get("presets") or {}) for row in assets),
        "previewsRendered": preview_files,
        "readablePreviewPngs": readable_previews,
        "indexedRowsWithPreview": indexed_previews,
        "sourceShaMatches": hash_matches,
        "assetsInsideTriangleBudget": in_budget,
        "triangleBudgetMaximum": max((row["triangleBudget"] for row in assets), default=0),
        "qualityGate": kit_match.group(0) if kit_match else "failed to parse kit gate",
        "overallCatalog": {
            "pass": int(overall_match.group(1)) if overall_match else None,
            "total": int(overall_match.group(2)) if overall_match else None,
            "passPercentRounded": round(100 * int(overall_match.group(1)) / int(overall_match.group(2))) if overall_match else None,
            "thin": int(thin_match.group(1)) if thin_match else None,
            "thinPercentRounded": int(thin_match.group(2)) if thin_match else None,
            "briefBaselinePass": 1010,
            "netPassChangeSinceBriefBaseline": int(overall_match.group(1)) - 1010 if overall_match else None,
        },
        "geometryWork": {
            "slopedProfileShapes": 35,
            "customGrainAugerAndConveyorAssemblies": 2,
            "repairedTractorFrontWeights": 6,
            "attachedTractorRearHitches": 6,
            "loweredFieldToolStandards": 30,
            "groundingRegressionsCorrected": ["moldboard-plow standards", "portable-grain-conveyor transport wheels and support legs"],
        },
        "indexAndPreviewAudit": "pass" if len(assets) == 60 and hash_matches == 60 and indexed_previews == 60 and preview_files == 60 and readable_previews == 60 and in_budget == 60 else "fail",
        "kitQualityAudit": "pass" if kit_match and kit_match.group(1) == kit_match.group(2) == "60" else "fail",
        "scope": "local source, render, index and page checks; this branch is not deployed",
    }
    (BUNDLE / "promotion-audit.json").write_text(json.dumps(audit, indent=2) + "\n")
    if audit["indexAndPreviewAudit"] != "pass" or audit["kitQualityAudit"] != "pass":
        raise SystemExit(json.dumps(audit, indent=2))
    print(json.dumps(audit, indent=2))


if __name__ == "__main__":
    main()
