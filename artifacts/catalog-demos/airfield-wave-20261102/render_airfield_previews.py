#!/usr/bin/env python3
"""Render committed catalog previews for the generated airfield kit."""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
index = json.loads((ROOT / 'catalog/index.json').read_text())
ids = [asset['id'] for asset in index['assets'] if asset['kit'] == 'airfield']
if len(ids) != 40:
    raise SystemExit(f'expected 40 airfield assets in the generated index, found {len(ids)}')
subprocess.run(['npx', 'tsx', 'scripts/renderCatalogPreviews.ts', *ids], cwd=ROOT, check=True)
