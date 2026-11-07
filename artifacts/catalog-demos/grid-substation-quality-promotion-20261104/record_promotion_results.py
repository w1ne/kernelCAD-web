#!/usr/bin/env python3
"""Audit promoted sources against the regenerated index and local previews."""

import hashlib
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/grid-substation"
index = json.loads((ROOT / "catalog/index.json").read_text())
rows = [asset for asset in index["assets"] if asset["kit"] == "grid-substation"]
source_files = sorted(KIT.glob("*.kcad.ts"))
by_id = {asset["id"]: asset for asset in rows}
problems = []
knob_total = 0
variant_total = 0
material_roles = set()
triangles = []
operator_counts = []

for path in source_files:
    asset_id = path.name.removesuffix(".kcad.ts")
    asset = by_id.get(asset_id)
    if asset is None:
        problems.append(f"{asset_id}: missing index row")
        continue
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != asset.get("sourceSha256"):
        problems.append(f"{asset_id}: source hash mismatch")
    roles = [param for param in asset.get("params", []) if param["name"] != "scale"]
    knob_total += len(roles)
    if not 2 <= len(roles) <= 4 or any(param["name"] == "color" for param in roles):
        problems.append(f"{asset_id}: expected 2–4 material-named color controls")
    material_roles.update(param["name"] for param in roles)
    presets = asset.get("presets", {})
    variant_total += len(presets)
    if not {"weathered", "maintenance"}.issubset(presets):
        problems.append(f"{asset_id}: missing weathered or maintenance preset")
    preview = KIT / "previews" / f"{asset_id}.png"
    if not preview.is_file() or not asset.get("preview"):
        problems.append(f"{asset_id}: missing rendered or indexed preview")
    mesh = asset.get("stats", {}).get("triangles", 0)
    budget = asset.get("triangleBudget", 0)
    triangles.append(mesh)
    if mesh <= 0 or not budget or mesh > budget:
        problems.append(f"{asset_id}: mesh triangle budget invalid ({mesh}/{budget})")
    source = path.read_text()
    operators = len(re.findall(r"\bpath\s*\(|\.(?:loft|rotate[XYZ])\s*\(", source))
    operator_counts.append(operators)
    if operators == 0:
        problems.append(f"{asset_id}: no contour, loft, or rotated geometry in source")
    if "Original grid-substation scene asset." in source:
        problems.append(f"{asset_id}: generic original-asset description remains")

missing_rows = sorted(set(by_id) - {path.name.removesuffix(".kcad.ts") for path in source_files})
if missing_rows:
    problems.extend(f"{asset_id}: index row has no source" for asset_id in missing_rows)
if len(rows) != 80 or len(source_files) != 80:
    problems.append(f"expected 80 existing assets, found {len(rows)} index rows and {len(source_files)} sources")

promotion = json.loads((BUNDLE / "promotion-output.json").read_text())
result = {
    "kit": "grid-substation",
    "assetsPromoted": len(source_files),
    "indexRows": len(rows),
    "materialColorKnobs": knob_total,
    "materialColorKnobsPerAsset": {
        "min": min((len([p for p in asset.get("params", []) if p["name"] != "scale"]) for asset in rows), default=0),
        "max": max((len([p for p in asset.get("params", []) if p["name"] != "scale"]) for asset in rows), default=0),
    },
    "namedMaterialRoles": sorted(material_roles),
    "presetVariants": variant_total,
    "presetNamesPerAsset": ["weathered", "maintenance"],
    "minimumShapeOperatorsPerAsset": min(operator_counts, default=0),
    "maximumShapeOperatorsPerAsset": max(operator_counts, default=0),
    "triangleRange": {"min": min(triangles, default=0), "max": max(triangles, default=0)},
    "indexRowsWithPreview": sum(1 for asset in rows if asset.get("preview")),
    "previewsRendered": sum(1 for path in source_files if (KIT / "previews" / f"{path.name.removesuffix('.kcad.ts')}.png").is_file()),
    "sourceHashesMatch": not any("source hash mismatch" in problem for problem in problems),
    "noIdentifiersAddedOrRemoved": len(rows) == 80 and len(source_files) == 80 and not missing_rows,
    "qualityGate": "passed" if not problems else "failed",
    "issues": problems,
    "promotionScriptAssets": promotion["assetCount"],
}
(BUNDLE / "promotion-audit.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if problems:
    raise SystemExit(1)
