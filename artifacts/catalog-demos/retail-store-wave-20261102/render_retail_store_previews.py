#!/usr/bin/env python3
"""Render only the retail-store assets in the current generated catalog index."""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
index = json.loads((ROOT / 'catalog' / 'index.json').read_text())
ids = sorted(asset['id'] for asset in index['assets'] if asset['kit'] == 'retail-store')
if len(ids) != 48:
    raise SystemExit(f'expected 48 retail-store ids, found {len(ids)}')
subprocess.run(['npx', 'tsx', 'scripts/renderCatalogPreviews.ts', *ids], cwd=ROOT, check=True)
