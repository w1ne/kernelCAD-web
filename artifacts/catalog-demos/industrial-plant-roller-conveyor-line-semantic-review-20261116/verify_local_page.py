#!/usr/bin/env python3
"""Confirm the generated local detail page exposes the updated asset data."""

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
page_root = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/kernelcad-roller-conveyor-line-pages-20261116")
asset_page = page_root / "catalog/industrial-plant/roller-conveyor-line"
html = (asset_page / "index.html").read_text(encoding="utf-8")
generated_preview = asset_page / "preview.png"
source_preview = ROOT / "catalog/kits/industrial-plant/previews/roller-conveyor-line.png"
checks = {
    "title": "<h1>Roller conveyor line</h1>" in html,
    "updatedDescription": "transverse steel rollers" in html and "three support stations" in html,
    "rollerSteelColorControl": "rollerSteel" in html and "Roller steel" in html,
    "weatheredPreset": "weathered" in html,
    "highVisibilityPreset": "highVisibility" in html,
    "previewMatchesGeneratedSource": generated_preview.read_bytes() == source_preview.read_bytes(),
}
result = {
    "invocation": "python3 artifacts/catalog-demos/industrial-plant-roller-conveyor-line-semantic-review-20261116/verify_local_page.py /tmp/kernelcad-roller-conveyor-line-pages-20261116",
    "page": str(asset_page / "index.html"),
    "previewSha256": hashlib.sha256(generated_preview.read_bytes()).hexdigest(),
    "checks": checks,
    "pass": all(checks.values()),
}
(BUNDLE / "local-page-check.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
if not result["pass"]:
    raise SystemExit("generated local catalog detail page did not reflect the updated asset")
print("Local detail page shows the updated description, roller-steel control, presets, and matching preview.")
