#!/usr/bin/env python3
"""Record current read-only public-site endpoint checks; this branch is undeployed."""
import json
import re
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent


def get(url: str) -> tuple[int, str]:
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "kernelCAD catalog quality check"}), timeout=20) as response:
            return response.status, response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode("utf-8", errors="replace")


home_status, home = get("https://kernelcad.com/")
gallery_status, gallery_text = get("https://kernelcad.com/gallery.json")
catalog_status, _ = get("https://kernelcad.com/catalog/")
gallery = json.loads(gallery_text) if gallery_status == 200 else {}
headlines = re.findall(r"<h1[^>]*>(.*?)</h1>", home, re.S)
result = {
    "checkedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    "homepageStatus": home_status,
    "homepageHeadline": re.sub(r"<[^>]+>", "", headlines[0]).strip() if headlines else None,
    "galleryStatus": gallery_status,
    "galleryGeneratedAt": gallery.get("generatedAt"),
    "galleryEntryCount": len(gallery.get("entries", [])),
    "catalogStatus": catalog_status,
    "branchDeployed": False,
    "claims": "Read-only public-site check only; it does not verify this feature branch or its asset previews.",
}
(BUNDLE / "public-check.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if home_status != 200 or gallery_status != 200:
    raise SystemExit("homepage or gallery endpoint check failed")
