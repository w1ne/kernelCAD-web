#!/usr/bin/env python3
"""Verify the generated local catalog page includes the updated control and preview."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path


BUNDLE = Path(__file__).resolve().parent
REPO = BUNDLE.parents[2]
SITE = Path("/tmp/kernelcad-chlorine-dosing-page-20261111")
PAGE = SITE / "catalog/water-treatment/chlorine-dosing-skid/index.html"
COPIED_PREVIEW = SITE / "catalog/water-treatment/chlorine-dosing-skid/preview.png"
SOURCE = REPO / "catalog/kits/water-treatment/chlorine-dosing-skid.kcad.ts"
PREVIEW = REPO / "catalog/kits/water-treatment/previews/chlorine-dosing-skid.png"
INDEX = json.loads((REPO / "catalog/index.json").read_text(encoding="utf-8"))
ROW = next(row for row in INDEX["assets"] if row["id"] == "chlorine-dosing-skid")
HTML = PAGE.read_text(encoding="utf-8")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


report = {
    "checkedAt": datetime.now(timezone.utc).isoformat(),
    "page": str(PAGE),
    "pageContainsAssetId": "chlorine-dosing-skid" in HTML,
    "pageContainsPolyethyleneControl": "chemicalTankPolyethylene" in HTML,
    "pageContainsPolyethyleneColor": "#c7dce0" in HTML,
    "pageContainsExistingPresets": all(name in HTML for name in ("weathered", "highVisibility")),
    "indexSourceSha256": ROW["sourceSha256"],
    "localSourceSha256": sha256(SOURCE),
    "sourceShaMatches": ROW["sourceSha256"] == sha256(SOURCE),
    "pagePreviewSha256": sha256(COPIED_PREVIEW),
    "checkedInPreviewSha256": sha256(PREVIEW),
    "previewMatches": sha256(COPIED_PREVIEW) == sha256(PREVIEW),
}
if not all(
    report[key]
    for key in (
        "pageContainsAssetId",
        "pageContainsPolyethyleneControl",
        "pageContainsPolyethyleneColor",
        "pageContainsExistingPresets",
        "sourceShaMatches",
        "previewMatches",
    )
):
    raise SystemExit(json.dumps(report, indent=2))

(BUNDLE / "verification" / "local-page-verification.json").write_text(
    json.dumps(report, indent=2) + "\n", encoding="utf-8"
)
print(json.dumps(report, indent=2))
