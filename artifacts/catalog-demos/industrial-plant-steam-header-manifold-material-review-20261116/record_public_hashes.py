#!/usr/bin/env python3
"""Compare selected live catalog bytes with the retained local audit baseline."""

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

BUNDLE = Path(__file__).resolve().parent
ASSETS = [
    "distillation-column",
    "screw-conveyor",
    "vibratory-feeder",
    "diesel-generator-set",
    "steam-header-manifold",
]


def fetch(url):
    request = Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "Chrome/128.0.0.0 Safari/537.36",
        },
    )
    with urlopen(request, timeout=20) as response:
        return response.status, response.read()


def digest(data):
    return hashlib.sha256(data).hexdigest()


records = {}
for asset in ASSETS:
    source_url = f"https://kernelcad.com/assets/industrial-plant-{asset}.kcad.ts"
    preview_url = f"https://kernelcad.com/assets/industrial-plant-{asset}.png"
    public_source_status, public_source = fetch(source_url)
    public_preview_status, public_preview = fetch(preview_url)
    local_source = (BUNDLE / "before" / f"{asset}.kcad.ts").read_bytes()
    local_preview = (BUNDLE / "before" / f"{asset}.png").read_bytes()
    records[asset] = {
        "sourceUrl": source_url,
        "previewUrl": preview_url,
        "publicSourceStatus": public_source_status,
        "publicPreviewStatus": public_preview_status,
        "sourceSha256": {"public": digest(public_source), "localBefore": digest(local_source)},
        "previewSha256": {"public": digest(public_preview), "localBefore": digest(local_preview)},
        "publicMatchesLocalBefore": public_source == local_source and public_preview == local_preview,
    }
    if public_source_status != 200 or public_preview_status != 200 or not records[asset]["publicMatchesLocalBefore"]:
        raise SystemExit(f"live source/preview does not match retained baseline: {asset}")

page_url = "https://kernelcad.com/catalog/industrial-plant/steam-header-manifold/"
preview_url = page_url + "preview.png"
page_status, page = fetch(page_url)
page_preview_status, page_preview = fetch(preview_url)
detail_preview_matches_before = page_preview == (BUNDLE / "before" / "steam-header-manifold.png").read_bytes()
if page_status != 200 or page_preview_status != 200 or not detail_preview_matches_before:
    raise SystemExit("live detail page or preview endpoint is not reachable")
report = {
    "checkedOn": datetime.now(timezone.utc).date().isoformat(),
    "preEditBaselineCapturedOn": "2026-11-16",
    "method": "HTTP GET of public catalog source and PNG; SHA-256 and exact bytes compared against retained local pre-edit files",
    "liveDetailPage": {"url": page_url, "status": page_status, "titlePresent": b"Steam header manifold" in page},
    "liveDetailPreview": {
        "url": preview_url,
        "status": page_preview_status,
        "sha256": digest(page_preview),
        "matchesLocalBefore": detail_preview_matches_before,
    },
    "allPublishedBeforeBytesMatch": True,
    "assets": records,
}
(BUNDLE / "preview-review" / "hashes.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(f"Verified published source and preview hashes for {len(records)} assets.")
