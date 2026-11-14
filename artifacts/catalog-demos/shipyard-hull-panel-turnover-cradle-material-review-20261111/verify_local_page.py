#!/usr/bin/env python3
"""Check the generated local detail page exposes the revised asset."""

import hashlib
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
output = Path(sys.argv[1]).resolve()
page = output / "catalog/shipyard/hull-panel-turnover-cradle/index.html"
preview = output / "catalog/shipyard/hull-panel-turnover-cradle/preview.png"
html = page.read_text()
source_preview = ROOT / "catalog/kits/shipyard/previews/hull-panel-turnover-cradle.png"

for fragment in (
    "Hull panel turnover cradle",
    "Yard finish",
    "Structural steel",
    "fresh-coat",
    "weathered-yard",
    'src="preview.png"',
):
    assert fragment in html, f"missing detail-page content: {fragment}"
assert hashlib.sha256(preview.read_bytes()).digest() == hashlib.sha256(source_preview.read_bytes()).digest()
print(f"Verified local page: {page}")
print(f"Preview SHA-256: {hashlib.sha256(preview.read_bytes()).hexdigest()}")
