#!/usr/bin/env python3
"""Check indexed preview paths against the generated source PNGs."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
index = json.loads((ROOT / "catalog" / "index.json").read_text())
rows = index["assets"]
missing = [asset["id"] for asset in rows if not asset.get("preview")]
unrendered = [
    f"{asset['kit']}/{asset['id']}"
    for asset in rows
    if not (ROOT / "catalog" / "kits" / asset["kit"] / "previews" / f"{asset['id']}.png").is_file()
]
kit_rows = [asset for asset in rows if asset["kit"] == "recycling-facility"]
result = {
    "assetsTotal": len(rows),
    "rowsWithPreview": len(rows) - len(missing),
    "previewFiles": len(rows) - len(unrendered),
    "recyclingFacilityRows": len(kit_rows),
    "recyclingFacilityRowsWithPreview": sum(1 for asset in kit_rows if asset.get("preview")),
    "missingPreviewFields": missing,
    "missingPreviewFiles": unrendered,
    "passed": not missing and not unrendered and len(kit_rows) == 153,
}
(BUNDLE / "preview-audit.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if not result["passed"]:
    raise SystemExit(1)
