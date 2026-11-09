#!/usr/bin/env python3
"""Check the generated static catalog page and its copied preview."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
if len(sys.argv) != 2:
    raise SystemExit("usage: verify_local_page.py <catalog-pages-out-dir>")
OUT = Path(sys.argv[1]).resolve()
index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
asset = next(row for row in index["assets"] if row["kit"] == "garden" and row["id"] == "compost-bin")
source = ROOT / asset["source"]
preview = ROOT / "catalog/kits/garden/previews/compost-bin.png"
page = OUT / "catalog/garden/compost-bin/index.html"
copied_preview = OUT / "catalog/garden/compost-bin/preview.png"
html = page.read_text(encoding="utf-8")

source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
preview_hash = hashlib.sha256(preview.read_bytes()).hexdigest()
copied_preview_hash = hashlib.sha256(copied_preview.read_bytes()).hexdigest()
checks = {
    "sourceSha256MatchesIndex": source_hash == asset["sourceSha256"],
    "pageContainsCurrentTitle": "<h1>Slatted compost bin</h1>" in html,
    "pageContainsFrontAccessChoices": all(value in html for value in ["frontAccess", "lower-access", "closed"]),
    "pageContainsMaterialControls": all(value in html for value in ["Treated timber", "Compost"]),
    "pageContainsNamedPresets": all(value in html for value in ["recycled", "painted", "mature"]),
    "previewCopiedFromCurrentSourceRender": preview_hash == copied_preview_hash,
    "pageHasOpenInStudioLink": "Open in Studio" in html,
}
report = {
    "page": str(page),
    "pageTitle": asset["title"],
    "sourceSha256": source_hash,
    "indexSourceSha256": asset["sourceSha256"],
    "previewSha256": preview_hash,
    "copiedPreviewSha256": copied_preview_hash,
    "checks": checks,
    "allPassed": all(checks.values()),
}
print(json.dumps(report, indent=2))
if not report["allPassed"]:
    raise SystemExit(1)
