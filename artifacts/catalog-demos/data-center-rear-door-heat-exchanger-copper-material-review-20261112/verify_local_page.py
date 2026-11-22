#!/usr/bin/env python3
"""Verify the generated local asset page exposes the new copper control."""
import hashlib
from pathlib import Path
import sys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OUT = Path(sys.argv[1]).resolve()
PAGE = OUT / "catalog/data-center-infrastructure/rear-door-heat-exchanger/index.html"
PREVIEW = OUT / "catalog/data-center-infrastructure/rear-door-heat-exchanger/preview.png"
EXPECTED_PREVIEW = ROOT / "catalog/kits/data-center-infrastructure/previews/rear-door-heat-exchanger.png"

html = PAGE.read_text(encoding="utf-8")
for expected in [
    "Rear-door heat exchanger",
    "steel",
    "polymer",
    "copper",
    "Heat-exchanger copper",
    "#bd7748",
    "facilityStandard",
    "highVisibility",
]:
    assert expected in html, f"missing {expected} from local asset page"
assert PREVIEW.is_file()
rendered_hash = hashlib.sha256(PREVIEW.read_bytes()).hexdigest()
expected_hash = hashlib.sha256(EXPECTED_PREVIEW.read_bytes()).hexdigest()
assert rendered_hash == expected_hash, "local page copied a stale preview"
print(f"local page: {PAGE}")
print("color controls: steel, polymer, copper")
print("presets: facilityStandard, highVisibility")
print(f"preview sha256: {rendered_hash}")
