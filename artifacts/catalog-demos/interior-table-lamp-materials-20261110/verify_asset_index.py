#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
"""Check table-lamp source hash, preview path, and kit preview coverage."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent


def main() -> None:
    index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
    rows = [row for row in index["assets"] if row["kit"] == "interior"]
    if len(rows) != 72:
        raise SystemExit(f"expected 72 interior index rows, found {len(rows)}")
    row = next(asset for asset in rows if asset["id"] == "table-lamp")
    source = ROOT / row["source"]
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    if source_hash != row["sourceSha256"]:
        raise SystemExit("table-lamp sourceSha256 does not match the generated index")
    if row.get("preview") != "/assets/interior-table-lamp.png":
        raise SystemExit(f"unexpected preview path: {row.get('preview')}")
    missing = [asset["id"] for asset in rows if not (ROOT / f"catalog/kits/interior/previews/{asset['id']}.png").is_file()]
    if missing:
        raise SystemExit(f"interior assets missing previews: {missing}")
    result = {
        "checkedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "asset": "interior/table-lamp",
        "sourceSha256MatchesIndex": True,
        "previewPath": row["preview"],
        "previewBytes": (ROOT / "catalog/kits/interior/previews/table-lamp.png").stat().st_size,
        "interiorAssets": len(rows),
        "interiorPreviewsPresent": len(rows) - len(missing),
        "triangleCount": row["stats"]["triangles"],
        "triangleBudget": row["triangleBudget"],
        "params": [entry["name"] for entry in row["params"]],
        "presets": sorted(row["presets"]),
    }
    (BUNDLE / "index-verification.json").write_text(f"{json.dumps(result, indent=2)}\n", encoding="utf-8")
    print("table-lamp source hash and preview match index; all 72 interior previews exist")


if __name__ == "__main__":
    main()
