#!/usr/bin/env python3
"""Record mesh evidence and write the Marine kit README from the generated index."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
INDEX = json.loads((ROOT / 'catalog' / 'index.json').read_text())
ASSETS = [a for a in INDEX['assets'] if a['kit'] == 'marine']
if len(ASSETS) != 40:
    raise SystemExit(f'expected 40 marine records, found {len(ASSETS)}')
records = []
for asset in ASSETS:
    source = ROOT / asset['source']
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    if digest != asset['sourceSha256']:
        raise SystemExit(f'{asset["id"]}: indexed source hash mismatch')
    knobs = [p['name'] for p in asset['params']]
    if knobs != ['scale', 'color']:
        raise SystemExit(f'{asset["id"]}: unexpected knobs {knobs}')
    stats = asset['stats']
    if stats['materials'] != 1 or not 0 < stats['triangles'] <= asset['triangleBudget']:
        raise SystemExit(f'{asset["id"]}: material or triangle gate failed')
    if abs(stats['minUpM']) > 1e-6:
        raise SystemExit(f'{asset["id"]}: base-origin gate failed ({stats["minUpM"]})')
    records.append({
        'id': asset['id'], 'source': asset['source'], 'sourceSha256': digest,
        'knobs': knobs, 'triangles': stats['triangles'],
        'triangleBudget': asset['triangleBudget'], 'materials': stats['materials'],
        'minUpM': stats['minUpM'],
    })
checks = {
    'checkedAt': '2026-11-02', 'kit': 'marine', 'totalAssets': len(INDEX['assets']),
    'kitAssets': len(ASSETS), 'passed': len(records), 'total': len(records),
    'catalogIndexSource': 'catalog/index.json',
    'verificationCommands': [
        'python3 artifacts/catalog-demos/marine-wave-20261102/generate_marine_assets.py',
        'npx tsx scripts/buildAssetCatalog.ts', 'npx eslint catalog/',
        'npx vitest run tests/integration/catalog/',
    ],
    'auditScope': 'Each source builds to a non-empty one-material mesh within its indexed triangle budget, opens with exactly scale and color knobs, and has base origin.',
    'triangleRange': [min(a['stats']['triangles'] for a in ASSETS), max(a['stats']['triangles'] for a in ASSETS)],
    'assets': records,
}
(BUNDLE / 'asset-check-results.json').write_text(json.dumps(checks, indent=2) + '\n')
lines = [
    '# Marine kit', '',
    'Forty original low-poly nautical assets for safety, dockside work, navigation, fishing and harbor scenes. Sources are authored in kernelCAD in millimetres, Z up, with a base origin at z = 0. Every asset exposes editable `scale` and `color` controls and exports as one material under its triangle budget. These stylized scene props do not claim seaworthiness, flotation, navigation or hardware acceptance.', '',
    'The [marine wave demo bundle](../../../artifacts/catalog-demos/marine-wave-20261102/README.md) retains source, capture settings, local verification evidence and an inspected MP4.', '',
    '| id | asset | description | knobs | triangles |', '| --- | --- | --- | --- | ---: |',
]
for asset in ASSETS:
    lines.append(f'| `{asset["id"]}` | {asset["title"]} | {asset["description"]} | scale · color | {asset["stats"]["triangles"]} |')
lines += [
    '', '## Rebuild and verify', '', '```sh',
    'python3 artifacts/catalog-demos/marine-wave-20261102/generate_marine_assets.py',
    'npx tsx scripts/buildAssetCatalog.ts', 'npx eslint catalog/',
    'npx vitest run tests/integration/catalog/',
    'python3 artifacts/catalog-demos/marine-wave-20261102/render_marine_previews.py',
    'npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-marine-pages',
    'python3 artifacts/catalog-demos/marine-wave-20261102/record_marine_checks.py',
    'python3 artifacts/catalog-demos/marine-wave-20261102/verify_marine_pages.py /tmp/kernelcad-marine-pages',
    'python3 artifacts/catalog-demos/marine-wave-20261102/capture_marine_demo.py',
    'python3 artifacts/catalog-demos/marine-wave-20261102/inspect_marine_video.py --manual-inspection-passed',
    '```', '', '## Licence and provenance', '',
    'Every asset and any export from it are dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Geometry is modeled from scratch with kernelCAD primitives. No downloaded, traced, converted or decimated meshes, textures or palettes are included.', '',
]
(ROOT / 'catalog' / 'kits' / 'marine' / 'README.md').write_text('\n'.join(lines))
print(f'recorded {len(records)}/{len(ASSETS)} marine checks; catalog total {len(INDEX["assets"])}')
