#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
"""Check the generated local catalog hub and table-lamp page."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = "interior"
ASSET = "table-lamp"


def main() -> None:
    hub = ROOT / "site-build/catalog/index.html"
    page = ROOT / "site-build/catalog" / KIT / ASSET / "index.html"
    page_preview = ROOT / "site-build/catalog" / KIT / ASSET / "preview.png"
    if not hub.is_file() or not page.is_file() or not page_preview.is_file():
        raise SystemExit("missing generated catalog hub, table-lamp page, or page preview")
    hub_html = hub.read_text(encoding="utf-8")
    content = page.read_text(encoding="utf-8")
    if ASSET not in hub_html or KIT not in hub_html:
        raise SystemExit("local catalog hub is missing the interior/table-lamp link")
    if "Table lamp" not in content or "Open in Studio" not in content:
        raise SystemExit("asset page is missing its title or Studio link")
    index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
    row = next(asset for asset in index["assets"] if asset["kit"] == KIT and asset["id"] == ASSET)
    missing_params = [entry["name"] for entry in row["params"] if entry["name"] not in content]
    if missing_params:
        raise SystemExit(f"local page is missing parameter controls: {missing_params}")
    missing_presets = [name for name in row["presets"] if name not in content]
    if missing_presets:
        raise SystemExit(f"local page is missing named presets: {missing_presets}")
    source_hash = hashlib.sha256((ROOT / row["source"]).read_bytes()).hexdigest()
    if source_hash != row["sourceSha256"]:
        raise SystemExit("catalog index source hash does not match the edited source")
    result = {
        "checkedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "scope": "Generated local static catalog page; public deployment not checked.",
        "hub": str(hub.relative_to(ROOT)),
        "hubContainsAsset": True,
        "asset": f"{KIT}/{ASSET}",
        "page": str(page.relative_to(ROOT)),
        "pagePreview": str(page_preview.relative_to(ROOT)),
        "pagePreviewBytes": page_preview.stat().st_size,
        "sourceSha256MatchesIndex": True,
        "triangleCount": row["stats"]["triangles"],
        "triangleBudget": row["triangleBudget"],
        "params": [entry["name"] for entry in row["params"]],
        "presets": sorted(row["presets"]),
        "hasStudioLink": True,
    }
    (BUNDLE / "local-page-check.json").write_text(f"{json.dumps(result, indent=2)}\n", encoding="utf-8")
    print("checked local catalog hub and interior/table-lamp page; hash, controls, preview, and Studio link match")


if __name__ == "__main__":
    main()
