#!/usr/bin/env python3
"""Record the current production catalog baseline without claiming deployment."""

import json
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
BASE = "https://kernelcad.com"


def fetch(path: str):
    try:
        with urlopen(Request(BASE + path, headers={"User-Agent": "kernelCAD-catalog-quality-check/1.0"}), timeout=15) as response:
            body = response.read()
            return {"status": response.status, "contentType": response.headers.get("content-type"), "body": body}
    except HTTPError as error:
        return {"status": error.code, "contentType": error.headers.get("content-type"), "body": error.read()}
    except URLError as error:
        return {"status": None, "error": str(error), "body": b""}


home = fetch("/")
asset_index = fetch("/assets.json")
hub = fetch("/catalog/")
page = fetch("/catalog/postal-logistics/automated-label-applicator/")
source = fetch("/assets/postal-logistics-automated-label-applicator.kcad.ts")
index_data = json.loads(asset_index["body"]) if asset_index["status"] == 200 else {}
postal = [asset for asset in index_data.get("assets", []) if asset.get("kit") == "postal-logistics"]
source_text = source["body"].decode("utf-8", errors="replace")
report = {
    "checkedAt": datetime.now(timezone.utc).isoformat(),
    "productionOrigin": BASE,
    "branch": "feat/catalog-2000",
    "branchDeploymentClaimed": False,
    "homepage": {key: value for key, value in home.items() if key != "body"},
    "assetIndex": {
        "status": asset_index["status"],
        "contentType": asset_index.get("contentType"),
        "generatedAt": index_data.get("generatedAt"),
        "assetCount": len(index_data.get("assets", [])),
        "postalLogisticsRows": len(postal),
        "postalLogisticsRowsWithPreview": sum(bool(asset.get("preview")) for asset in postal),
    },
    "catalogHub": {key: value for key, value in hub.items() if key != "body"},
    "postalAssetPage": {key: value for key, value in page.items() if key != "body"},
    "postalSource": {
        "status": source["status"],
        "contentType": source.get("contentType"),
        "genericColorControlVisible": "param('color'" in source_text or 'param("color"' in source_text,
        "weatheredPresetVisible": "weathered" in source_text,
    },
    "interpretation": "This records the live production baseline only. The feature branch source/index/previews are local and require integration and deployment before production behavior can be verified.",
}
(BUNDLE / "live-website-check.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
