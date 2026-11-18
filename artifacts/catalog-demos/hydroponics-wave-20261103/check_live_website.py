#!/usr/bin/env python3
"""Record current public homepage and asset-rail baseline without changing it."""

import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen


BUNDLE = Path(__file__).resolve().parent


def fetch(url):
    request = Request(url, headers={"User-Agent": "kernelCAD catalog verification"})
    with urlopen(request, timeout=30) as response:
        return response.status, response.read()


result = {
    "checkedAt": datetime.now(timezone.utc).isoformat(),
    "homeUrl": "https://kernelcad.com/",
    "assetsUrl": "https://kernelcad.com/assets.json",
    "deployment": "This feature branch is not deployed; live state is a production baseline only.",
}
try:
    home_status, home = fetch(result["homeUrl"])
    assets_status, body = fetch(result["assetsUrl"])
    data = json.loads(body)
    rows = data.get("assets", [])
    result.update({
        "homeStatus": home_status,
        "homeContainsAssetsRail": b"/assets.json" in home,
        "assetsStatus": assets_status,
        "assetsTotal": len(rows),
        "previewedAssets": sum(bool(row.get("preview")) for row in rows),
        "hydroponicsRows": sum(1 for row in rows if row.get("kit") == "hydroponics"),
    })
except (URLError, TimeoutError, json.JSONDecodeError) as error:
    result["error"] = str(error)

result["passed"] = result.get("homeStatus") == 200 and result.get("assetsStatus") == 200 and result.get("assetsTotal") == result.get("previewedAssets")
(BUNDLE / "live-website-check.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if not result["passed"]:
    raise SystemExit(1)
