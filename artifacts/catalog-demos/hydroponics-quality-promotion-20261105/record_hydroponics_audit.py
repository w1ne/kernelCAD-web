#!/usr/bin/env python3
"""Verify indexed source hashes, presets, previews, budgets and catalog quality."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "scripts"))
from checkCatalogQuality import passes, score  # noqa: E402

index = json.loads((ROOT / "catalog/index.json").read_text())
rows = [row for row in index["assets"] if row["kit"] == "hydroponics"]
source_files = sorted((ROOT / "catalog/kits/hydroponics").glob("*.kcad.ts"))
expected_ids = {path.name.removesuffix(".kcad.ts") for path in source_files}
row_ids = {row["id"] for row in rows}
errors = []
hash_matches = 0
preview_rows = 0
material_controls = 0
preset_entries = 0
material_range = []
triangles = []
budgets = []

if len(source_files) != 52 or row_ids != expected_ids:
    errors.append(f"expected matching 52 sources/index rows, got {len(source_files)} / {len(rows)}")

for row in rows:
    source = ROOT / row["source"]
    if not source.is_file():
        errors.append(f"missing source {source}")
        continue
    if hashlib.sha256(source.read_bytes()).hexdigest() == row["sourceSha256"]:
        hash_matches += 1
    else:
        errors.append(f"stale source hash for {row['id']}")

    preview = ROOT / "catalog/kits/hydroponics/previews" / f"{row['id']}.png"
    if row.get("preview") and preview.is_file() and preview.stat().st_size > 0:
        preview_rows += 1
    else:
        errors.append(f"missing rendered/indexed preview for {row['id']}")

    materials = [param for param in row["params"] if param["name"] != "scale"]
    material_range.append(len(materials))
    material_controls += len(materials)
    if not 2 <= len(materials) <= 4:
        errors.append(f"{row['id']} has {len(materials)} material controls")
    names = {param["name"].lower() for param in materials}
    if names & {"color", "colour", "base", "basecolor", "main", "fill"}:
        errors.append(f"{row['id']} still has a generic color parameter")

    presets = row.get("presets", {})
    preset_entries += len(presets)
    if not {"weathered", "highVisibility"}.issubset(presets):
        errors.append(f"{row['id']} is missing a named preset")
    triangles.append(row["stats"]["triangles"])
    budgets.append(row["triangleBudget"])
    if row["stats"]["triangles"] > row["triangleBudget"]:
        errors.append(f"{row['id']} exceeds triangle budget")

all_scores = [score(str(path)) for path in sorted((ROOT / "catalog/kits").glob("*/*.kcad.ts"))]
quality_pass = sum(passes(asset, 2) for asset in all_scores)
total_assets = len(all_scores)
quality_before = 1296
if quality_pass - quality_before != 52:
    errors.append(f"measured baseline was 1296 passing; expected 52 new passes, got {quality_pass - quality_before}")

eslint = json.loads((BUNDLE / "catalog-eslint-status.json").read_text())
integration = json.loads((BUNDLE / "catalog-test-status.json").read_text())
pages = json.loads((BUNDLE / "catalog-pages-check.json").read_text())
if eslint.get("exitCode") != 0:
    errors.append("kit ESLint did not pass")
if integration.get("exitCode") != 0:
    errors.append("catalog integration tests did not pass")
if not pages.get("passed"):
    errors.append("local catalog page check did not pass")

audit = {
    "kit": "hydroponics",
    "assetsPromoted": len(rows),
    "newAssetIds": 0,
    "materialControls": material_controls,
    "controlsPerAsset": {"min": min(material_range), "max": max(material_range)},
    "presetEntries": preset_entries,
    "sourceHashesMatching": hash_matches,
    "indexedRowsWithPreview": preview_rows,
    "triangles": {"min": min(triangles), "max": max(triangles)},
    "triangleBudget": {"maxMeasured": max(triangles), "maxDeclared": max(budgets), "allWithinBudget": not any("triangle budget" in error for error in errors)},
    "qualityGate": f"{sum(passes(score(str(path)), 2) for path in source_files)}/{len(rows)} pass",
    "baselineQuality": f"{quality_before}/{total_assets} ({100 * quality_before / total_assets:.2f}% pass)",
    "afterQuality": f"{quality_pass}/{total_assets} ({100 * quality_pass / total_assets:.2f}% pass)",
    "thinAssetsAfter": total_assets - quality_pass,
    "eslint": "PASS" if eslint.get("exitCode") == 0 else "FAIL",
    "catalogIntegration": "PASS" if integration.get("exitCode") == 0 else "FAIL",
    "localPages": bool(pages.get("passed")),
    "geometryUpgrades": json.loads((BUNDLE / "promotion-output.json").read_text())["geometryUpgrades"],
    "errors": errors,
    "passed": not errors,
}
(BUNDLE / "promotion-audit.json").write_text(json.dumps(audit, indent=2) + "\n")
print(json.dumps(audit, indent=2))
if errors:
    raise SystemExit(1)

table = [
    "| id | asset | description | material controls · presets | triangles / budget |",
    "| --- | --- | --- | --- | ---: |",
]
for row in sorted(rows, key=lambda item: item["id"]):
    controls = [param["name"] for param in row["params"] if param["name"] != "scale"]
    knob_text = " · ".join([*controls, *row["presets"].keys()])
    description = row["description"].replace("|", "&#124;")
    table.append(
        f"| `{row['id']}` | {row['title']} | {description} | {knob_text} | "
        f"{row['stats']['triangles']} / {row['triangleBudget']} |"
    )

readme = f'''# Hydroponics kit

This kit promotes all 52 existing controlled-environment growing assets in place. Every model has an editable overall scale, 2–4 material-named color controls and `weathered` / `highVisibility` presets. The greenhouse tunnel has a curved roof; both fans have swept blades and open guards; the circulation pump uses a cylindrical motor and volute. Other rectilinear trays, racks and reservoirs keep forms that fit their use.

The 52 regenerated indexed meshes range from {min(triangles)} to {max(triangles)} triangles, below their existing {max(budgets)}-triangle budget. Catalog quality moved from **{audit['baselineQuality']}** to **{audit['afterQuality']}**; {audit['thinAssetsAfter']} assets remain thin.

The [quality-promotion demo bundle](../../../artifacts/catalog-demos/hydroponics-quality-promotion-20261105/README.md) retains the source transformation, baseline and final previews, settings, source-hash/index audit, lint and integration logs, local page check, preset render and visually inspected MP4. The [original hydroponics wave bundle](../../../artifacts/catalog-demos/hydroponics-wave-20261103/README.md) retains the initial asset creation record. Local page generation is not deployment verification.

{chr(10).join(table)}

## Rebuild and verify

The promotion script reads the original kit sources from the pre-promotion revision `5cddb841c`. To replay the transformation from a later checkout, restore that version first:

```sh
git restore --source=5cddb841c -- catalog/kits/hydroponics
PYTHONDONTWRITEBYTECODE=1 python3 artifacts/catalog-demos/hydroponics-quality-promotion-20261105/promote_hydroponics.py
xargs -a artifacts/catalog-demos/hydroponics-quality-promotion-20261105/preview-asset-ids.txt npx tsx scripts/renderCatalogPreviews.ts
npx tsx scripts/buildAssetCatalog.ts
python3 scripts/checkCatalogQuality.py --kit hydroponics
npx eslint catalog/kits/hydroponics/
npx vitest run tests/integration/catalog/
```

The public homepage and `/assets.json` responded successfully when checked on 2026-11-05. The public `/catalog/` and `/catalog/hydroponics/` routes returned HTTP 404; this feature branch is not deployed. These are stylized visualization props and do not establish crop yield, water or nutrient performance, sensor calibration, equipment ratings, food-contact suitability, structural capacity, safety, regulatory compliance, manufacturing, or physical acceptance.
'''
(ROOT / "catalog/kits/hydroponics/README.md").write_text(readme)
