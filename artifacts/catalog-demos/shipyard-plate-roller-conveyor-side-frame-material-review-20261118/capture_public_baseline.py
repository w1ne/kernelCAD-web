#!/usr/bin/env python3
"""Capture public pages/previews and compare their PNGs with retained baseline."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent
ASSETS = [
    "coating-mix-cabinet",
    "optical-measurement-station",
    "pipe-spool-saddle-stand",
    "plate-roller-conveyor",
    "temporary-work-light-mast",
]


def fetch(url: str) -> tuple[int, str, str, bytes]:
    request = Request(url, headers={"User-Agent": "kernelCAD semantic audit/2026-11-18"})
    with urlopen(request, timeout=30) as response:
        data = response.read()
        return response.status, response.geturl(), response.headers.get("Content-Type", ""), data


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def baseline_preview(asset: str) -> Path:
    if asset == "plate-roller-conveyor":
        return ROOT / "before/plate-roller-conveyor.png"
    return ROOT / "samples/previews" / f"{asset}.png"


def main() -> None:
    records = []
    output = ROOT / "live-baseline"
    output.mkdir(exist_ok=True)
    for asset in ASSETS:
        page_url = f"https://kernelcad.com/catalog/shipyard/{asset}/"
        preview_url = f"https://kernelcad.com/assets/shipyard-{asset}.png"
        page_status, page_final, page_type, page_data = fetch(page_url)
        preview_status, preview_final, preview_type, preview_data = fetch(preview_url)
        (output / f"{asset}.html").write_bytes(page_data)
        (output / f"{asset}.png").write_bytes(preview_data)
        local_data = baseline_preview(asset).read_bytes()
        records.append(
            {
                "id": asset,
                "pageUrl": page_url,
                "pageStatus": page_status,
                "pageFinalUrl": page_final,
                "pageContentType": page_type,
                "pageSha256": sha256(page_data),
                "previewUrl": preview_url,
                "previewStatus": preview_status,
                "previewFinalUrl": preview_final,
                "previewContentType": preview_type,
                "previewSha256": sha256(preview_data),
                "localBaseline": str(baseline_preview(asset).relative_to(ROOT)),
                "localBaselineSha256": sha256(local_data),
                "previewMatchesLocalBaseline": sha256(preview_data) == sha256(local_data),
            }
        )
    report = {
        "checkedAt": datetime.now(timezone.utc).isoformat(),
        "phase": "after local edit, before push; public site remains on the deployed baseline",
        "records": records,
    }
    (output / "public-check.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    if any(record["pageStatus"] != 200 or record["previewStatus"] != 200 or not record["previewMatchesLocalBaseline"] for record in records):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
