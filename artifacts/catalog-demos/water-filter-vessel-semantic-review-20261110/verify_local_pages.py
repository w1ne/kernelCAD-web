#!/usr/bin/env python3
"""Check the generated local detail page, controls, presets and preview copy."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
PAGE_DIR = ROOT / "site-build/catalog/water-treatment/pressure-sand-filter-vessel"
page, preview = PAGE_DIR / "index.html", PAGE_DIR / "preview.png"
if not page.is_file() or not preview.is_file():
    raise SystemExit("local asset page or copied preview is missing")
markup = page.read_text(encoding="utf-8")
expected = [
    "Pressure sand filter vessel", "coatedSteel", "structuralSteel", "stainlessSteel",
    "weathered", "highVisibility", "inspection manway", "flange lips",
]
missing = [token for token in expected if token.lower() not in markup.lower()]
if missing:
    raise SystemExit(f"local page is missing expected title/controls/presets/description: {missing}")
source_preview = ROOT / "catalog/kits/water-treatment/previews/pressure-sand-filter-vessel.png"
preview_sha = hashlib.sha256(preview.read_bytes()).hexdigest()
if preview_sha != hashlib.sha256(source_preview.read_bytes()).hexdigest():
    raise SystemExit("local page preview hash does not match catalog preview")
record = {
    "invocation": "python3 artifacts/catalog-demos/water-filter-vessel-semantic-review-20261110/verify_local_pages.py",
    "scope": "generated local static page only; not deployed behavior",
    "page": str(page.relative_to(ROOT)),
    "copiedPreviewSha256": preview_sha,
    "expectedPageTokens": expected,
    "studioLinkPresent": "https://app.kernelcad.com/studio" in markup,
}
(BUNDLE / "local-page-check.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
print("Verified local pressure-filter page, three material controls, two presets, description and matching preview.")
