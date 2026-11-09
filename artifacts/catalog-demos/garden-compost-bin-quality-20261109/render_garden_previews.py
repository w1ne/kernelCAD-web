#!/usr/bin/env python3
"""Render every garden asset listed in the current generated catalog index."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
index = json.loads((ROOT / "catalog/index.json").read_text(encoding="utf-8"))
ids = [asset["id"] for asset in index["assets"] if asset["kit"] == "garden"]
if len(ids) != 40:
    raise SystemExit(f"Expected 40 garden assets, found {len(ids)}")
subprocess.run(["npx", "tsx", "scripts/renderCatalogPreviews.ts", *ids], cwd=ROOT, check=True)
