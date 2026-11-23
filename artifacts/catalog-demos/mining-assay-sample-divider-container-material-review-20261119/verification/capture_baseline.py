#!/usr/bin/env python3
"""Capture the pre-change public page, source and preview baselines."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[4]
BUNDLE = Path(__file__).resolve().parents[1]
KIT = "mining"
ASSETS = [
    "assay-sample-divider",
    "core-tray-rack",
    "mine-refuge-chamber",
    "mine-survey-tripod",
    "mine-ventilation-fan",
]
INDEX = json.loads((ROOT / "catalog/index.json").read_text())


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def fetch(url: str) -> tuple[int, bytes]:
    request = Request(url, headers={"User-Agent": "kernelCAD-catalog-audit/1.0"})
    try:
        with urlopen(request, timeout=30) as response:
            return response.status, response.read()
    except HTTPError as exc:
        return exc.code, exc.read()
    except URLError as exc:
        raise RuntimeError(f"GET {url}: {exc}") from exc


rows = []
index_rows = []
for asset_id in ASSETS:
    local_source = (BUNDLE / "samples/sources" / f"{asset_id}.kcad.ts").read_bytes()
    local_preview = (BUNDLE / "samples/previews" / f"{asset_id}.png").read_bytes()
    page_url = f"https://kernelcad.com/catalog/{KIT}/{asset_id}/"
    preview_url = f"{page_url}preview.png"
    source_url = f"https://kernelcad.com/assets/{KIT}-{asset_id}.kcad.ts"
    page_status, page = fetch(page_url)
    preview_status, public_preview = fetch(preview_url)
    source_status, public_source = fetch(source_url)
    (BUNDLE / "live-baseline/pages" / f"{asset_id}.html").write_bytes(page)
    if preview_status == 200:
        (BUNDLE / "live-baseline/previews" / f"{asset_id}.png").write_bytes(public_preview)
    if source_status == 200:
        (BUNDLE / "live-baseline/sources" / f"{asset_id}.kcad.ts").write_bytes(public_source)

    index_row = next(
        asset for asset in INDEX["assets"]
        if asset["kit"] == KIT and asset["id"] == asset_id
    )
    title = re.search(rb"<title[^>]*>(.*?)</title>", page, re.I | re.S)
    row = {
        "asset": f"{KIT}/{asset_id}",
        "pageUrl": page_url,
        "previewUrl": preview_url,
        "sourceUrl": source_url,
        "pageHttp": page_status,
        "pageTitle": title.group(1).decode("utf-8", "replace").strip() if title else None,
        "previewHttp": preview_status,
        "sourceHttp": source_status,
        "localSourceSha256": sha256(local_source),
        "publicSourceSha256": sha256(public_source),
        "sourceMatchesLocalBaseline": local_source == public_source,
        "localPreviewSha256": sha256(local_preview),
        "publicPreviewSha256": sha256(public_preview),
        "previewMatchesLocalBaseline": local_preview == public_preview,
        "indexSourceSha256": index_row["sourceSha256"],
        "indexPreview": index_row.get("preview"),
        "indexRow": index_row,
    }
    rows.append(row)
    index_rows.append(index_row)

if not all(
    row["pageHttp"] == 200
    and row["previewHttp"] == 200
    and row["sourceHttp"] == 200
    and row["sourceMatchesLocalBaseline"]
    and row["previewMatchesLocalBaseline"]
    and row["indexSourceSha256"] == row["localSourceSha256"]
    and row["indexPreview"]
    for row in rows
):
    raise SystemExit("A public/local source, preview, or index baseline check failed")

(BUNDLE / "live-baseline/public-check.json").write_text(json.dumps(rows, indent=2) + "\n")
(BUNDLE / "live-baseline/index-rows.json").write_text(json.dumps(index_rows, indent=2) + "\n")
print(f"Saved and matched {len(rows)} public pages, sources, previews and index rows.")
for row in rows:
    print(f"OK {row['asset']}: page/source/preview HTTP 200; public source and preview match local baseline")
