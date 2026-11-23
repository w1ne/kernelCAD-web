#!/usr/bin/env python3
"""Check the currently deployed page while keeping deployment separate from this branch."""

import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
PAGE_URL = "https://kernelcad.com/catalog/industrial-plant/inline-flow-meter/"
PREVIEW_URL = PAGE_URL + "preview.png"


def fetch(url: str, path: Path) -> int:
    result = subprocess.run(
        ["curl", "-sS", "-L", "--max-time", "30", "-o", str(path), "-w", "%{http_code}", url],
        check=True,
        capture_output=True,
        text=True,
    )
    return int(result.stdout)


page_path = BUNDLE / "verification/public-detail.html"
preview_path = BUNDLE / "verification/public-preview.png"
page_status = fetch(PAGE_URL, page_path)
preview_status = fetch(PREVIEW_URL, preview_path)
public_bytes = preview_path.read_bytes()
baseline_bytes = (BUNDLE / "before/inline-flow-meter.png").read_bytes()
local_bytes = (ROOT / "catalog/kits/industrial-plant/previews/inline-flow-meter.png").read_bytes()
report = {
    "mode": "currently deployed public site check; local feature branch is not deployed",
    "pageUrl": PAGE_URL,
    "previewUrl": PREVIEW_URL,
    "pageHttp": page_status,
    "previewHttp": preview_status,
    "publicPreviewSha256": hashlib.sha256(public_bytes).hexdigest(),
    "checkedInBaselinePreviewSha256": hashlib.sha256(baseline_bytes).hexdigest(),
    "localPreviewSha256": hashlib.sha256(local_bytes).hexdigest(),
    "publicPreviewMatchesBaseline": public_bytes == baseline_bytes,
    "publicPreviewMatchesLocalChange": public_bytes == local_bytes,
}
(BUNDLE / "live-site-check.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
if page_status != 200 or preview_status != 200:
    raise SystemExit("public detail page or preview is unavailable")
print(json.dumps(report, indent=2))
