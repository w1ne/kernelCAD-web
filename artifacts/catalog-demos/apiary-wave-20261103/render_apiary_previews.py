#!/usr/bin/env python3
"""Render only the indexed preview assets from the apiary kit."""

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
index = json.loads((ROOT / "catalog" / "index.json").read_text())
asset_ids = [asset["id"] for asset in index["assets"] if asset["kit"] == "apiary"]
if len(asset_ids) != 50:
    raise SystemExit(f"expected 50 indexed apiary assets, found {len(asset_ids)}")
subprocess.run(["npx", "tsx", "scripts/renderCatalogPreviews.ts", *asset_ids], cwd=ROOT, check=True)
