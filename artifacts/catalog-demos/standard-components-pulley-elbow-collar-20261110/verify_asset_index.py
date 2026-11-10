#!/usr/bin/env python3
"""Verify all 50 kit source hashes and previews in the generated index."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
rows = {asset["id"]: asset for asset in index["assets"] if asset["kit"] == "standard-components"}
sources = sorted((ROOT / "catalog/kits/standard-components").glob("*.kcad.ts"))
if len(rows) != 50 or len(sources) != 50:
    raise SystemExit(f"Expected 50 standard-components index rows and sources; got {len(rows)} and {len(sources)}")

checks = []
for source in sources:
    asset_id = source.name.removesuffix(".kcad.ts")
    row = rows.get(asset_id)
    if row is None:
        raise SystemExit(f"Missing index row for {asset_id}")
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    if row.get("sourceSha256") != source_hash:
        raise SystemExit(f"Stale sourceSha256 for {asset_id}")
    preview = ROOT / "catalog/kits/standard-components/previews" / f"{asset_id}.png"
    if not preview.is_file() or row.get("preview") != f"/assets/standard-components-{asset_id}.png":
        raise SystemExit(f"Missing indexed preview for {asset_id}")
    checks.append({
        "id": asset_id,
        "sourceSha256": source_hash,
        "preview": row["preview"],
        "previewSha256": hashlib.sha256(preview.read_bytes()).hexdigest(),
        "triangles": row["stats"]["triangles"],
        "triangleBudget": row["triangleBudget"],
    })

for asset_id, triangles, budget in [
    ("v-belt-pulley", 518, 700),
    ("pipe-elbow-90", 1528, 2000),
    ("shaft-collar", 416, 560),
]:
    row = rows[asset_id]
    if row["stats"]["triangles"] != triangles or row["triangleBudget"] != budget:
        raise SystemExit(f"Unexpected index mesh/budget for {asset_id}: {row['stats']['triangles']}/{row['triangleBudget']}")
    if len(row.get("presets", {})) < 1:
        raise SystemExit(f"{asset_id} is missing its named appearance presets")

record = {"kit": "standard-components", "assetCount": len(checks), "allSourceHashesMatch": True,
          "allPreviewPathsIndexed": True, "assets": checks}
(BUNDLE / "preview-index-check.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"kit": record["kit"], "assetCount": record["assetCount"], "sourceHashes": True, "previewPaths": True}))
