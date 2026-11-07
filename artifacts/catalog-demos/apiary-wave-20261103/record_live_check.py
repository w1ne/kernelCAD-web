#!/usr/bin/env python3
"""Record the current production catalog feed and homepage response."""

import json
from datetime import datetime, timezone
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; kernelCAD-catalog-check/1.0)"}


def fetch(url):
    request = Request(url, headers=HEADERS)
    try:
        with urlopen(request, timeout=20) as response:
            body = response.read()
            return {"status": response.status, "bytes": len(body), "body": body}
    except HTTPError as error:
        body = error.read()
        return {"status": error.code, "bytes": len(body), "body": body}


home = fetch("https://kernelcad.com/")
feed = fetch("https://kernelcad.com/assets.json")
catalog_page = fetch("https://kernelcad.com/catalog/")
feed_json = json.loads(feed["body"]) if feed["status"] == 200 else {}
assets = feed_json.get("assets", [])
result = {
    "checkedAt": datetime.now(timezone.utc).isoformat(),
    "homepageStatus": home["status"],
    "assetFeedStatus": feed["status"],
    "catalogStatus": catalog_page["status"],
    "liveGeneratedAt": feed_json.get("generatedAt"),
    "liveAssetCount": len(assets),
    "livePreviewCount": sum(bool(asset.get("preview")) for asset in assets),
    "newKitPresent": any(asset.get("kit") == "apiary" for asset in assets),
    "scope": "current production response; this branch's apiary kit is not deployed",
}
(BUNDLE / "live-website-check.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
