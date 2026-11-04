#!/usr/bin/env python3
"""Audit promoted sources against the generated index and rendered previews."""

import hashlib
import importlib.util
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/amusement-park"
index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
rows = [row for row in index["assets"] if row["kit"] == "amusement-park"]

generator_path = ROOT / "artifacts/catalog-demos/amusement-park-wave-20261103/generate_amusement_park_assets.py"
spec = importlib.util.spec_from_file_location("amusement_park_generator", generator_path)
if spec is None or spec.loader is None:
    raise SystemExit(f"cannot load {generator_path}")
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)
expected_ids = {item["id"] for item in generator.ASSETS}
actual_ids = {row["id"] for row in rows}

material_re = re.compile(r"\.color\(\s*([A-Za-z_]\w*)")
generic = {"color", "colour", "base", "basecolor", "main", "fill"}
source_hashes_match = True
preview_rows = 0
material_counts = []
triangle_counts = []
missing = []
for row in rows:
    path = ROOT / row["source"]
    source = path.read_text(encoding="utf-8")
    material_roles = {name for name in material_re.findall(source) if name.lower() not in generic}
    material_counts.append(len(material_roles))
    triangle_counts.append(row["stats"]["triangles"])
    source_hashes_match &= hashlib.sha256(path.read_bytes()).hexdigest() == row["sourceSha256"]
    if not row.get("preview"):
        missing.append(f"{row['id']}: no preview path in index")
    elif not (KIT / "previews" / f"{row['id']}.png").is_file():
        missing.append(f"{row['id']}: preview file missing")
    else:
        preview_rows += 1
    if len(material_roles) < 2:
        missing.append(f"{row['id']}: only {len(material_roles)} material color arguments")
    if not {"festival", "twilight"}.issubset(row.get("presets", {})):
        missing.append(f"{row['id']}: expected festival/twilight presets")
    if row["stats"]["triangles"] > row["triangleBudget"]:
        missing.append(f"{row['id']}: triangle budget exceeded")

if expected_ids != actual_ids:
    missing.append("catalog source IDs changed")
if not source_hashes_match:
    missing.append("sourceSha256 is stale for one or more index rows")

audit = {
    "kit": "amusement-park",
    "assetsPromoted": len(actual_ids),
    "expectedExistingAssets": len(expected_ids),
    "idsAddedOrRemoved": sorted(actual_ids ^ expected_ids),
    "materialColorKnobs": sum(material_counts),
    "materialColorKnobsPerAsset": {
        "min": min(material_counts, default=0),
        "max": max(material_counts, default=0),
    },
    "namedMaterialRoles": sorted({
        name for row in rows for name in material_re.findall((ROOT / row["source"]).read_text(encoding="utf-8"))
        if name.lower() not in generic
    }),
    "presetVariants": sum(len(row.get("presets", {})) for row in rows),
    "presetNamesPerAsset": ["festival", "twilight"],
    "triangleRange": {
        "min": min(triangle_counts, default=0),
        "max": max(triangle_counts, default=0),
    },
    "indexRowsWithPreview": preview_rows,
    "previewsRendered": len(list((KIT / "previews").glob("*.png"))),
    "sourceHashesMatch": source_hashes_match,
    "noIdentifiersAddedOrRemoved": expected_ids == actual_ids,
    "qualityGate": "passed" if not missing else "failed",
    "issues": missing,
    "indexRowsAcrossAllKits": len(index["assets"]),
}
(BUNDLE / "promotion-audit.json").write_text(json.dumps(audit, indent=2) + "\n", encoding="utf-8")
print(json.dumps(audit, indent=2))
if missing or len(rows) != 70 or preview_rows != 70:
    raise SystemExit(1)
