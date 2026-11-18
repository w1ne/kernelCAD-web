#!/usr/bin/env python3
"""Check local static music asset pages generated from the rebuilt index."""

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
OUT = Path(sys.argv[1]).resolve()
index = json.loads((ROOT / "catalog/index.json").read_text())
assets = [asset for asset in index["assets"] if asset["kit"] == "music"]
rows = []
for asset in assets:
    page = OUT / "catalog/music" / asset["id"] / "index.html"
    preview = OUT / "catalog/music" / asset["id"] / "preview.png"
    source = ROOT / asset["source"]
    if not page.is_file() or not preview.is_file():
        raise SystemExit(f"{asset['id']}: missing generated page or copied preview")
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    if source_hash != asset["sourceSha256"]:
        raise SystemExit(f"{asset['id']}: stale sourceSha256 in rebuilt index")
    html = page.read_text()
    required = [asset["title"], "Knobs", "scale", "Open in Studio", "concert", "vintage"]
    required.extend(param["name"] for param in asset["params"] if param["name"] != "scale")
    missing = [text for text in required if text not in html]
    if missing:
        raise SystemExit(f"{asset['id']}: generated page is missing {missing}")
    rows.append({"id": asset["id"], "page": str(page.relative_to(OUT)), "previewBytes": preview.stat().st_size})

hub = (OUT / "catalog/index.html").read_text()
if "Music" not in hub or not all(asset["id"] in hub for asset in assets):
    raise SystemExit("catalog hub does not contain all music asset records")
result = {
    "checkedAt": datetime.now(timezone.utc).isoformat(),
    "kit": "music",
    "musicPages": len(rows),
    "hubContainsAllMusicAssets": True,
    "assets": rows,
    "pageGenerator": "scripts/buildCatalogPages.ts",
    "output": str(OUT),
    "liveRouteStatus": "branch not deployed; public page check is pending merge/deployment",
    "deploymentVerified": False,
}
(BUNDLE / "catalog-pages-check.json").write_text(json.dumps(result, indent=2) + "\n")
print(f"verified {len(rows)} local music pages and copied previews")
