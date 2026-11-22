#!/usr/bin/env python3
"""Check airfield IDs, source hashes, parameter quality, budgets and previews."""

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
current = json.loads((ROOT / "catalog/index.json").read_text())
previous = json.loads(subprocess.check_output(["git", "show", "HEAD:catalog/index.json"], cwd=ROOT, text=True))
assets = [row for row in current["assets"] if row["kit"] == "airfield"]
previous_ids = {row["id"] for row in previous["assets"] if row["kit"] == "airfield"}
current_ids = {row["id"] for row in assets}
failures: list[str] = []
material_controls = 0
preset_blocks = 0
preview_paths = 0
triangle_budgets = 0
source_hashes = 0

if len(assets) != 40 or len(current_ids) != 40:
    failures.append(f"expected 40 unique airfield rows, found {len(assets)} rows / {len(current_ids)} IDs")
if current_ids != previous_ids:
    failures.append(f"airfield ID set changed: added={sorted(current_ids - previous_ids)} removed={sorted(previous_ids - current_ids)}")

for row in assets:
    source = ROOT / row["source"]
    preview = ROOT / "catalog/kits/airfield/previews" / f"{row['id']}.png"
    if source.exists() and hashlib.sha256(source.read_bytes()).hexdigest() == row["sourceSha256"]:
        source_hashes += 1
    else:
        failures.append(f"{row['id']}: source hash mismatch or missing source")
    if row.get("preview") and preview.is_file():
        preview_paths += 1
    else:
        failures.append(f"{row['id']}: indexed preview path missing")
    colors = [param for param in row["params"] if param["type"] == "color"]
    material_controls += len(colors)
    if not 2 <= len(colors) <= 4:
        failures.append(f"{row['id']}: expected 2–4 material controls, found {len(colors)}")
    if len(row.get("presets", {})) >= 1:
        preset_blocks += 1
    else:
        failures.append(f"{row['id']}: presets missing")
    if row["stats"]["triangles"] <= row["triangleBudget"]:
        triangle_budgets += 1
    else:
        failures.append(f"{row['id']}: {row['stats']['triangles']} triangles exceeds {row['triangleBudget']}")

result = {
    "kit": "airfield",
    "assets": len(assets),
    "materialControlRange": [2, 4],
    "materialControls": material_controls,
    "presetBlocks": preset_blocks,
    "sourceHashesMatched": source_hashes,
    "previewPathsPresent": preview_paths,
    "triangleBudgetsWithinLimit": triangle_budgets,
    "sameIDsAsBefore": current_ids == previous_ids,
    "failures": failures,
}
(BUNDLE / "source-index-audit.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if failures:
    raise SystemExit(1)
