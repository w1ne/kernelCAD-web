#!/usr/bin/env python3
"""Record the current public baseline without implying this branch is deployed."""

import json
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from pathlib import Path


BUNDLE = Path(__file__).resolve().parent
URLS = {
    "homepage": "https://kernelcad.com/",
    "assets": "https://kernelcad.com/assets.json",
    "catalog": "https://kernelcad.com/catalog/",
}


def fetch(url):
    request = Request(url, headers={"User-Agent": "kernelCAD catalog review/1.0"})
    try:
        with urlopen(request, timeout=20) as response:
            body = response.read()
            result = {"status": response.status, "bytes": len(body)}
    except HTTPError as error:
        body = error.read()
        result = {"status": error.code, "bytes": len(body)}
    except (URLError, TimeoutError) as error:
        return {"error": str(error)}
    if url.endswith("assets.json") and result["status"] == 200:
        try:
            data = json.loads(body)
            assets = data.get("assets", []) if isinstance(data, dict) else []
            rows = [asset for asset in assets if asset.get("kit") == "space-exploration"]
            result["generatedAt"] = data.get("generatedAt") if isinstance(data, dict) else None
            result["spaceExplorationRows"] = len(rows)
            result["spaceExplorationRowsWithPreview"] = sum(bool(asset.get("preview")) for asset in rows)
            result["spaceExplorationRowsWithPresets"] = sum(bool(asset.get("presets")) for asset in rows)
        except (UnicodeDecodeError, json.JSONDecodeError):
            result["jsonError"] = True
    return result


result = {
    "checkedAt": datetime.now(timezone.utc).isoformat(),
    "scope": "public baseline only; this branch has not been deployed",
    "urls": {name: {"url": url, **fetch(url)} for name, url in URLS.items()},
}
(BUNDLE / "live-website-check.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
