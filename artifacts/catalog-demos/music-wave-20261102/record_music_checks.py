#!/usr/bin/env python3
"""Record catalog-index evidence and write the music kit's readable overview."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
INDEX = json.loads((ROOT / 'catalog' / 'index.json').read_text())
ASSETS = [asset for asset in INDEX['assets'] if asset['kit'] == 'music']
if len(ASSETS) != 40:
    raise SystemExit(f'expected 40 music assets in catalog index, found {len(ASSETS)}')

records = []
for asset in ASSETS:
    source = ROOT / asset['source']
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    if source_hash != asset['sourceSha256']:
        raise SystemExit(f'{asset["id"]}: index source hash does not match source')
    knobs = [param['name'] for param in asset['params']]
    if knobs != ['scale', 'color']:
        raise SystemExit(f'{asset["id"]}: expected exactly scale + color knobs, got {knobs}')
    if asset['stats']['materials'] != 1:
        raise SystemExit(f'{asset["id"]}: expected one material, got {asset["stats"]["materials"]}')
    if not 0 < asset['stats']['triangles'] <= asset['triangleBudget']:
        raise SystemExit(f'{asset["id"]}: invalid triangle count/budget')
    if abs(asset['stats']['minUpM']) > 1e-6:
        raise SystemExit(f'{asset["id"]}: base-origin mesh starts above/below zero')
    records.append({
        'id': asset['id'],
        'source': asset['source'],
        'sourceSha256': source_hash,
        'knobs': knobs,
        'triangles': asset['stats']['triangles'],
        'triangleBudget': asset['triangleBudget'],
        'materials': asset['stats']['materials'],
        'minUpM': asset['stats']['minUpM'],
    })

kit = next(kit for kit in INDEX['kits'] if kit['id'] == 'music')
checks = {
    'checkedAt': '2026-11-02',
    'kit': 'music',
    'totalAssets': len(INDEX['assets']),
    'assetCount': len(ASSETS),
    'passed': len(records),
    'total': len(records),
    'catalogIndexSource': 'catalog/index.json',
    'verificationCommands': [
        'npx tsx scripts/buildAssetCatalog.ts',
        'npx eslint catalog/',
        'npx vitest run tests/integration/catalog/',
    ],
    'auditScope': 'All music asset sources build to a non-empty, one-material mesh inside the indexed triangle budget; each has exactly scale and color knobs and base origin.',
    'assets': records,
}
(BUNDLE / 'asset-check-results.json').write_text(json.dumps(checks, indent=2) + '\n')

lines = [
    '# Music kit',
    '',
    'Forty original low-poly assets for orchestra, band, rehearsal and stage scenes. Sources are authored in kernelCAD in millimetres, Z up, with a base origin at z = 0. Every asset exposes editable `scale` and `color` controls and exports as one material under its triangle budget. These stylized scene props do not claim acoustic, performance or instrument certification.',
    '',
    'The [music wave demo bundle](../../../artifacts/catalog-demos/music-wave-20261102/README.md) retains source, capture settings, local verification evidence and an inspected MP4.',
    '',
    '| id | asset | description | knobs | triangles |',
    '| --- | --- | --- | --- | ---: |',
]
for asset in ASSETS:
    lines.append(f'| `{asset["id"]}` | {asset["title"]} | {asset["description"]} | scale · color | {asset["stats"]["triangles"]} |')
lines += [
    '',
    '## Rebuild and verify',
    '',
    '```sh',
    'python3 artifacts/catalog-demos/music-wave-20261102/generate_music_assets.py',
    'npx tsx scripts/buildAssetCatalog.ts',
    'npx eslint catalog/',
    'npx vitest run tests/integration/catalog/',
    'python3 artifacts/catalog-demos/music-wave-20261102/render_music_previews.py',
    'npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-music-catalog-pages',
    'python3 artifacts/catalog-demos/music-wave-20261102/record_music_checks.py',
    'python3 artifacts/catalog-demos/music-wave-20261102/capture_music_demo.py',
    'python3 artifacts/catalog-demos/music-wave-20261102/inspect_music_video.py',
    '```',
    '',
    '## Licence and provenance',
    '',
    'Every asset and any export from it are dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Geometry is modeled from scratch with kernelCAD primitives. No downloaded, traced, converted or decimated meshes, textures or palettes are included.',
    '',
]
(ROOT / 'catalog' / 'kits' / 'music' / 'README.md').write_text('\n'.join(lines))
print(f'recorded {len(records)}/{len(ASSETS)} indexed music asset checks; total catalog {len(INDEX["assets"])}')
