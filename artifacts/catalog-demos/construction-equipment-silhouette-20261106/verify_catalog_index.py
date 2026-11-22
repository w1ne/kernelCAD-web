#!/usr/bin/env python3
"""Verify all construction-equipment index sources and preview paths."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
settings = json.loads((BUNDLE / "demo-settings.json").read_text(encoding="utf-8"))
index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
assets = [row for row in index["assets"] if row["kit"] == settings["kit"]]
if len(assets) != settings["assetCount"]:
    raise SystemExit(f"index has {len(assets)} kit assets, expected {settings['assetCount']}")

rows = {row["id"]: row for row in assets}
if sorted(rows) != sorted(settings["previewAssetIDs"]):
    raise SystemExit("demo preview ID list differs from catalog/index.json")

verified = []
for asset_id in settings["previewAssetIDs"]:
    row = rows[asset_id]
    source = ROOT / row["source"]
    source_sha = hashlib.sha256(source.read_bytes()).hexdigest()
    if source_sha != row["sourceSha256"]:
        raise SystemExit(f"stale sourceSha256 for {settings['kit']}/{asset_id}")
    preview = ROOT / "catalog" / "kits" / settings["kit"] / "previews" / f"{asset_id}.png"
    if not preview.is_file() or not row.get("preview"):
        raise SystemExit(f"missing preview for {settings['kit']}/{asset_id}")
    verified.append({
        "id": asset_id,
        "source": row["source"],
        "sourceSha256": source_sha,
        "preview": row["preview"],
        "previewSha256": hashlib.sha256(preview.read_bytes()).hexdigest(),
        "triangles": row["stats"]["triangles"],
        "triangleBudget": row["triangleBudget"],
    })

for target in settings["sources"]:
    row = rows[target["id"]]
    controls = {param["name"] for param in row["params"] if param["type"] == "color"}
    if controls != set(target["materialControls"]):
        raise SystemExit(f"material controls changed unexpectedly for {target['id']}: {sorted(controls)}")
    for name, choices in target["shapeChoices"].items():
        param = next((item for item in row["params"] if item["name"] == name), None)
        if param is None or param.get("choices") != choices:
            raise SystemExit(f"shape choices missing or stale for {target['id']}/{name}")
    if set(row.get("presets", {})) != set(target["presets"]):
        raise SystemExit(f"named palettes missing for {target['id']}")

result = {
    "status": "passed",
    "kit": settings["kit"],
    "verifiedAssets": len(verified),
    "refinedAssets": [target["id"] for target in settings["sources"]],
    "rows": verified,
}
(BUNDLE / "preview-index-check.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"status": "passed", "kit": settings["kit"], "verifiedAssets": len(verified), "refinedAssets": result["refinedAssets"]}, indent=2))
