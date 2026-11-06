#!/usr/bin/env python3
"""Audit the locally generated railway pages against the refreshed index."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
OUT = Path(sys.argv[1]).resolve()
INDEX = json.loads((ROOT / "catalog/index.json").read_text())
ASSETS = [asset for asset in INDEX["assets"] if asset["kit"] == "railway"]
rows = []

for asset in ASSETS:
    page_dir = OUT / "catalog" / "railway" / asset["id"]
    page, preview = page_dir / "index.html", page_dir / "preview.png"
    if not page.is_file() or not preview.is_file():
        raise SystemExit(f"{asset['id']}: missing generated page or preview")
    if not asset.get("preview"):
        raise SystemExit(f"{asset['id']}: index has no preview path")
    source = (ROOT / asset["source"]).read_bytes()
    if hashlib.sha256(source).hexdigest() != asset["sourceSha256"]:
        raise SystemExit(f"{asset['id']}: source hash does not match generated index")
    html = page.read_text()
    required = [asset["title"], "Knobs", "scale", "weathered", "freshService", "Open in Studio"]
    required.extend(param["name"] for param in asset["params"] if param["name"] != "scale")
    missing = [value for value in required if value not in html]
    if missing:
        raise SystemExit(f"{asset['id']}: page omits {missing}")
    rows.append({
        "id": asset["id"],
        "path": str(page.relative_to(OUT)),
        "previewBytes": preview.stat().st_size,
        "previewPath": asset["preview"],
        "materialParams": [param["name"] for param in asset["params"] if param["name"] != "scale"],
        "presets": sorted(asset["presets"]),
        "sourceSha256Matches": True,
    })

hub_path = OUT / "catalog" / "index.html"
if not hub_path.is_file():
    raise SystemExit("generated catalog hub is missing")
hub = hub_path.read_text()
if "Railway" not in hub or str(len(ASSETS)) not in hub:
    raise SystemExit("catalog hub omits railway kit or count")

report = {
    "checkedAt": "2026-11-06",
    "kit": "railway",
    "kitPages": len(rows),
    "previewedRows": sum(bool(row["previewPath"]) for row in rows),
    "sourceHashesMatch": all(row["sourceSha256Matches"] for row in rows),
    "hubContainsKit": True,
    "pages": rows,
    "localPageGenerator": "scripts/buildCatalogPages.ts",
    "liveRouteStatus": "unverified; branch not deployed",
    "deploymentVerified": False,
}
(BUNDLE / "catalog-pages-check.json").write_text(json.dumps(report, indent=2) + "\n")
print(f"verified {len(rows)} local railway pages, previews, material knobs, presets, and source hashes; deployment unverified")
