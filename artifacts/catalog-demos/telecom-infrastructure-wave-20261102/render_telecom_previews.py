#!/usr/bin/env python3
import json, subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parents[3]
ids = [a['id'] for a in json.loads((ROOT/'catalog/index.json').read_text())['assets'] if a['kit']=='telecom-infrastructure']
if len(ids) != 56: raise SystemExit(f'expected 56 assets, got {len(ids)}')
subprocess.run(['npx','tsx','scripts/renderCatalogPreviews.ts',*ids],cwd=ROOT,check=True)
