#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Capture the current public detail and preview routes before the branch fix.

from hashlib import sha256
import json
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

HERE = Path(__file__).resolve().parent
BASE = "https://kernelcad.com"
ASSETS = {
    "dual-port-ac-pedestal": "ev-charging-infrastructure",
    "ev-metering-pedestal": "ev-charging-infrastructure",
    "home-ac-wallbox": "ev-charging-infrastructure",
    "mobile-fast-charge-cart": "ev-charging-infrastructure",
    "coiled-charging-cable-reel": "ev-charging-infrastructure",
}

records = []
for asset_id, kit in ASSETS.items():
    page_url = f"{BASE}/catalog/{kit}/{asset_id}/"
    preview_url = f"{BASE}/assets/{kit}-{asset_id}.png"
    record = {"id": asset_id, "kit": kit, "page": page_url, "preview": preview_url}
    for kind, url in (("page", page_url), ("preview", preview_url)):
        try:
            request = Request(url, headers={"User-Agent": "Mozilla/5.0 kernelCAD-catalog-review/1.0"})
            with urlopen(request, timeout=30) as response:
                payload = response.read()
                record[f"{kind}Status"] = response.status
            if kind == "preview":
                target = HERE / "live-baseline" / "previews" / f"{asset_id}.png"
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(payload)
                record["previewSha256"] = sha256(payload).hexdigest()
                record["previewBytes"] = len(payload)
        except HTTPError as error:
            record[f"{kind}Status"] = error.code
    records.append(record)

(HERE / "live-baseline").mkdir(parents=True, exist_ok=True)
(HERE / "live-baseline" / "routes.json").write_text(
    json.dumps(records, indent=2) + "\n", encoding="utf-8"
)
for record in records:
    print(
        f"{record['kit']}/{record['id']}: "
        f"page HTTP {record.get('pageStatus')}; preview HTTP {record.get('previewStatus')}; "
        f"sha256 {record.get('previewSha256', 'unavailable')}"
    )
