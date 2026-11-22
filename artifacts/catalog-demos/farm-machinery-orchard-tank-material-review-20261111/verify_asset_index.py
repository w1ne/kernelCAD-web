#!/usr/bin/env python3
"""Verify the changed source hash, preview, and unchanged geometry in catalog/index.json."""

import hashlib
import json
from pathlib import Path


REPO = Path(__file__).resolve().parents[3]
INDEX = REPO / "catalog/index.json"
ASSET_ID = "orchard-air-blast-sprayer"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


data = json.loads(INDEX.read_text(encoding="utf-8"))
asset = next(item for item in data["assets"] if item["id"] == ASSET_ID)
source_path = REPO / asset["source"]
preview_path = REPO / "catalog/kits" / asset["kit"] / "previews" / f"{asset['id']}.png"
actual_source_hash = sha256(source_path)
actual_preview_hash = sha256(preview_path)
assert asset["sourceSha256"] == actual_source_hash
assert asset["preview"] == f"/assets/{asset['kit']}-{asset['id']}.png"
assert asset["stats"]["triangles"] == 400
assert asset["stats"]["sizeM"] == [0.9964, 1.68, 1.78]
assert asset["triangleBudget"] == 2200
assert any(param["name"] == "tankPolymerColor" for param in asset["params"])
assert "tankPolymerColor" in asset["presets"]["weathered"]
assert "tankPolymerColor" in asset["presets"]["highVisibility"]

record = {
    "asset": ASSET_ID,
    "source": str(source_path.relative_to(REPO)),
    "sourceSha256": actual_source_hash,
    "sourceHashMatchesIndex": True,
    "preview": asset["preview"],
    "previewPath": str(preview_path.relative_to(REPO)),
    "previewSha256": actual_preview_hash,
    "previewExists": preview_path.is_file(),
    "triangles": asset["stats"]["triangles"],
    "triangleBudget": asset["triangleBudget"],
    "sizeM": asset["stats"]["sizeM"],
    "tankPolymerColorInBothPresets": True,
}
output = Path(__file__).resolve().parent / "verification" / "index-verification.json"
output.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
print(json.dumps(record, indent=2))
