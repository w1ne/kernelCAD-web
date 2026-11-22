#!/usr/bin/env python3
"""Render the fire-station previews through the catalog preview command."""
import json
import os
import subprocess
import sys
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
index = json.loads((ROOT / 'catalog' / 'index.json').read_text())
ids = [row['id'] for row in index['assets'] if row['kit'] == 'fire-station']
if len(ids) != 70:
    raise SystemExit(f'expected 70 fire-station index rows, found {len(ids)}')
env = os.environ.copy()
env['PATH'] = '/home/andrii/.nvm/versions/node/v22.23.4/bin:' + env.get('PATH', '')
command = [
    sys.executable, str(BUNDLE / 'run_with_occt_cjs_compat.py'), '--output',
    'previews-render-output.txt', '--', 'npx', 'tsx', 'scripts/renderCatalogPreviews.ts', *ids,
]
subprocess.run(command, cwd=ROOT, env=env, check=True)
missing = [asset_id for asset_id in ids if not (ROOT / 'catalog' / 'kits' / 'fire-station' / 'previews' / f'{asset_id}.png').is_file()]
if missing:
    raise SystemExit(f'missing rendered previews: {missing}')
print(f'rendered {len(ids)} fire-station previews')
