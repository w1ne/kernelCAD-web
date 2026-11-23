#!/usr/bin/env python3
"""Verify the generated local catalog detail page exposes the updated knobs."""

from __future__ import annotations

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
if len(sys.argv) != 2:
    raise SystemExit("usage: verify_local_page.py <catalog-pages-output-directory>")

output = Path(sys.argv[1]).resolve()
page = output / "catalog/beverage-bottling-line/case-checkweigher/index.html"
preview = output / "catalog/beverage-bottling-line/case-checkweigher/preview.png"
html = page.read_text(encoding="utf-8")
required = (
    "beltPolymer",
    "Polymer conveyor belt",
    "sanitaryLine",
    "legacyPlant",
    "248 (budget 320)",
    "1.26 × 0.78 × 0.785 m",
)
missing = [value for value in required if value not in html]
result = {
    "page": str(page),
    "pageExists": page.is_file(),
    "previewExists": preview.is_file(),
    "requiredStrings": list(required),
    "missingStrings": missing,
}
out = ROOT / "artifacts/catalog-demos/beverage-case-checkweigher-belt-material-review-20261112/verification/local-page-check.json"
out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result, indent=2))
if not page.is_file() or not preview.is_file() or missing:
    raise SystemExit(1)
