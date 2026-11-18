#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
"""Check the generated local catalog hub and flat joining plate page."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
ASSET = "flat-joining-plate"


def main() -> None:
    hub = ROOT / "site-build/catalog/index.html"
    page = ROOT / "site-build/catalog/standard-components" / ASSET / "index.html"
    page_preview = ROOT / "site-build/catalog/standard-components" / ASSET / "preview.png"
    if not hub.is_file() or not page.is_file() or not page_preview.is_file():
        raise SystemExit("missing generated catalog hub, flat-joining-plate page, or page preview")
    hub_html = hub.read_text(encoding="utf-8")
    content = page.read_text(encoding="utf-8")
    if "standard-components" not in hub_html or ASSET not in hub_html:
        raise SystemExit("local catalog hub is missing the kit or flat joining plate link")
    if "Flat joining plate" not in content or "Open in Studio" not in content:
        raise SystemExit("flat joining plate page is missing its title or Studio link")
    missing_params = [name for name in ["holeCount", "steel", "zinc"] if name not in content]
    if missing_params:
        raise SystemExit(f"local page is missing parameter controls: {missing_params}")
    rows = {row["id"]: row for row in json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))["assets"]}
    row = rows[ASSET]
    missing_presets = [name for name in row["presets"] if name not in content]
    if missing_presets:
        raise SystemExit(f"local page is missing named presets: {missing_presets}")
    source = ROOT / row["source"]
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    if source_hash != row["sourceSha256"]:
        raise SystemExit("catalog index source hash does not match the edited source")
    result = {
        "checkedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "scope": "Generated local static catalog page; public deployment not checked.",
        "hub": str(hub.relative_to(ROOT)),
        "hubContainsAsset": True,
        "asset": ASSET,
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
    (OUT / "local-page-check.json").write_text(f"{json.dumps(result, indent=2)}\n", encoding="utf-8")
    print(f"checked local catalog hub and {ASSET} page; source hash and parameter/preset links match")


if __name__ == "__main__":
    main()
