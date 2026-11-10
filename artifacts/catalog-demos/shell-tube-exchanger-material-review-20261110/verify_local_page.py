#!/usr/bin/env python3
"""Check the generated local detail page and copied preview."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
PAGE_DIR = ROOT / "site-build/catalog/industrial-plant/shell-and-tube-exchanger"
page, preview = PAGE_DIR / "index.html", PAGE_DIR / "preview.png"
if not page.is_file() or not preview.is_file():
    raise SystemExit("local asset page or copied preview is missing")
markup = page.read_text(encoding="utf-8")
expected = [
    "Shell and tube heat exchanger", "Structural steel", "Tube sheets, nozzles and supports metal",
    "weathered", "stainless", "exposed metalwork",
]
missing = [token for token in expected if token.lower() not in markup.lower()]
if missing:
    raise SystemExit(f"local page is missing expected title/controls/presets/description: {missing}")
source_preview = ROOT / "catalog/kits/industrial-plant/previews/shell-and-tube-exchanger.png"
preview_sha = hashlib.sha256(preview.read_bytes()).hexdigest()
if preview_sha != hashlib.sha256(source_preview.read_bytes()).hexdigest():
    raise SystemExit("local page preview hash does not match catalog preview")
record = {
    "pass": True,
    "invocation": "python3 artifacts/catalog-demos/shell-tube-exchanger-material-review-20261110/verify_local_page.py",
    "scope": "generated local static page only; not deployed behavior",
    "page": str(page.relative_to(ROOT)),
    "copiedPreviewSha256": preview_sha,
    "expectedPageTokens": expected,
    "studioLinkPresent": "https://app.kernelcad.com/studio" in markup,
}
(BUNDLE / "local-page-check.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
print("Verified local exchanger page, two material controls, two presets, description and matching preview.")
