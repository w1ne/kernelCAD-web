#!/usr/bin/env python3
"""Record local catalog rows and live public source/render hashes for the sample."""
import hashlib
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
ASSETS = [
    ("mining", "rotary-blasthole-drill"),
    ("mining", "shaft-headframe"),
    ("construction-equipment", "concrete-batch-plant"),
    ("construction-equipment", "towable-light-tower"),
    ("data-center-infrastructure", "rear-door-heat-exchanger"),
]
index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
rows = {asset["id"]: asset for asset in index["assets"]}


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


items = []
for kit, asset_id in ASSETS:
    source = ROOT / "catalog/kits" / kit / f"{asset_id}.kcad.ts"
    preview = ROOT / "catalog/kits" / kit / "previews" / f"{asset_id}.png"
    live_source = HERE / "live-baseline" / f"{asset_id}.kcad.ts"
    live_preview = HERE / "live-baseline" / f"{asset_id}.png"
    baseline_source = (HERE / "before" if asset_id == "rear-door-heat-exchanger" else HERE / "sample") / f"{asset_id}.kcad.ts"
    baseline_preview = (HERE / "before" if asset_id == "rear-door-heat-exchanger" else HERE / "sample") / f"{asset_id}.png"
    html = (HERE / "live-baseline" / f"{asset_id}.html").read_text(encoding="utf-8", errors="replace")
    title_match = re.search(r"<title[^>]*>(.*?)</title>", html, re.I | re.S)
    row = rows[asset_id]
    current_source_hash = sha(source)
    current_preview_hash = sha(preview)
    items.append({
        "kit": kit,
        "id": asset_id,
        "sourceSha256": current_source_hash,
        "previewSha256": current_preview_hash,
        "indexSourceSha256": row["sourceSha256"],
        "indexPreview": row.get("preview"),
        "triangles": row["stats"]["triangles"],
        "sizeM": row["stats"]["sizeM"],
        "colorParams": [param["name"] for param in row["params"] if param["type"] == "color"],
        "presets": list(row["presets"]),
        "liveSourceSha256": sha(live_source),
        "livePreviewSha256": sha(live_preview),
        "baselineSourceMatchesLive": sha(baseline_source) == sha(live_source),
        "baselinePreviewMatchesLive": sha(baseline_preview) == sha(live_preview),
        "localSourceMatchesLive": current_source_hash == sha(live_source),
        "localPreviewMatchesLive": current_preview_hash == sha(live_preview),
        "liveTitle": title_match.group(1).strip() if title_match else None,
        "sourceIndexFresh": current_source_hash == row["sourceSha256"],
        "previewExists": preview.is_file(),
    })

assert all(item["sourceIndexFresh"] and item["previewExists"] for item in items)
record = {"checkedAt": "2026-11-12", "items": items}
(HERE / "baseline-manifest.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
print(json.dumps(record, indent=2))
