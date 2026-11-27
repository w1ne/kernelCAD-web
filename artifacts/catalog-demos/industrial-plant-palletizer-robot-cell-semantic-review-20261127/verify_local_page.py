#!/usr/bin/env python3
"""Check the locally generated palletizer detail page and preview."""

import hashlib
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
page_root = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/kernelcad-palletizer-robot-cell-pages-20261127")
asset_page = page_root / "catalog/industrial-plant/palletizer-robot-cell"
html = (asset_page / "index.html").read_text(encoding="utf-8")
generated_preview = asset_page / "preview.png"
source_preview = ROOT / "catalog/kits/industrial-plant/previews/palletizer-robot-cell.png"
checks = {
    "title": "<h1>Palletizer robot cell</h1>" in html,
    "updatedDescription": "roller infeed" in html and "carton-loaded timber pallet" in html,
    "concreteControl": "concrete" in html and "Concrete floor" in html,
    "steelControl": "steel" in html and "Structural and roller steel" in html,
    "safetyPaintControl": "safetyPaint" in html and "Safety paint" in html,
    "cartonControl": "carton" in html and "Corrugated cartons" in html,
    "weatheredPreset": "weathered" in html,
    "highVisibilityPreset": "highVisibility" in html,
    "previewMatchesGeneratedSource": generated_preview.read_bytes() == source_preview.read_bytes(),
}
result = {
    "invocation": "python3 artifacts/catalog-demos/industrial-plant-palletizer-robot-cell-semantic-review-20261127/verify_local_page.py /tmp/kernelcad-palletizer-robot-cell-pages-20261127",
    "page": str(asset_page / "index.html"),
    "previewSha256": hashlib.sha256(generated_preview.read_bytes()).hexdigest(),
    "checks": checks,
    "pass": all(checks.values()),
}
(BUNDLE / "local-page-check.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
if not result["pass"]:
    raise SystemExit("generated local catalog detail page did not reflect the updated asset")
print("Local detail page shows the revised scene, four material controls, both presets, and matching preview.")
