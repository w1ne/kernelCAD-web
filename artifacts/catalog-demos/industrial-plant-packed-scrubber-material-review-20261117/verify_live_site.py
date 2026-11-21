#!/usr/bin/env python3
"""Check whether the current local branch is reflected on the public page."""

import hashlib
import json
from pathlib import Path
import subprocess

BUNDLE = Path(__file__).resolve().parent
BASELINE_PREVIEW = BUNDLE / "before/public-preview.png"
LOCAL_PREVIEW = Path(__file__).resolve().parents[3] / "catalog/kits/industrial-plant/previews/packed-scrubber-column.png"
PAGE_URL = "https://kernelcad.com/catalog/industrial-plant/packed-scrubber-column/"
PREVIEW_URL = PAGE_URL + "preview.png"

def fetch(url: str, path: Path) -> int:
    result = subprocess.run(
        ["curl", "-sS", "-L", "--max-time", "30", "-o", str(path), "-w", "%{http_code}", url],
        check=True,
        capture_output=True,
        text=True,
    )
    return int(result.stdout)


page_path = BUNDLE / "verification/public-after-detail.html"
preview_path = BUNDLE / "verification/public-after-preview.png"
page_status = fetch(PAGE_URL, page_path)
preview_status = fetch(PREVIEW_URL, preview_path)
preview = preview_path.read_bytes()

baseline_hash = hashlib.sha256(BASELINE_PREVIEW.read_bytes()).hexdigest()
local_hash = hashlib.sha256(LOCAL_PREVIEW.read_bytes()).hexdigest()
public_hash = hashlib.sha256(preview).hexdigest()
report = {
    "mode": "public site check only; local branch is not deployed",
    "pageUrl": PAGE_URL,
    "previewUrl": PREVIEW_URL,
    "pageHttp": page_status,
    "previewHttp": preview_status,
    "publicPreviewSha256": public_hash,
    "baselinePreviewSha256": baseline_hash,
    "localPreviewSha256": local_hash,
    "publicPreviewMatchesBaseline": public_hash == baseline_hash,
    "publicPreviewMatchesLocalChange": public_hash == local_hash,
}
(BUNDLE / "live-site-check.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
if page_status != 200 or preview_status != 200:
    raise SystemExit("public detail page or preview is unavailable")
print(json.dumps(report, indent=2))
