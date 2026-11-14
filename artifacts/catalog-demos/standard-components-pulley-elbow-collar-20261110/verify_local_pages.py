#!/usr/bin/env python3
"""Check the generated local catalog hub and the three edited asset pages."""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/kernelcad-standard-components-pulley-elbow-collar-20261110")
ASSETS = {
    "v-belt-pulley": ["castIron", "steel", "hardware", "dark", "brass", "weathered"],
    "pipe-elbow-90": ["steel", "bronze", "elastomer", "dark", "brass", "weathered"],
    "shaft-collar": ["retention", "steel", "zinc", "dark", "brass", "weathered"],
}

hub = (OUT / "catalog/index.html").read_text(encoding="utf-8")
results = []
for asset_id, visible_controls in ASSETS.items():
    page_path = OUT / "catalog/standard-components" / asset_id / "index.html"
    page = page_path.read_text(encoding="utf-8")
    preview_path = OUT / "catalog/standard-components" / asset_id / "preview.png"
    missing = [control for control in visible_controls if control not in page]
    passed = asset_id in hub and preview_path.is_file() and not missing
    if not passed:
        raise SystemExit(f"{asset_id}: local page check failed; missing={missing}, preview={preview_path.is_file()}")
    source = ROOT / "catalog/kits/standard-components" / f"{asset_id}.kcad.ts"
    source_sha = hashlib.sha256(source.read_bytes()).hexdigest()
    preview_sha = hashlib.sha256((ROOT / "catalog/kits/standard-components/previews" / f"{asset_id}.png").read_bytes()).hexdigest()
    results.append({
        "id": asset_id,
        "page": str(page_path),
        "previewExists": True,
        "controlsAndPresetsFound": visible_controls,
        "sourceSha256": source_sha,
        "previewSha256": preview_sha,
        "passed": True,
    })

record = {"outputDirectory": str(OUT), "hub": str(OUT / "catalog/index.html"), "pagesChecked": len(results), "results": results}
(BUNDLE / "local-page-check.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"pagesChecked": len(results), "passed": True, "outputDirectory": str(OUT)}))
