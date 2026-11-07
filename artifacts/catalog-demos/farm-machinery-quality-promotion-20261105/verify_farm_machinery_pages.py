#!/usr/bin/env python3
"""Audit the locally generated farm-machinery catalog pages and index."""

import hashlib
import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
INDEX = ROOT / "catalog/index.json"
KIT = ROOT / "catalog/kits/farm-machinery"


def main():
    if len(sys.argv) != 2:
        raise SystemExit("usage: verify_farm_machinery_pages.py PAGE_BUILD_DIR")
    page_root = Path(sys.argv[1]) / "catalog/farm-machinery"
    index = json.loads(INDEX.read_text())
    assets = [row for row in index["assets"] if row["kit"] == "farm-machinery"]
    failures = []
    detail = []
    for row in sorted(assets, key=lambda item: item["id"]):
        source = ROOT / row["source"]
        preview = KIT / "previews" / f"{row['id']}.png"
        page = page_root / row["id"] / "index.html"
        page_preview = page_root / row["id"] / "preview.png"
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        material_params = [
            param for param in row.get("params", [])
            if param.get("type") == "color" and param.get("name") != "color"
        ]
        presets = row.get("presets") or {}
        html = page.read_text() if page.is_file() else ""
        checks = {
            "source_sha_matches": digest == row.get("sourceSha256"),
            "preview_indexed": bool(row.get("preview")),
            "preview_source_exists": preview.is_file(),
            "page_exists": page.is_file(),
            "page_preview_exists": page_preview.is_file(),
            "material_controls_2_to_4": 2 <= len(material_params) <= 4,
            "preset_exists": bool(presets),
            "page_canonical_matches": f"/catalog/farm-machinery/{row['id']}/" in html,
        }
        if not all(checks.values()):
            failures.append({"id": row["id"], "failed": [key for key, value in checks.items() if not value]})
        detail.append({"id": row["id"], "materialControls": len(material_params), "presets": len(presets), "checks": checks})

    hub = (Path(sys.argv[1]) / "catalog/index.html")
    hub_text = hub.read_text() if hub.is_file() else ""
    hub_has_kit = "farm-machinery" in hub_text
    if not hub_has_kit:
        failures.append({"id": "catalog-hub", "failed": ["kit_entry_missing"]})

    result = {
        "scope": "local generated pages only; not production deployment",
        "kit": "farm-machinery",
        "indexedAssets": len(assets),
        "pagesVerified": sum(all(row["checks"].values()) for row in detail),
        "hubEntryPresent": hub_has_kit,
        "allSourceSha256Match": all(row["checks"]["source_sha_matches"] for row in detail),
        "allPreviewsIndexedAndCopied": all(row["checks"]["preview_indexed"] and row["checks"]["page_preview_exists"] for row in detail),
        "failures": failures,
        "assets": detail,
    }
    (BUNDLE / "catalog-pages-check.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({key: result[key] for key in ("kit", "indexedAssets", "pagesVerified", "hubEntryPresent", "allSourceSha256Match", "allPreviewsIndexedAndCopied", "failures")}, indent=2))
    if len(assets) != 60 or failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
