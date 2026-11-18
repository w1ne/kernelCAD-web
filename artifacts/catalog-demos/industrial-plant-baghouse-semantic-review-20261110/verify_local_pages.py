#!/usr/bin/env python3
"""Check and retain the locally generated baghouse static detail page."""

import hashlib
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
PAGE_DIR = Path("/tmp/kernelcad-industrial-plant-pages/catalog/industrial-plant/baghouse-dust-collector")
page, preview = PAGE_DIR / "index.html", PAGE_DIR / "preview.png"
if not page.is_file() or not preview.is_file():
    raise SystemExit("local asset page or copied preview is missing")
markup = page.read_text(encoding="utf-8")
expected = [
    "Baghouse dust collector", "steel", "safetyPaint", "weathered",
    "highVisibility", "tapered dust hopper", "induced-draft fan",
]
missing = [token for token in expected if token.lower() not in markup.lower()]
if missing:
    raise SystemExit(f"local page is missing expected title/controls/presets/description: {missing}")
source_preview = ROOT / "catalog/kits/industrial-plant/previews/baghouse-dust-collector.png"
preview_sha = hashlib.sha256(preview.read_bytes()).hexdigest()
if preview_sha != hashlib.sha256(source_preview.read_bytes()).hexdigest():
    raise SystemExit("local page preview hash does not match catalog preview")
retained = BUNDLE / "local-page/catalog/industrial-plant/baghouse-dust-collector"
retained.mkdir(parents=True, exist_ok=True)
shutil.copy2(page, retained / "index.html")
shutil.copy2(preview, retained / "preview.png")
record = {
    "invocation": "python3 artifacts/catalog-demos/industrial-plant-baghouse-semantic-review-20261110/verify_local_pages.py",
    "scope": "generated local static page only; not deployed behavior",
    "page": str(page),
    "retainedSnapshot": "local-page/catalog/industrial-plant/baghouse-dust-collector/index.html",
    "copiedPreviewSha256": preview_sha,
    "expectedPageTokens": expected,
    "studioLinkPresent": "https://app.kernelcad.com/studio" in markup,
}
(BUNDLE / "local-page-check.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
print("Verified local baghouse page, material controls, presets, description and matching preview.")
