#!/usr/bin/env python3
"""Confirm public source/preview still match the retained pre-edit baseline."""

from __future__ import annotations

import hashlib
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path


BUNDLE = Path(__file__).resolve().parent
ASSETS = {
    "preview": (
        "https://kernelcad.com/assets/water-treatment-chlorine-dosing-skid.png",
        BUNDLE / "previews/before/chlorine-dosing-skid.png",
    ),
    "source": (
        "https://kernelcad.com/assets/water-treatment-chlorine-dosing-skid.kcad.ts",
        BUNDLE / "source/before/chlorine-dosing-skid.kcad.ts",
    ),
}


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


results = {}
for name, (url, baseline_path) in ASSETS.items():
    remote = subprocess.run(
        ["curl", "--max-time", "15", "-fsSL", url],
        check=True,
        capture_output=True,
    ).stdout
    metadata = subprocess.run(
        ["curl", "--max-time", "15", "-sS", "-o", "/dev/null", "-w", "%{http_code}\t%{content_type}", url],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.split("\t", maxsplit=1)
    baseline = digest(baseline_path.read_bytes())
    public = digest(remote)
    results[name] = {
        "url": url,
        "httpStatus": int(metadata[0]),
        "contentType": metadata[1],
        "baselineSha256": baseline,
        "publicSha256": public,
        "matchesBaseline": public == baseline,
    }

output = {
    "checkedAt": datetime.now(timezone.utc).isoformat(),
    "assets": results,
    "note": "Public files remain the pre-edit baseline; the branch change is not deployed.",
}
(BUNDLE / "verification" / "public-baseline-check.json").write_text(
    json.dumps(output, indent=2) + "\n", encoding="utf-8"
)
print(json.dumps(output, indent=2))
