#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
"""Check the generated local catalog hub and the three affected asset pages."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
ASSETS = ["flange-bearing-housing", "jaw-coupling", "pipe-union"]
MATERIAL_PARAMS = {
    "flange-bearing-housing": ["castIron", "bearingSteel", "sealRubber"],
    "jaw-coupling": ["steel", "polymer", "setScrewSteel"],
    "pipe-union": ["steel", "brass", "sealRubber"],
}


def main() -> None:
    hub = ROOT / "site-build/catalog/index.html"
    if not hub.is_file():
        raise SystemExit("missing generated catalog hub")
    hub_html = hub.read_text(encoding="utf-8")
    if "standard-components" not in hub_html or any(asset not in hub_html for asset in ASSETS):
        raise SystemExit("local catalog hub is missing kit or asset links")
    rows = {row["id"]: row for row in json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))["assets"]}
    pages = []
    for asset_id in ASSETS:
        row = rows[asset_id]
        directory = ROOT / "site-build/catalog/standard-components" / asset_id
        html = directory / "index.html"
        preview = directory / "preview.png"
        if not html.is_file() or not preview.is_file():
            raise SystemExit(f"missing local page or preview for {asset_id}")
        content = html.read_text(encoding="utf-8")
        if row["title"] not in content or "Open in Studio" not in content:
            raise SystemExit(f"local page missing title or Studio link for {asset_id}")
        missing_materials = [name for name in MATERIAL_PARAMS[asset_id] if name not in content]
        if missing_materials:
            raise SystemExit(f"local page is missing material controls for {asset_id}: {missing_materials}")
        missing_presets = [name for name in row["presets"] if name not in content]
        if missing_presets:
            raise SystemExit(f"local page is missing presets for {asset_id}: {missing_presets}")
        pages.append({
            "asset": asset_id,
            "page": str(html.relative_to(ROOT)),
            "preview": str(preview.relative_to(ROOT)),
            "previewBytes": preview.stat().st_size,
            "triangleCount": row["stats"]["triangles"],
            "paramCount": len(row["params"]),
            "presets": sorted(row["presets"]),
            "hasStudioLink": True,
        })
    result = {
        "checkedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "scope": "Generated local static catalog pages; public deployment not checked.",
        "hub": str(hub.relative_to(ROOT)),
        "hubContainsAffectedAssets": True,
        "pages": pages,
    }
    (OUT / "local-page-check.json").write_text(f"{json.dumps(result, indent=2)}\n", encoding="utf-8")
    print(f"checked local catalog hub and {len(pages)}/{len(ASSETS)} affected pages")


if __name__ == "__main__":
    main()
