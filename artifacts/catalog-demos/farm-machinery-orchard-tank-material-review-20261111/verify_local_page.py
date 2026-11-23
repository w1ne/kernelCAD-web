#!/usr/bin/env python3
"""Check the locally generated catalog detail page and copied preview."""

import hashlib
import json
from pathlib import Path


REPO = Path(__file__).resolve().parents[3]
BUILD = Path("/tmp/kernelcad-orchard-tank-material-review")
PAGE = BUILD / "catalog/farm-machinery/orchard-air-blast-sprayer/index.html"
PREVIEW = BUILD / "catalog/farm-machinery/orchard-air-blast-sprayer/preview.png"
SOURCE_PREVIEW = REPO / "catalog/kits/farm-machinery/previews/orchard-air-blast-sprayer.png"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


html = PAGE.read_text(encoding="utf-8")
for term in ("Orchard air-blast sprayer", "tankPolymerColor", "Tank polymer", "weathered", "highVisibility"):
    assert term in html, f"detail page does not contain {term!r}"
assert sha256(PREVIEW) == sha256(SOURCE_PREVIEW)
record = {
    "page": str(PAGE),
    "pageExists": PAGE.is_file(),
    "tankMaterialControlVisible": "Tank polymer" in html,
    "bothPresetsVisible": "weathered" in html and "highVisibility" in html,
    "preview": str(PREVIEW),
    "previewMatchesCheckedInSource": True,
    "previewSha256": sha256(PREVIEW),
}
output = Path(__file__).resolve().parent / "verification" / "local-page-verification.json"
output.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
print(json.dumps(record, indent=2))
