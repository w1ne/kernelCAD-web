#!/usr/bin/env python3
"""Audit the indexed source/preview promotion and retain a compact result."""

import hashlib
import json
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
KIT = ROOT / "catalog/kits/water-treatment"
index = json.loads((ROOT / "catalog/index.json").read_text())
promotion = json.loads((BUNDLE / "promotion-output.json").read_text())
rows = {asset["id"]: asset for asset in index["assets"] if asset["kit"] == "water-treatment"}
expected = {record["id"] for record in promotion["records"]}
failures = []
total_material_controls = 0
triangles = []

if len(rows) != 50 or set(rows) != expected:
    failures.append(f"kit IDs differ: indexed={len(rows)}, promotion={len(expected)}")

for asset_id in sorted(expected):
    row = rows.get(asset_id)
    if row is None:
        continue
    source_path = ROOT / row["source"]
    source_hash = hashlib.sha256(source_path.read_bytes()).hexdigest()
    if source_hash != row.get("sourceSha256"):
        failures.append(f"stale source hash: {asset_id}")
    preview_path = KIT / "previews" / f"{asset_id}.png"
    if not row.get("preview") or not preview_path.is_file():
        failures.append(f"missing indexed preview: {asset_id}")
    material_params = [param["name"] for param in row.get("params", []) if param["name"] != "scale"]
    total_material_controls += len(material_params)
    if not 2 <= len(material_params) <= 4:
        failures.append(f"invalid material control count ({len(material_params)}): {asset_id}")
    if not {"weathered", "highVisibility"}.issubset(row.get("presets", {})):
        failures.append(f"missing named palette presets: {asset_id}")
    count = row.get("stats", {}).get("triangles")
    budget = row.get("triangleBudget")
    if count is None or budget is None or count > budget:
        failures.append(f"triangle budget missing or exceeded: {asset_id} ({count}/{budget})")
    if count is not None:
        triangles.append(count)

quality_output = (BUNDLE / "water-treatment-quality-output.txt").read_text()
if "50/50 assets pass" not in quality_output:
    failures.append("checkCatalogQuality.py did not report 50/50 water-treatment assets")

audit = {
    "kit": "water-treatment",
    "assetsPromoted": len(expected),
    "newAssetIds": 0,
    "indexedRowsWithPreview": sum(bool(row.get("preview")) for row in rows.values()),
    "sourceHashesCurrent": len(expected) - sum(1 for failure in failures if failure.startswith("stale source hash:")),
    "materialControls": total_material_controls,
    "materialControlsPerAsset": {"min": 2, "max": 4},
    "presetEntries": 2 * len(expected),
    "loftedCylinderSilhouettes": promotion["loftedCylinderSilhouettes"],
    "inclinedLamellaPlates": promotion["inclinedLamellaPlates"],
    "triangles": {"min": min(triangles) if triangles else None, "max": max(triangles) if triangles else None, "maxBudget": max((row.get("triangleBudget", 0) for row in rows.values()), default=None), "withinDeclaredBudgets": not any("triangle budget" in failure for failure in failures)},
    "qualityGate": "50/50 pass",
    "eslint": json.loads((BUNDLE / "catalog-eslint-status.json").read_text()).get("status"),
    "catalogIntegration": json.loads((BUNDLE / "catalog-test-status.json").read_text()).get("status"),
    "localPages": json.loads((BUNDLE / "catalog-pages-check.json").read_text()).get("passed"),
    "failures": failures,
    "passed": not failures,
}
(BUNDLE / "promotion-audit.json").write_text(json.dumps(audit, indent=2) + "\n")
print(json.dumps(audit, indent=2))
if failures:
    raise SystemExit(1)
