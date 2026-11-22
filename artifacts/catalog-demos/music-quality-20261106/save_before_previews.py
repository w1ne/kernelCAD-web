#!/usr/bin/env python3
"""Retain the committed pre-promotion previews for honest before/after frames."""

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
BASE_COMMIT = "9c2040309"
OUT = BUNDLE / "before-previews"
OUT.mkdir(parents=True, exist_ok=True)
for asset_id in ("acoustic-guitar", "alto-saxophone", "violin"):
    source = f"catalog/kits/music/previews/{asset_id}.png"
    image = subprocess.check_output(["git", "show", f"{BASE_COMMIT}:{source}"], cwd=ROOT)
    (OUT / f"{asset_id}.png").write_bytes(image)
    print(f"saved {BASE_COMMIT}:{source} -> {OUT / (asset_id + '.png')}")
