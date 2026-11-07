#!/usr/bin/env python3
"""Record index-level airfield checks and generate its public kit README."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
INDEX = ROOT / 'catalog/index.json'
KIT = ROOT / 'catalog/kits/airfield'
OUTPUT = Path(__file__).resolve().parent
index = json.loads(INDEX.read_text())
assets = sorted((asset for asset in index['assets'] if asset['kit'] == 'airfield'), key=lambda asset: asset['id'])
if len(assets) != 40:
    raise SystemExit(f'expected 40 airfield assets in the index, found {len(assets)}')

rows = []
for asset in assets:
    source = ROOT / asset['source']
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    params = [param['name'] for param in asset['params']]
    triangles = asset['stats']['triangles']
    budget = asset['triangleBudget']
    material_count = asset['stats']['materials']
    if params != ['scale', 'color']:
        raise SystemExit(f"{asset['id']} exposes unexpected knobs: {params}")
    if triangles <= 0 or triangles > budget:
        raise SystemExit(f"{asset['id']} triangle count {triangles} exceeds budget {budget}")
    if material_count != 1:
        raise SystemExit(f"{asset['id']} has {material_count} materials")
    rows.append({
        'id': asset['id'],
        'title': asset['title'],
        'source': asset['source'],
        'sourceSha256': digest,
        'params': params,
        'triangles': triangles,
        'triangleBudget': budget,
        'materialCount': material_count,
    })

readme = [
    '# Airfield kit',
    '',
    'Forty original low-poly aircraft, apron service vehicles and airport fixtures for airfield scenes. Sources are authored in kernelCAD in millimetres, Z up, with editable overall scale and color controls. Every asset exports one material and remains inside its 1,800-triangle budget. These are stylized scene props, not operational or airworthiness models.',
    '',
    'The [airfield wave demo bundle](../../../artifacts/catalog-demos/airfield-wave-20261102/README.md) retains source, capture settings, local verification evidence, generated-page checks and an inspected MP4.',
    '',
    '| id | asset | description | knobs | triangles | preview |',
    '| --- | --- | --- | --- | ---: | --- |',
]
for asset in assets:
    title = asset['title'].replace('|', '\\|')
    description = asset['description'].replace('|', '\\|')
    readme.append(f"| `{asset['id']}` | {title} | {description} | scale · color | {asset['stats']['triangles']} | [view](previews/{asset['id']}.png) |")
readme += [
    '',
    '## Rebuild and verify',
    '',
    '```sh',
    'python3 artifacts/catalog-demos/airfield-wave-20261102/generate_airfield_assets.py',
    'npx tsx scripts/buildAssetCatalog.ts',
    'npx eslint catalog/',
    'npx vitest run tests/integration/catalog/',
    'python3 artifacts/catalog-demos/airfield-wave-20261102/render_airfield_previews.py',
    'npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-airfield-catalog-pages',
    'python3 artifacts/catalog-demos/airfield-wave-20261102/record_airfield_checks.py',
    'python3 artifacts/catalog-demos/airfield-wave-20261102/capture_airfield_demo.py',
    'python3 artifacts/catalog-demos/airfield-wave-20261102/inspect_airfield_video.py',
    '```',
    '',
    '## Licence and provenance',
    '',
    'Every asset and export from it are dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Geometry is authored from scratch with kernelCAD primitives. No downloaded, traced, converted or decimated meshes, textures or palettes are included.',
    '',
]
(KIT / 'README.md').write_text('\n'.join(readme))
(OUTPUT / 'asset-check-results.json').write_text(json.dumps({
    'kit': 'airfield',
    'assetCount': len(rows),
    'catalogTotal': len(index['assets']),
    'knobs': ['scale', 'color'],
    'allMeshesPresent': all(row['triangles'] > 0 for row in rows),
    'allInsideTriangleBudget': all(row['triangles'] <= row['triangleBudget'] for row in rows),
    'allSingleMaterial': all(row['materialCount'] == 1 for row in rows),
    'assets': rows,
}, indent=2) + '\n')
print(f"recorded {len(rows)} airfield assets from catalog index (total {len(index['assets'])})")
