#!/usr/bin/env python3
"""Audit the 50 new sources against the generated catalog index and previews."""
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / 'catalog' / 'kits' / 'beverage-bottling-line'
INDEX = json.loads((ROOT / 'catalog' / 'index.json').read_text())
spec = importlib.util.spec_from_file_location('bottling_assets', BUNDLE / 'generate_bottling_assets.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
expected = {asset[0] for asset in module.ASSETS}
rows = {row['id']: row for row in INDEX['assets'] if row['kit'] == 'beverage-bottling-line'}
failures = []
triangles = []
origin_offsets = []

if len(expected) != 50:
    failures.append(f'generator lists {len(expected)} assets, expected 50')
if set(rows) != expected:
    failures.append(f'index ids differ: missing={sorted(expected - set(rows))}, extra={sorted(set(rows) - expected)}')
kit_row = next((kit for kit in INDEX['kits'] if kit['id'] == 'beverage-bottling-line'), None)
if kit_row is None or set(kit_row['assets']) != expected:
    failures.append('index kit row does not list the same 50 ids')

for asset_id in sorted(expected & set(rows)):
    row = rows[asset_id]
    source_path = ROOT / row['source']
    preview_path = KIT / 'previews' / f'{asset_id}.png'
    source_sha = hashlib.sha256(source_path.read_bytes()).hexdigest()
    if source_sha != row['sourceSha256']:
        failures.append(f'{asset_id}: sourceSha256 is stale')
    if not preview_path.is_file() or row.get('preview') != f'/assets/beverage-bottling-line-{asset_id}.png':
        failures.append(f'{asset_id}: rendered preview path is missing')
    if not preview_path.is_file() or preview_path.stat().st_size < 500:
        failures.append(f'{asset_id}: preview is absent or unexpectedly small')
    if not row['stats']['triangles']:
        failures.append(f'{asset_id}: mesh has no triangles')
    if row['stats']['triangles'] > row['triangleBudget']:
        failures.append(f"{asset_id}: {row['stats']['triangles']} triangles exceed {row['triangleBudget']}")
    if row['stats']['materials'] != 1:
        failures.append(f"{asset_id}: expected one material, got {row['stats']['materials']}")
    param_names = {param['name'] for param in row['params']}
    if param_names != {'scale', 'body', 'accent'}:
        failures.append(f'{asset_id}: expected scale/body/accent knobs, got {sorted(param_names)}')
    if row['origin'] != 'base':
        failures.append(f"{asset_id}: expected base origin, got {row['origin']}")
    triangles.append(row['stats']['triangles'])
    origin_offsets.append(row['stats']['minUpM'])

if len(triangles) != 50:
    failures.append(f'only {len(triangles)} assets were measured')
if origin_offsets and max(abs(value) for value in origin_offsets) > 0.001:
    failures.append(f'mesh bases are not at z=0 (max offset {max(abs(value) for value in origin_offsets):.4f} m)')

result = {
    'kit': 'beverage-bottling-line',
    'assetsExpected': len(expected),
    'assetsIndexed': len(rows),
    'assetsAudited': len(triangles),
    'totalCatalogAssets': len(INDEX['assets']),
    'totalKits': len(INDEX['kits']),
    'triangles': {'min': min(triangles, default=0), 'max': max(triangles, default=0)},
    'materialsPerAsset': sorted({rows[key]['stats']['materials'] for key in rows}),
    'paramNamesPerAsset': ['scale', 'body', 'accent'],
    'previewFiles': sum((KIT / 'previews' / f'{asset_id}.png').is_file() for asset_id in expected),
    'sourceHashesMatch': not any('sourceSha256' in failure for failure in failures),
    'baseOffsetRangeM': [min(origin_offsets, default=0), max(origin_offsets, default=0)],
    'failures': failures,
}
(BUNDLE / 'asset-check-results.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
if failures:
    raise SystemExit(1)
