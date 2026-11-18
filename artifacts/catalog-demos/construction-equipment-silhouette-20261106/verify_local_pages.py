#!/usr/bin/env python3
"""Check generated local catalog pages and copied previews for refined assets."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
if len(sys.argv) != 2:
    raise SystemExit("usage: verify_local_pages.py <catalog-pages-out-dir>")

pages_root = Path(sys.argv[1])
index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
settings = json.loads((BUNDLE / "demo-settings.json").read_text(encoding="utf-8"))
targets = {target["id"]: target for target in settings["sources"]}
rows = {(row["kit"], row["id"]): row for row in index["assets"]}
verified = []
for asset_id, target in targets.items():
    row = rows[("construction-equipment", asset_id)]
    page = pages_root / "catalog" / "construction-equipment" / asset_id / "index.html"
    preview = pages_root / "catalog" / "construction-equipment" / asset_id / "preview.png"
    if not page.is_file() or not preview.is_file():
        raise SystemExit(f"missing local page or preview for {asset_id}")
    html = page.read_text(encoding="utf-8")
    source_preview = ROOT / "catalog" / "kits" / "construction-equipment" / "previews" / f"{asset_id}.png"
    if preview.read_bytes() != source_preview.read_bytes():
        raise SystemExit(f"local page preview differs from current catalog preview for {asset_id}")
    for control in target["materialControls"]:
        if control not in html:
            raise SystemExit(f"local page is missing material control {asset_id}/{control}")
    for name, choices in target["shapeChoices"].items():
        if name not in html or any(choice not in html for choice in choices):
            raise SystemExit(f"local page is missing shape choices for {asset_id}/{name}")
    for preset in target["presets"]:
        if preset not in html:
            raise SystemExit(f"local page is missing palette preset {asset_id}/{preset}")
    verified.append({
        "id": asset_id,
        "page": str(page),
        "previewSha256": hashlib.sha256(preview.read_bytes()).hexdigest(),
        "materials": target["materialControls"],
        "shapeChoices": target["shapeChoices"],
        "presets": target["presets"],
    })

result = {"status": "passed", "pagesChecked": len(verified), "rows": verified}
(BUNDLE / "local-page-check.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"status": "passed", "pagesChecked": len(verified), "assets": [row["id"] for row in verified]}, indent=2))
