#!/usr/bin/env python3
"""Verify the generated local asset page exposes the updated controls/presets."""
import hashlib
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(sys.argv[1]).resolve()
PAGE = OUT / "catalog/shipyard/blast-dust-collector/index.html"
PREVIEW = OUT / "catalog/shipyard/blast-dust-collector/preview.png"
EXPECTED_PREVIEW = ROOT / "catalog/kits/shipyard/previews/blast-dust-collector.png"

html = PAGE.read_text(encoding="utf-8")
for expected in [
    "Blast dust collector",
    "yardPaint",
    "filterMedia",
    "elastomer",
    "fresh-coat",
    "weathered-yard",
]:
    assert expected in html, f"missing {expected} from local asset page"
assert PREVIEW.is_file()
rendered_hash = hashlib.sha256(PREVIEW.read_bytes()).hexdigest()
expected_hash = hashlib.sha256(EXPECTED_PREVIEW.read_bytes()).hexdigest()
assert rendered_hash == expected_hash, "local page copied a stale preview"
print(f"local page: {PAGE}")
print("controls: yardPaint, filterMedia, elastomer")
print("presets: fresh-coat, weathered-yard")
print(f"preview sha256: {rendered_hash}")
