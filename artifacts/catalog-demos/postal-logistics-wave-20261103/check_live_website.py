#!/usr/bin/env python3
"""Record current production catalog visibility without browser automation."""

import json
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from pathlib import Path


BUNDLE = Path(__file__).resolve().parent


def get(url):
    request = Request(url, headers={"User-Agent": "kernelCAD catalog verification/1.0"})
    try:
        with urlopen(request, timeout=30) as response:
            body = response.read()
            return response.status, body
    except HTTPError as error:
        return error.code, error.read()
    except URLError as error:
        return None, str(error).encode()


home_status, home_body = get("https://kernelcad.com/")
assets_status, assets_body = get("https://kernelcad.com/assets.json")
catalog_status, _ = get("https://kernelcad.com/catalog/")
rows = []
if assets_status == 200:
    payload = json.loads(assets_body)
    rows = payload.get("assets", []) if isinstance(payload, dict) else payload

result = {
    "checkedAt": datetime.now(timezone.utc).isoformat(),
    "homepageStatus": home_status,
    "homepageBytes": len(home_body),
    "assetsStatus": assets_status,
    "assetsTotal": len(rows),
    "assetsWithPreview": sum(bool(row.get("preview")) for row in rows),
    "postalLogisticsRows": sum(row.get("kit") == "postal-logistics" for row in rows),
    "catalogStatus": catalog_status,
    "scope": "live production baseline only; current feature branch is not deployed",
}
(BUNDLE / "live-website-check.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if home_status != 200 or assets_status != 200:
    raise SystemExit(1)
