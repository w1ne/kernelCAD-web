#!/usr/bin/env python3
"""Verify the generated catalog row, its source hash and preview file."""
from hashlib import sha256
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT, ASSET = "construction-equipment", "portable-core-drill-stand"
index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
row = next(a for a in index["assets"] if a["kit"] == KIT and a["id"] == ASSET)
steel_zone = next(zone for zone in row["palette"] if zone["name"] == "structuralSteelColor")
before = json.loads((BUNDLE / "before/index-row.json").read_text(encoding="utf-8"))
after = json.loads((BUNDLE / "after/index-row.json").read_text(encoding="utf-8"))
source_path = ROOT / row["source"]
preview_path = ROOT / "catalog/kits" / KIT / "previews" / f"{ASSET}.png"
source_hash = sha256(source_path.read_bytes()).hexdigest()
preview_hash = sha256(preview_path.read_bytes()).hexdigest()
changed_fields = [key for key in sorted(set(before) | set(after)) if before.get(key) != after.get(key)]
result = {
    "rowMatchesGeneratedSnapshot": row == after,
    "sourceSha256": row["sourceSha256"],
    "diskSha256": source_hash,
    "sourceHashMatches": row["sourceSha256"] == source_hash,
    "preview": row["preview"],
    "previewPathExists": preview_path.is_file(),
    "previewSha256": preview_hash,
    "changedRowFields": changed_fields,
    "geometryUnchanged": before["stats"] == after["stats"],
    "triangleCount": row["stats"]["triangles"],
    "sizeM": row["stats"]["sizeM"],
    "steelParts": steel_zone["parts"],
}
assert result["rowMatchesGeneratedSnapshot"]
assert result["sourceHashMatches"]
assert result["previewPathExists"]
assert result["geometryUnchanged"]
assert "core-bit" in result["steelParts"]
(BUNDLE / "verification/index-row-check.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result, indent=2))
