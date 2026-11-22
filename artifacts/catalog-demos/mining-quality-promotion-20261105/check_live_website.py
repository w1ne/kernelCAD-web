#!/usr/bin/env python3
"""Record the current public baseline; this branch has not been deployed."""

from datetime import datetime, timezone
import json
import subprocess
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/136 Safari/537.36"


def fetch(url):
    result = subprocess.check_output([
        "curl", "-A", UA, "-L", "-sS", "--max-time", "30", "-w", "\n%{http_code}", url,
    ], text=True)
    body, status = result.rsplit("\n", 1)
    return int(status), body


home_status, home = fetch("https://kernelcad.com/")
assets_status, assets_body = fetch("https://kernelcad.com/assets.json")
catalog_status, _ = fetch("https://kernelcad.com/catalog/")
data = json.loads(assets_body)
rows = [row for row in data.get("assets", []) if row.get("kit") == "mining"]
result = {
    "checkedAt": datetime.now(timezone.utc).isoformat(),
    "homepage": {"url": "https://kernelcad.com/", "status": home_status, "hasKernelCADTitle": "kernelCAD" in home},
    "assetIndex": {
        "url": "https://kernelcad.com/assets.json",
        "status": assets_status,
        "generatedAt": data.get("generatedAt"),
        "miningRows": len(rows),
        "miningRowsWithPreview": sum(bool(row.get("preview")) for row in rows),
        "miningRowsWithPresets": sum(bool(row.get("presets")) for row in rows),
    },
    "catalogHub": {"url": "https://kernelcad.com/catalog/", "status": catalog_status},
    "branchStatus": "not deployed; public index is the pre-promotion baseline",
}
result["passed"] = (
    home_status == 200 and assets_status == 200 and len(rows) == 50
    and result["assetIndex"]["miningRowsWithPreview"] == 50
    and result["assetIndex"]["miningRowsWithPresets"] == 0
    and catalog_status == 404
)
(BUNDLE / "live-website-check.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if not result["passed"]:
    raise SystemExit(1)
