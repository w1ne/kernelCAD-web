#!/usr/bin/env python3
"""Read the current public homepage/catalog without claiming branch deployment."""

import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


BUNDLE = Path(__file__).resolve().parent
BASE = "https://kernelcad.com"
headers = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/156.0.0.0 Safari/537.36",
    "Accept": "text/html,application/json",
}
with urllib.request.urlopen(urllib.request.Request(BASE, headers=headers), timeout=30) as response:
    html = response.read().decode("utf-8", errors="replace")
    homepage_status = response.status
with urllib.request.urlopen(urllib.request.Request(f"{BASE}/assets.json", headers=headers), timeout=30) as response:
    payload = json.loads(response.read())
    assets_status = response.status
assets = payload.get("assets", []) if isinstance(payload, dict) else []
sample_sources = {}
for asset_id in ("optical-sorter-arch", "anaerobic-digester-tank", "open-top-roll-off-skip"):
    row = next((asset for asset in assets if asset.get("kit") == "recycling-facility" and asset.get("id") == asset_id), None)
    if row is None:
        sample_sources[asset_id] = {"found": False}
        continue
    request = urllib.request.Request(f"{BASE}{row['sourceUrl']}", headers=headers)
    with urllib.request.urlopen(request, timeout=30) as response:
        source = response.read().decode("utf-8", errors="replace")
        source_status = response.status
    sample_sources[asset_id] = {
        "found": True,
        "sourceStatus": source_status,
        "genericColorKnob": "param('color'" in source,
        "hasPresets": "presets({" in source,
    }
result = {
    "checkedAt": datetime.now(timezone.utc).isoformat(),
    "homepageStatus": homepage_status,
    "assetsStatus": assets_status,
    "assetsGeneratedAt": payload.get("generatedAt") if isinstance(payload, dict) else None,
    "assetsTotal": len(assets),
    "assetsWithPreview": sum(1 for asset in assets if asset.get("preview")),
    "recyclingFacilityRows": sum(1 for asset in assets if asset.get("kit") == "recycling-facility"),
    "homepageHasOriginalKitRail": "Original low-poly kits" in html,
    "publishedSampleSources": sample_sources,
    "publishedSamplesStillSingleColor": all(
        source.get("genericColorKnob") and not source.get("hasPresets")
        for source in sample_sources.values()
    ),
    "branchDeployed": False,
    "passed": homepage_status == 200 and assets_status == 200 and bool(assets),
}
(BUNDLE / "live-website-check.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if not result["passed"]:
    raise SystemExit(1)
