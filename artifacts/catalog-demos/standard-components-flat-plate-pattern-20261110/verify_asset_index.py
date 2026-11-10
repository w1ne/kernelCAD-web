#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
"""Verify generated index fields and source/preview links for this asset."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
ASSET = "flat-joining-plate"
KIT = "standard-components"


def main() -> None:
    index_path = ROOT / "catalog/index.json"
    index = json.loads(index_path.read_text(encoding="utf-8"))
    rows = [row for row in index["assets"] if row["id"] == ASSET]
    if len(rows) != 1:
        raise SystemExit(f"expected one {ASSET} row, found {len(rows)}")
    row = rows[0]
    source = ROOT / row["source"]
    # Catalog-local preview files are rooted under catalog/kits/<kit>/.
    preview = ROOT / "catalog/kits" / KIT / "previews" / f"{ASSET}.png"
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    if source_hash != row["sourceSha256"]:
        raise SystemExit("generated index sourceSha256 does not match the current source")
    if row["preview"] != f"/assets/{KIT}-{ASSET}.png" or not preview.is_file():
        raise SystemExit("generated index does not point at the rendered catalog preview")
    params = {param["name"]: param for param in row["params"]}
    expected = {
        "holeCount": ["three", "four", "five"],
        "size": ["compact", "standard", "large"],
    }
    for name, choices in expected.items():
        param = params.get(name)
        if param is None or param.get("type") != "choice" or param.get("choices") != choices:
            raise SystemExit(f"generated index has incorrect {name} parameter: {param}")
    if not {"steel", "zinc"}.issubset(params):
        raise SystemExit("generated index is missing the separate material controls")
    if sorted(row["presets"]) != ["brass", "dark", "weathered"]:
        raise SystemExit("generated index is missing the named appearance palettes")
    if row["triangleBudget"] != 800 or row["stats"]["triangles"] > row["triangleBudget"]:
        raise SystemExit("generated index triangle budget is incorrect or exceeded")
    if len(index["assets"]) != 2402:
        raise SystemExit(f"catalog count changed unexpectedly: {len(index['assets'])}")
    result = {
        "asset": ASSET,
        "kit": KIT,
        "catalogAssetCount": len(index["assets"]),
        "preview": row["preview"],
        "previewBytes": preview.stat().st_size,
        "sourceSha256": source_hash,
        "sourceSha256MatchesIndex": True,
        "params": row["params"],
        "presets": sorted(row["presets"]),
        "triangles": row["stats"]["triangles"],
        "triangleBudget": row["triangleBudget"],
    }
    (OUT / "index-verification.json").write_text(f"{json.dumps(result, indent=2)}\n", encoding="utf-8")
    print(f"verified {KIT}/{ASSET}: source hash, preview, parameters, presets and triangle budget; {len(index['assets'])} catalog assets")


if __name__ == "__main__":
    main()
