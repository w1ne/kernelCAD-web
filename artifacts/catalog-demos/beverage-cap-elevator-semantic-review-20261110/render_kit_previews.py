#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Run the repository catalog renderer for every ID in this kit."""
from __future__ import annotations
import json
import subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parents[3]
KIT = 'beverage-bottling-line'
def main() -> None:
    index = json.loads((ROOT / 'catalog/index.json').read_text(encoding='utf-8'))
    ids = [row['id'] for row in index['assets'] if row['kit'] == KIT]
    if not ids: raise SystemExit(f'no indexed assets found for {KIT}')
    command = ['npx', 'tsx', 'scripts/renderCatalogPreviews.ts', *ids]
    print(f'Rendering {len(ids)} {KIT} previews from catalog/index.json')
    subprocess.run(command, cwd=ROOT, check=True)
if __name__ == '__main__': main()
