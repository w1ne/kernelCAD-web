#!/usr/bin/env python3
"""Render only the 40 railway catalog previews from the current index."""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
index = json.loads((ROOT / 'catalog' / 'index.json').read_text())
ids = sorted(a['id'] for a in index['assets'] if a['kit'] == 'railway')
if len(ids) != 40:
    raise SystemExit(f'expected 40 railway assets, found {len(ids)}')
subprocess.run(['npx', 'tsx', 'scripts/renderCatalogPreviews.ts', *ids], cwd=ROOT, check=True)
