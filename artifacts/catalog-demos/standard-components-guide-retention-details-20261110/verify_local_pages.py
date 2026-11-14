#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
"""Check the generated local hub and three affected catalog pages."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
ASSETS = {
    "bulkhead-adapter": ["stainless", "brass", "sealRubber"],
    "linear-guide-rail": ["steel", "aluminum", "polymer", "carriagePosition"],
    "shaft-coupling": ["steel", "bronze", "setScrewSteel", "retention"],
}


def main() -> None:
    hub = ROOT / "site-build/catalog/index.html"
    if not hub.is_file():
        raise SystemExit("missing generated catalog hub")
    hub_html = hub.read_text(encoding="utf-8")
    rows = {row["id"]: row for row in json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))["assets"]}
    pages = []
    for asset_id, required_params in ASSETS.items():
        row = rows[asset_id]
        directory = ROOT / "site-build/catalog/standard-components" / asset_id
        html_path = directory / "index.html"
        preview_path = directory / "preview.png"
        if not html_path.is_file() or not preview_path.is_file():
            raise SystemExit(f"missing local page or preview for {asset_id}")
        html = html_path.read_text(encoding="utf-8")
        required = [row["title"], "Open in Studio", *required_params, *row.get("presets", {}).keys()]
        missing = [text for text in required if text not in html]
        if missing:
            raise SystemExit(f"{asset_id} page missing expected text: {missing}")
        if asset_id not in hub_html:
            raise SystemExit(f"catalog hub missing {asset_id}")
        pages.append({
            "asset": asset_id,
            "page": str(html_path.relative_to(ROOT)),
            "preview": str(preview_path.relative_to(ROOT)),
            "previewBytes": preview_path.stat().st_size,
            "triangleCount": row["stats"]["triangles"],
            "params": required_params,
            "presets": sorted(row.get("presets", {}).keys()),
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
