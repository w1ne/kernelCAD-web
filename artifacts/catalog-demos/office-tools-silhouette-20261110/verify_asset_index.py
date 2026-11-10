#!/usr/bin/env python3
"""Check changed source hashes, preview files, and triangle budgets in catalog/index.json."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
results = []

for asset_id in ("highlighter", "mechanical-pencil"):
    row = next(a for a in index["assets"] if a["kit"] == "office" and a["id"] == asset_id)
    source = ROOT / row["source"]
    preview = ROOT / "catalog/kits/office/previews" / f"{asset_id}.png"
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    triangles = row["stats"]["triangles"]
    budget = row["triangleBudget"]
    assert row["preview"], f"{asset_id} has no indexed preview URL"
    assert source_hash == row["sourceSha256"], f"{asset_id} source hash differs from the index"
    assert preview.is_file(), f"{asset_id} rendered preview is missing"
    assert triangles <= budget, f"{asset_id} has {triangles} triangles over budget {budget}"
    results.append({
        "id": asset_id,
        "source": row["source"],
        "sourceSha256": source_hash,
        "preview": row["preview"],
        "previewPath": str(preview.relative_to(ROOT)),
        "previewBytes": preview.stat().st_size,
        "triangles": triangles,
        "triangleBudget": budget,
    })

report = {
    "verified": True,
    "catalogAssetCount": len(index["assets"]),
    "officeAssetCount": len(next(k for k in index["kits"] if k["id"] == "office")["assets"]),
    "assets": results,
}
(BUNDLE / "index-verification.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
