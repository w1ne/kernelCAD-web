#!/usr/bin/env python3
"""Save the selected assets' current local and public baselines."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[4]
BUNDLE = Path(__file__).resolve().parents[1]
KIT = "recycling-facility"
ASSETS = [
    "conveyor-transfer-tower",
    "conveyor-transfer-chute",
    "color-sorter-camera",
    "inclined-belt-conveyor",
    "magnet-cleanout-drum",
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


kit_row = next(row for row in INDEX["kits"] if row["id"] == KIT)
rows = []
index_rows = []
for asset_id in ASSETS:
    source_path = ROOT / "catalog/kits" / KIT / f"{asset_id}.kcad.ts"
    preview_path = ROOT / "catalog/kits" / KIT / "previews" / f"{asset_id}.png"
    local_source = source_path.read_bytes()
    local_preview = preview_path.read_bytes()
    (BUNDLE / "samples/sources" / source_path.name).write_bytes(local_source)
    (BUNDLE / "samples/previews" / preview_path.name).write_bytes(local_preview)

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

    row = next(
        asset for asset in INDEX["assets"]
        if asset["kit"] == KIT and asset["id"] == asset_id
    )
    result = {
        "asset": f"{KIT}/{asset_id}",
        "pageUrl": page_url,
        "previewUrl": preview_url,
        "sourceUrl": source_url,
        "pageHttp": page_status,
        "previewHttp": preview_status,
        "sourceHttp": source_status,
        "localSourceSha256": sha256(local_source),
        "publicSourceSha256": sha256(public_source),
        "sourceMatchesLocal": local_source == public_source,
        "localPreviewSha256": sha256(local_preview),
        "publicPreviewSha256": sha256(public_preview),
        "previewMatchesLocal": local_preview == public_preview,
        "indexSourceSha256": row["sourceSha256"],
        "indexPreview": row.get("preview"),
        "indexRow": row,
    }
    rows.append(result)
    index_rows.append(row)

if not all(
    row["pageHttp"] == 200
    and row["previewHttp"] == 200
    and row["sourceHttp"] == 200
    and row["sourceMatchesLocal"]
    and row["previewMatchesLocal"]
    and row["indexSourceSha256"] == row["localSourceSha256"]
    and row["indexPreview"]
    for row in rows
):
    raise SystemExit("A public/local source, preview, or index baseline check failed")

(BUNDLE / "live-baseline/public-check.json").write_text(json.dumps(rows, indent=2) + "\n")
(BUNDLE / "live-baseline/index-rows.json").write_text(json.dumps(index_rows, indent=2) + "\n")
print(f"Saved and matched {len(rows)} live pages, sources, previews, and index rows.")
for row in rows:
    print(
        f"OK {row['asset']}: page/source/preview HTTP 200; live source and preview match local; index SHA matches"
    )
