#!/usr/bin/env python3
"""Verify that every indexed catalog asset has an indexed, readable preview."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
index = json.loads((ROOT / "catalog" / "index.json").read_text())
missing = []
kit_rows = [row for row in index["assets"] if row["kit"] == "theatre-production"]
for row in index["assets"]:
    if not row.get("preview"):
        missing.append(f"{row['kit']}/{row['id']}: no preview field")
    path = ROOT / "catalog" / "kits" / row["kit"] / "previews" / f"{row['id']}.png"
    if not path.is_file() or path.stat().st_size == 0:
        missing.append(f"{row['kit']}/{row['id']}: missing or empty {path}")

result = {
    "command": "npx tsx scripts/renderCatalogPreviews.ts",
    "assetsInIndex": len(index["assets"]),
    "rowsWithPreview": sum(bool(row.get("preview")) for row in index["assets"]),
    "previewPngs": len(index["assets"]) - sum(1 for item in missing if "missing or empty" in item),
    "kitAssets": len(kit_rows),
    "kitPreviewFields": sum(bool(row.get("preview")) for row in kit_rows),
    "missing": missing,
    "passed": not missing,
}
out = Path(__file__).resolve().parent / "preview-audit.json"
out.write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if missing or len(kit_rows) != 52:
    raise SystemExit(1)
