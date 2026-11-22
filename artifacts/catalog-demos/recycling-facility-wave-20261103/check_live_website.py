#!/usr/bin/env python3
"""Capture a read-only production homepage and catalog JSON baseline."""

import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


BUNDLE = Path(__file__).resolve().parent
BASE = "https://kernelcad.com"
headers = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36", "Accept": "text/html,application/json"}
with urllib.request.urlopen(urllib.request.Request(BASE, headers=headers), timeout=30) as response:
    html = response.read().decode("utf-8", errors="replace")
    homepage_status = response.status
with urllib.request.urlopen(urllib.request.Request(f"{BASE}/assets.json", headers=headers), timeout=30) as response:
    payload = json.loads(response.read())
    assets_status = response.status
assets = payload.get("assets", []) if isinstance(payload, dict) else []
result = {
    "checkedAt": datetime.now(timezone.utc).isoformat(),
    "homepageStatus": homepage_status,
    "assetsStatus": assets_status,
    "assetsGeneratedAt": payload.get("generatedAt") if isinstance(payload, dict) else None,
    "assetsTotal": len(assets),
    "assetsWithPreview": sum(1 for asset in assets if asset.get("preview")),
    "newKitRows": sum(1 for asset in assets if asset.get("kit") == "recycling-facility"),
    "homepageHasAssetRail": 'id="assets"' in html,
    "homepageExcerpt": "Vibe manufacturing. From idea to part." if "Vibe manufacturing. From idea to part." in html else "",
    "branchDeployed": False,
    "passed": homepage_status == 200 and assets_status == 200 and bool(assets) and all(asset.get("preview") for asset in assets),
}
(BUNDLE / "live-website-check.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if not result["passed"]:
    raise SystemExit(1)
