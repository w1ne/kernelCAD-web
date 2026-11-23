#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Verify indexed sources and previews after the generated catalog rebuild."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/standard-components"
ASSETS = ("pipe-reducer", "retaining-ring", "tubular-spacer")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
    rows = {row["id"]: row for row in index["assets"] if row.get("kit") == "standard-components"}
    missing_hashes = []
    missing_previews = []
    for row in index["assets"]:
        source = ROOT / row["source"]
        if row.get("sourceSha256") != sha256(source):
            missing_hashes.append(row["source"])
        preview = ROOT / "catalog/kits" / row["kit"] / "previews" / f"{row['id']}.png"
        if not row.get("preview") or not preview.is_file():
            missing_previews.append(f"{row['kit']}/{row['id']}")
    if missing_hashes or missing_previews:
        raise SystemExit(f"catalog-wide mismatch: source hashes={missing_hashes[:8]}, missing previews={missing_previews[:8]}")
    evidence = {}
    for asset in ASSETS:
        row = rows[asset]
        source = KIT / f"{asset}.kcad.ts"
        preview = KIT / "previews" / f"{asset}.png"
        actual_hash = sha256(source)
        if row.get("sourceSha256") != actual_hash:
            raise SystemExit(f"stale sourceSha256 for standard-components/{asset}")
        if not preview.is_file() or not row.get("preview"):
            raise SystemExit(f"missing preview or index preview path for standard-components/{asset}")
        evidence[asset] = {
            "sourceSha256": actual_hash,
            "preview": str(preview.relative_to(ROOT)),
            "previewSha256": sha256(preview),
            "indexedPreview": row["preview"],
            "triangles": row.get("stats", {}).get("triangles"),
            "params": [param["name"] for param in row.get("params", [])],
            "presets": sorted(row.get("presets", {})),
        }
    result = {
        "invocation": "python3 artifacts/catalog-demos/standard-components-pipe-geometry-20261110/verify_asset_index.py",
        "catalogAssetCount": len(index["assets"]),
        "catalogKitCount": len(index["kits"]),
        "allSourceHashesMatch": True,
        "allPreviewsPresent": True,
        "kitAssetCount": len(rows),
        "checked": evidence,
    }
    (BUNDLE / "index-verification.json").write_text(f"{json.dumps(result, indent=2)}\n", encoding="utf-8")
    print(f"Verified all {len(index['assets'])} source hashes and previews; standard-components has {len(rows)} assets; {len(evidence)} edited rows recorded.")


if __name__ == "__main__":
    main()
