#!/usr/bin/env python3
"""Check generated catalog rows, preview availability, and source freshness."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
BUNDLE = Path(__file__).resolve().parents[1]
BEFORE = json.loads((BUNDLE / "before" / "index-rows.json").read_text())
INDEX = json.loads((ROOT / "catalog" / "index.json").read_text())
EXPECTED = {
    ("recycling-facility", "eddy-current-separator"),
    ("grid-substation", "substation-main-power-transformer"),
    ("water-treatment", "vertical-turbine-pump"),
    ("wind-energy", "offshore-wind-turbine"),
    ("industrial-plant", "centrifugal-pump"),
}


def row_for(rows, key):
    return next(row for row in rows if (row["kit"], row["id"]) == key)


after_rows = {key: row_for(INDEX["assets"], key) for key in EXPECTED}
target = after_rows[("water-treatment", "vertical-turbine-pump")]
source = (ROOT / target["source"]).read_bytes()
source_sha = hashlib.sha256(source).hexdigest()
preview_path = ROOT / "catalog" / "kits" / target["kit"] / "previews" / f"{target['id']}.png"
before_target = BEFORE["target"]

changed_fields = sorted(
    field for field in set(before_target) | set(target)
    if before_target.get(field) != target.get(field)
)
unchanged_samples = [
    f"{kit}/{asset_id}"
    for kit, asset_id in sorted(EXPECTED)
    if (kit, asset_id) != ("water-treatment", "vertical-turbine-pump")
    and BEFORE["unchangedReviewedRows"].get(f"{kit}/{asset_id}")
    == hashlib.sha256(
        json.dumps(after_rows[(kit, asset_id)], sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
]

report = {
    "assetCount": len(INDEX["assets"]),
    "kitCount": len(INDEX["kits"]),
    "target": {
        "sourceSha256": target["sourceSha256"],
        "sourceSha256MatchesFile": target["sourceSha256"] == source_sha,
        "preview": target["preview"],
        "previewExists": preview_path.is_file(),
        "triangleCount": target["stats"]["triangles"],
        "triangleBudget": target["triangleBudget"],
        "changedFieldsFromBaseline": changed_fields,
    },
    "otherReviewedRowsUnchanged": unchanged_samples,
}

if len(INDEX["assets"]) != 2402 or len(INDEX["kits"]) != 50:
    raise SystemExit("catalog asset/kit counts changed unexpectedly")
if target["sourceSha256"] != source_sha or not preview_path.is_file():
    raise SystemExit("target index source hash or preview path is stale")
if target["stats"]["triangles"] != 2276:
    raise SystemExit("target triangle count changed unexpectedly")
if len(unchanged_samples) != 4:
    raise SystemExit("a sampled row besides the target changed")

(BUNDLE / "after" / "index-summary.json").write_text(
    json.dumps(report, indent=2) + "\n", encoding="utf-8"
)
print(json.dumps(report, indent=2))
