#!/usr/bin/env python3
"""Check the generated ship-lift cradle index row against source and preview."""

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
INDEX = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
BEFORE = json.loads((BUNDLE / "before/index-row.json").read_text(encoding="utf-8"))
BEFORE_SUMMARY = json.loads((BUNDLE / "before/catalog-summary.json").read_text(encoding="utf-8"))
ROW = next(asset for asset in INDEX["assets"] if asset["id"] == "ship-lift-cradle")
SOURCE = ROOT / ROW["source"]
PREVIEW = ROOT / "catalog/kits/shipyard/previews/ship-lift-cradle.png"
actual_hash = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
palette = {entry["name"]: entry["parts"] for entry in ROW["palette"]}

expected = {
    "yardPaint": {"side-rail-0", "side-rail-1"},
    "structuralSteel": {
        "cross-tie-0", "cross-tie-1", "cross-tie-2",
        "guide-roller-0", "guide-roller-1", "guide-roller-2", "guide-roller-3",
    },
    "elastomer": {"hull-pad-0", "hull-pad-1", "hull-pad-2", "hull-pad-3"},
}
actual = {name: set(parts) for name, parts in palette.items()}
(BUNDLE / "after/index-row.json").write_text(
    json.dumps(ROW, indent=2) + "\n", encoding="utf-8"
)

report = {
    "assetCountBefore": BEFORE_SUMMARY["assetCount"],
    "assetCountAfter": len(INDEX["assets"]),
    "assetCountUnchanged": BEFORE_SUMMARY["assetCount"] == len(INDEX["assets"]),
    "sourceHashMatches": ROW["sourceSha256"] == actual_hash,
    "sourceHashChangedFromBaseline": ROW["sourceSha256"] != BEFORE["sourceSha256"],
    "previewPath": ROW["preview"],
    "previewExists": PREVIEW.is_file(),
    "triangleCountUnchanged": ROW["stats"]["triangles"] == BEFORE["stats"]["triangles"] == 396,
    "dimensionsUnchanged": ROW["stats"]["sizeM"] == BEFORE["stats"]["sizeM"] == [3, 0.78, 1.83],
    "presetsUnchanged": ROW["presets"] == BEFORE["presets"],
    "parametersUnchanged": ROW["params"] == BEFORE["params"],
    "palettePartsCorrect": actual == expected,
    "paletteParts": {name: sorted(parts) for name, parts in actual.items()},
}
(BUNDLE / "verification/index-check.json").write_text(
    json.dumps(report, indent=2) + "\n", encoding="utf-8"
)
print(json.dumps(report, indent=2))
if not all(
    report[key]
    for key in (
        "sourceHashMatches", "sourceHashChangedFromBaseline", "previewExists",
        "assetCountUnchanged",
        "triangleCountUnchanged", "dimensionsUnchanged", "presetsUnchanged",
        "parametersUnchanged", "palettePartsCorrect",
    )
):
    raise SystemExit(1)
