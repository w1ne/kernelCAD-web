#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
"""Verify the generated index row, source hash, and rendered preview."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
ASSET = "vertical-turbine-pump"
KIT = "water-treatment"


def main() -> None:
    index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
    rows = {row["id"]: row for row in index["assets"] if row["kit"] == KIT}
    if ASSET not in rows:
        raise SystemExit(f"{KIT}/{ASSET} is missing from generated catalog index")
    row = rows[ASSET]
    source = ROOT / row["source"]
    preview = ROOT / "catalog/kits" / KIT / "previews" / f"{ASSET}.png"
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    if source_hash != row["sourceSha256"]:
        raise SystemExit("catalog index source hash does not match the edited source")
    if not preview.is_file() or row["preview"] != f"/assets/{KIT}-{ASSET}.png":
        raise SystemExit("catalog preview file or indexed preview path is missing")
    if row["stats"]["triangles"] > row["triangleBudget"]:
        raise SystemExit("generated triangle count exceeds the declared budget")
    params = [entry["name"] for entry in row["params"]]
    required = {"scale", "outletOrientation", "coatedSteel", "structuralSteel", "stainlessSteel", "motorFinish"}
    if not required.issubset(params):
        raise SystemExit(f"generated index is missing parameters: {sorted(required - set(params))}")
    if not {"weathered", "highVisibility"}.issubset(row["presets"]):
        raise SystemExit("generated index is missing a named appearance preset")
    result = {
        "checkedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "scope": "Generated local catalog index and kit preview; public deployment not checked.",
        "asset": f"{KIT}/{ASSET}",
        "sourceSha256MatchesIndex": True,
        "sourceSha256": source_hash,
        "preview": str(preview.relative_to(ROOT)),
        "previewBytes": preview.stat().st_size,
        "triangleCount": row["stats"]["triangles"],
        "triangleBudget": row["triangleBudget"],
        "parameters": params,
        "presets": sorted(row["presets"]),
        "kitAssets": len(rows),
        "catalogAssets": len(index["assets"]),
    }
    (OUT / "index-verification.json").write_text(f"{json.dumps(result, indent=2)}\n", encoding="utf-8")
    print(
        f"verified {KIT}/{ASSET}: source hash matches; {row['stats']['triangles']} triangles "
        f"under {row['triangleBudget']}; preview indexed"
    )


if __name__ == "__main__":
    main()
