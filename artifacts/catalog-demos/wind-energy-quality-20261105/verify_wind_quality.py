#!/usr/bin/env python3
"""Verify source hashes, material controls, previews, budgets, and local pages."""

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
PAGES = Path('/tmp/kernelcad-wind-pages')
index = json.loads((ROOT / 'catalog/index.json').read_text())
rows = [row for row in index['assets'] if row['kit'] == 'wind-energy']
failures = []
asset_results = []

if len(rows) != 50:
    failures.append(f'expected 50 wind-energy assets, got {len(rows)}')

for row in rows:
    source = ROOT / row['source']
    source_bytes = source.read_bytes()
    digest = hashlib.sha256(source_bytes).hexdigest()
    source_text = source_bytes.decode('utf-8')
    material_params = [p for p in row['params'] if p['type'] == 'color']
    used_colours = set(__import__('re').findall(r'\.color\(([A-Za-z_]\w*)\)', source_text))
    preset_count = len(__import__('re').findall(r'\bpresets\s*\(', source_text))
    preview = ROOT / 'catalog/kits/wind-energy/previews' / f"{row['id']}.png"
    page_dir = PAGES / 'catalog' / 'wind-energy' / row['id']
    page_html = page_dir / 'index.html'
    page_preview = page_dir / 'preview.png'
    if digest != row['sourceSha256']:
        failures.append(f"{row['id']}: sourceSha256 differs")
    if not 2 <= len(material_params) <= 4 or set(p['name'] for p in material_params) != used_colours:
        failures.append(f"{row['id']}: material controls do not match used colour parts")
    if preset_count != 1 or len(row['presets']) < 2:
        failures.append(f"{row['id']}: named presets are missing")
    if not preview.is_file() or row.get('preview') != f"/assets/wind-energy-{row['id']}.png":
        failures.append(f"{row['id']}: preview is absent from the catalog row")
    if row['stats']['triangles'] > row['triangleBudget']:
        failures.append(f"{row['id']}: triangle budget exceeded")
    if not page_html.is_file() or not page_preview.is_file():
        failures.append(f"{row['id']}: generated local page or preview is missing")
    elif row['title'] not in page_html.read_text():
        failures.append(f"{row['id']}: generated page title is missing")
    asset_results.append({
        'id': row['id'],
        'sourceSha256Matches': digest == row['sourceSha256'],
        'materialControls': len(material_params),
        'presetVariants': len(row['presets']),
        'previewExists': preview.is_file(),
        'triangles': row['stats']['triangles'],
        'triangleBudget': row['triangleBudget'],
        'localPageExists': page_html.is_file(),
    })

hub = PAGES / 'catalog' / 'index.html'
hub_lists_kit = hub.is_file() and 'wind-energy' in hub.read_text()
if not hub_lists_kit:
    failures.append('generated catalog hub does not list wind-energy')

result = {
    'checkedAt': datetime.now(timezone.utc).isoformat(),
    'command': 'npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-wind-pages',
    'assetsChecked': len(rows),
    'assetsInFullIndex': len(index['assets']),
    'allSourceHashesMatch': all(item['sourceSha256Matches'] for item in asset_results),
    'previewsPresent': sum(item['previewExists'] for item in asset_results),
    'localPagesPresent': sum(item['localPageExists'] for item in asset_results),
    'hubListsKit': hub_lists_kit,
    'assets': asset_results,
    'failures': failures,
    'passed': not failures,
    'deploymentVerified': False,
}
(BUNDLE / 'verification.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({k: v for k, v in result.items() if k != 'assets'}, indent=2))
if failures:
    raise SystemExit(1)
