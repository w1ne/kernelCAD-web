#!/usr/bin/env python3
"""Verify IDs, material controls, presets, source hashes, budgets, and previews."""

from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "scripts"))
from checkCatalogQuality import passes, score  # noqa: E402

KIT_ID = "ev-charging-infrastructure"
KIT = ROOT / "catalog/kits" / KIT_ID
index = json.loads((ROOT / "catalog/index.json").read_text())
baseline = json.loads((ROOT / "artifacts/catalog-demos/ev-charging-wave-20261103/settings.json").read_text())
rows = {row["id"]: row for row in index["assets"] if row["kit"] == KIT_ID}
paths = sorted(KIT.glob("*.kcad.ts"))
ids = {path.name.removesuffix(".kcad.ts") for path in paths}
baseline_ids = {row["id"] for row in baseline["assets"]}
if ids != baseline_ids or len(paths) != 50 or set(rows) != ids:
    raise SystemExit("the promotion must keep the same 50 source IDs and index rows")

inventory = []
material_controls = 0
preset_entries = 0
triangles = []
for path in paths:
    asset_id = path.name.removesuffix(".kcad.ts")
    row = rows[asset_id]
    source = path.read_text()
    if re.search(r"param\(\s*['\"]colou?r['\"]", source) or re.search(r"\.color\(\s*color\s*\)", source):
        raise SystemExit(f"generic flat color control remains: {asset_id}")
    if f"// {row['title']}:" not in source:
        raise SystemExit(f"missing object-specific source comment: {asset_id}")
    source_hash = hashlib.sha256(path.read_bytes()).hexdigest()
    if source_hash != row["sourceSha256"]:
        raise SystemExit(f"stale sourceSha256: {asset_id}")
    preview_file = KIT / "previews" / f"{asset_id}.png"
    if not preview_file.is_file() or row["preview"] != f"/assets/{KIT_ID}-{asset_id}.png":
        raise SystemExit(f"missing or mis-indexed preview: {asset_id}")
    controls = [param for param in row["params"] if param["type"] == "color"]
    presets = row["presets"]
    if not 2 <= len(controls) <= 4 or len(presets) < 1:
        raise SystemExit(f"parameter/preset count outside quality bar: {asset_id}")
    quality = score(str(path))
    if not passes(quality, 2) or quality.geometry < 1:
        raise SystemExit(f"checkCatalogQuality gate failed: {asset_id}")
    count = row["stats"]["triangles"]
    if count > row["triangleBudget"]:
        raise SystemExit(f"triangle budget exceeded: {asset_id} ({count}/{row['triangleBudget']})")
    material_controls += len(controls)
    preset_entries += len(presets)
    triangles.append(count)
    inventory.append({
        "id": asset_id,
        "sourceSha256": source_hash,
        "params": [{"name": param["name"], "label": param.get("label"), "default": param["default"]} for param in controls],
        "presets": presets,
        "triangles": count,
        "triangleBudget": row["triangleBudget"],
        "preview": row["preview"],
        "previewFile": str(preview_file.relative_to(ROOT)),
    })

if preset_entries != 100:
    raise SystemExit(f"expected 100 preset entries, found {preset_entries}")
bundle = ROOT / "artifacts/catalog-demos/ev-charging-infrastructure-quality-promotion-20261105"
(bundle / "asset-inventory.json").write_text(json.dumps({
    "kit": KIT_ID,
    "assetCount": len(paths),
    "assetIdsPreserved": True,
    "materialControls": material_controls,
    "presetEntries": preset_entries,
    "triangles": {"minimum": min(triangles), "maximum": max(triangles)},
    "assets": inventory,
}, indent=2) + "\n")
print(f"verified {len(paths)} preserved IDs, {material_controls} material controls, {preset_entries} preset entries")
print(f"all source hashes, 50 preview files/routes, quality scores, and triangle budgets pass ({min(triangles)}–{max(triangles)} tris)")
