#!/usr/bin/env python3
"""Save the five local catalog samples and their current public-page baseline."""

from __future__ import annotations

import hashlib
import json
import subprocess
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
IDS = (
    "rotary-filler",
    "sanitary-lobe-pump",
    "pet-blow-molder",
    "case-checkweigher",
    "flash-pasteurizer",
)
KIT = "beverage-bottling-line"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def fetch(url: str) -> tuple[int, bytes]:
    request = urllib.request.Request(url, headers={"User-Agent": "kernelCAD-catalog-audit/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()


index = json.loads((ROOT / "catalog/index.json").read_text())
rows = [row for row in index["assets"] if row["kit"] == KIT and row["id"] in IDS]
if {row["id"] for row in rows} != set(IDS):
    raise SystemExit("sample IDs do not all have generated catalog rows")

records = []
for asset_id in IDS:
    source = ROOT / "catalog/kits" / KIT / f"{asset_id}.kcad.ts"
    preview = ROOT / "catalog/kits" / KIT / "previews" / f"{asset_id}.png"
    if not source.is_file() or not preview.is_file():
        raise SystemExit(f"missing source or rendered preview for {KIT}/{asset_id}")

    source_bytes = source.read_bytes()
    preview_bytes = preview.read_bytes()
    local_source_copy = BUNDLE / "sample/local-source" / source.name
    local_preview_copy = BUNDLE / "sample/local-preview" / preview.name
    local_source_copy.write_bytes(source_bytes)
    local_preview_copy.write_bytes(preview_bytes)

    page_url = f"https://kernelcad.com/catalog/{KIT}/{asset_id}/"
    preview_url = f"{page_url}preview.png"
    page_status, page_bytes = fetch(page_url)
    live_preview_status, live_preview_bytes = fetch(preview_url)
    (BUNDLE / "live-baseline" / f"{asset_id}.html").write_bytes(page_bytes)
    if live_preview_status == 200:
        (BUNDLE / "live-baseline" / f"{asset_id}.png").write_bytes(live_preview_bytes)

    row = next(item for item in rows if item["id"] == asset_id)
    records.append({
        "id": asset_id,
        "sourceSha256": sha256(source_bytes),
        "localPreviewSha256": sha256(preview_bytes),
        "indexRow": row,
        "publicPage": {
            "url": page_url,
            "status": page_status,
            "sha256": sha256(page_bytes),
        },
        "publicPreview": {
            "url": preview_url,
            "status": live_preview_status,
            "sha256": sha256(live_preview_bytes),
            "matchesLocal": live_preview_status == 200 and sha256(live_preview_bytes) == sha256(preview_bytes),
        },
    })

head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
report = {
    "capturedAt": datetime.now(timezone.utc).isoformat(),
    "repositoryHead": head,
    "publicSite": "https://kernelcad.com",
    "samples": records,
}
(BUNDLE / "baseline-ledger.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps({"head": head, "samples": [
    {"id": item["id"], "pageStatus": item["publicPage"]["status"],
     "previewStatus": item["publicPreview"]["status"],
     "publicMatchesLocal": item["publicPreview"]["matchesLocal"]}
    for item in records
]}, indent=2))
