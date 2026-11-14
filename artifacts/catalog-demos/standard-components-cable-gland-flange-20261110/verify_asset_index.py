#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Verify generated source hashes and preview paths for the refreshed catalog."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
ASSETS = ("cable-gland", "square-mounting-flange")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
    rows = {row["id"]: row for row in index["assets"]}
    mismatched_sources = []
    missing_previews = []
    for row in index["assets"]:
        source = ROOT / row["source"]
        preview = ROOT / "catalog/kits" / row["kit"] / "previews" / f"{row['id']}.png"
        if row.get("sourceSha256") != sha256(source):
            mismatched_sources.append(row["source"])
        if not row.get("preview") or not preview.is_file():
            missing_previews.append(f"{row['kit']}/{row['id']}")
    if mismatched_sources or missing_previews:
        raise SystemExit(f"catalog mismatch: source hashes={mismatched_sources[:8]}, missing previews={missing_previews[:8]}")

    checked = {}
    for asset in ASSETS:
        row = rows[asset]
        source = ROOT / row["source"]
        preview = ROOT / "catalog/kits/standard-components/previews" / f"{asset}.png"
        checked[asset] = {
            "sourceSha256": sha256(source),
            "preview": str(preview.relative_to(ROOT)),
            "previewSha256": sha256(preview),
            "indexedPreview": row["preview"],
            "triangles": row.get("stats", {}).get("triangles"),
            "triangleBudget": int(source.read_text(encoding="utf-8").split("triangleBudget:", 1)[1].split(",", 1)[0].strip()),
            "params": [param["name"] for param in row.get("params", [])],
            "presets": sorted(row.get("presets", {})),
        }
    result = {
        "invocation": "python3 artifacts/catalog-demos/standard-components-cable-gland-flange-20261110/verify_asset_index.py",
        "catalogAssetCount": len(index["assets"]),
        "catalogKitCount": len(index["kits"]),
        "allSourceHashesMatch": True,
        "allPreviewsPresent": True,
        "standardComponentsAssetCount": sum(row.get("kit") == "standard-components" for row in index["assets"]),
        "checked": checked,
    }
    (BUNDLE / "index-verification.json").write_text(f"{json.dumps(result, indent=2)}\n", encoding="utf-8")
    print(f"Verified {len(index['assets'])} source hashes and previews; recorded {len(checked)} edited rows.")


if __name__ == "__main__":
    main()
