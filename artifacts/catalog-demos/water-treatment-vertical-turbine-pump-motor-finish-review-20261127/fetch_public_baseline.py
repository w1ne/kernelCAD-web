#!/usr/bin/env python3
"""Check live catalog pages, sources, and previews against five local samples."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


BUNDLE = Path(__file__).resolve().parent
ORIGIN = "https://kernelcad.com"
ASSETS = [
    ("recycling-facility", "eddy-current-separator"),
    ("grid-substation", "substation-main-power-transformer"),
    ("water-treatment", "vertical-turbine-pump"),
    ("wind-energy", "offshore-wind-turbine"),
    ("industrial-plant", "centrifugal-pump"),
]


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def fetch(url: str) -> tuple[int, bytes]:
    request = Request(url, headers={"User-Agent": "kernelCAD-catalog-review/1.0"})
    try:
        with urlopen(request, timeout=30) as response:
            return response.status, response.read()
    except HTTPError as error:
        return error.code, error.read()
    except URLError as error:
        raise RuntimeError(f"failed to fetch {url}: {error}") from error


rows = []
for kit, asset_id in ASSETS:
    slug = f"{kit}-{asset_id}"
    page_url = f"{ORIGIN}/catalog/{kit}/{asset_id}/"
    preview_url = f"{page_url}preview.png"
    source_url = f"{ORIGIN}/assets/{slug}.kcad.ts"
    page_status, page = fetch(page_url)
    preview_status, preview = fetch(preview_url)
    source_status, source = fetch(source_url)
    local_preview = (BUNDLE / "samples" / "previews" / f"{asset_id}.png").read_bytes()
    local_source = (BUNDLE / "samples" / "sources" / f"{asset_id}.kcad.ts").read_bytes()
    rows.append(
        {
            "asset": f"{kit}/{asset_id}",
            "pageUrl": page_url,
            "previewUrl": preview_url,
            "sourceUrl": source_url,
            "pageHttp": page_status,
            "previewHttp": preview_status,
            "sourceHttp": source_status,
            "localSourceSha256": sha256(local_source),
            "publicSourceSha256": sha256(source) if source_status == 200 else None,
            "sourceMatchesLocal": source_status == 200 and sha256(source) == sha256(local_source),
            "localPreviewSha256": sha256(local_preview),
            "publicPreviewSha256": sha256(preview) if preview_status == 200 else None,
            "previewMatchesLocal": preview_status == 200 and sha256(preview) == sha256(local_preview),
        }
    )

report = {"checkedAt": "2026-11-27", "assets": rows}
(BUNDLE / "live-baseline" / "public-check.json").write_text(
    json.dumps(report, indent=2) + "\n", encoding="utf-8"
)
for row in rows:
    print(
        f"{row['asset']}: page={row['pageHttp']} preview={row['previewHttp']} "
        f"source={row['sourceHttp']} source-match={row['sourceMatchesLocal']} "
        f"preview-match={row['previewMatchesLocal']}"
    )
if not all(
    row["pageHttp"] == 200
    and row["previewHttp"] == 200
    and row["sourceHttp"] == 200
    and row["sourceMatchesLocal"]
    and row["previewMatchesLocal"]
    for row in rows
):
    raise SystemExit("one or more live catalog baselines did not match the local review snapshot")
