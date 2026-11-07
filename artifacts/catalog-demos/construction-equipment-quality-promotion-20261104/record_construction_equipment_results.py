#!/usr/bin/env python3
"""Audit the generated index, source hashes, previews and declared mesh budgets."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
INDEX = json.loads((ROOT / "catalog/index.json").read_text())
ASSETS = [asset for asset in INDEX["assets"] if asset["kit"] == "construction-equipment"]
failures = []
color_counts = []
triangle_counts = []
material_counts = []
palette_zone_counts = []
for asset in ASSETS:
    source_path = ROOT / asset["source"]
    source = source_path.read_text()
    source_sha = hashlib.sha256(source_path.read_bytes()).hexdigest()
    if source_sha != asset["sourceSha256"]:
        failures.append(f"{asset['id']}: stale sourceSha256")
    colors = [param for param in asset["params"] if param["type"] == "color"]
    color_counts.append(len(colors))
    generic = [p["name"] for p in colors if p["name"].lower() in {"color", "colour", "base", "basecolor", "main", "fill"}]
    if not 2 <= len(colors) <= 4 or generic:
        failures.append(f"{asset['id']}: invalid material controls {len(colors)} {generic}")
    presets = asset.get("presets") or {}
    if not {"weathered", "highVisibility"}.issubset(presets):
        failures.append(f"{asset['id']}: missing named appearance presets")
    preview = ROOT / "catalog/kits/construction-equipment/previews" / f"{asset['id']}.png"
    if not preview.is_file() or not asset.get("preview"):
        failures.append(f"{asset['id']}: missing rendered/indexed preview")
    triangles = int(asset["stats"]["triangles"])
    budget = int(asset["triangleBudget"])
    triangle_counts.append(triangles)
    if triangles > budget:
        failures.append(f"{asset['id']}: {triangles} triangles exceeds budget {budget}")
    material_counts.append(int(asset["stats"].get("materials", 0)))
    palette_zones = asset.get("palette") or []
    palette_zone_counts.append(len(palette_zones))
    if len(palette_zones) < 2:
        failures.append(f"{asset['id']}: fewer than two indexed material color zones")

result = {
    "kit": "construction-equipment",
    "assetsPromoted": len(ASSETS),
    "newAssets": 0,
    "indexedRowsWithPreview": sum(bool(asset.get("preview")) for asset in ASSETS),
    "sourceHashesCurrent": sum(
        hashlib.sha256((ROOT / asset["source"]).read_bytes()).hexdigest() == asset["sourceSha256"]
        for asset in ASSETS
    ),
    "materialControls": sum(color_counts),
    "materialControlsMin": min(color_counts, default=0),
    "materialControlsMax": max(color_counts, default=0),
    "presetEntries": sum(len(asset.get("presets") or {}) for asset in ASSETS),
    "previewsRendered": sum(
        (ROOT / "catalog/kits/construction-equipment/previews" / f"{asset['id']}.png").is_file()
        for asset in ASSETS
    ),
    "triangles": {
        "min": min(triangle_counts, default=0),
        "max": max(triangle_counts, default=0),
        "mean": round(sum(triangle_counts) / len(triangle_counts), 1) if triangle_counts else 0,
        "maxBudget": max((int(asset["triangleBudget"]) for asset in ASSETS), default=0),
        "withinDeclaredBudgets": not any("exceeds budget" in failure for failure in failures),
    },
    "indexedMaterialColorZones": {
        "min": min(palette_zone_counts, default=0),
        "max": max(palette_zone_counts, default=0),
        "total": sum(palette_zone_counts),
    },
    "glbMaterialTableEntries": {
        "min": min(material_counts, default=0),
        "max": max(material_counts, default=0),
        "note": "The catalog preview preserves color zones in vertex colors; this count is the GLB material table size.",
    },
    "failures": failures,
    "passed": len(ASSETS) == 60 and not failures,
}
(BUNDLE / "promotion-audit.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if not result["passed"]:
    raise SystemExit(1)
