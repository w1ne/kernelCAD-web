#!/usr/bin/env python3
"""Render only the 40 generated music asset previews from the current index."""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
index = json.loads((ROOT / 'catalog' / 'index.json').read_text())
ids = sorted(asset['id'] for asset in index['assets'] if asset['kit'] == 'music')
if len(ids) != 40:
    raise SystemExit(f'expected 40 music ids in catalog/index.json, found {len(ids)}')
subprocess.run(['npx', 'tsx', 'scripts/renderCatalogPreviews.ts', *ids], cwd=ROOT, check=True)
