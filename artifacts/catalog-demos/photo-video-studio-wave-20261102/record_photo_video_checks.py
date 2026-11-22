#!/usr/bin/env python3
"""Record indexed mesh evidence and write the human-readable kit README."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
INDEX = json.loads((ROOT / 'catalog' / 'index.json').read_text())
ASSETS = [asset for asset in INDEX['assets'] if asset['kit'] == 'photo-video-studio']
if len(ASSETS) != 40:
    raise SystemExit(f'expected 40 kit records, found {len(ASSETS)}')
records = []
for asset in ASSETS:
    source = ROOT / asset['source']
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    if digest != asset['sourceSha256']:
        raise SystemExit(f'{asset["id"]}: index source hash mismatch')
    knobs = [param['name'] for param in asset['params']]
    if knobs != ['scale', 'color']:
        raise SystemExit(f'{asset["id"]}: expected scale and color, got {knobs}')
    stats = asset['stats']
    if stats['materials'] != 1 or not 0 < stats['triangles'] <= asset['triangleBudget']:
        raise SystemExit(f'{asset["id"]}: material/triangle audit failed: {stats}')
    if abs(stats['minUpM']) > 1e-6:
        raise SystemExit(f'{asset["id"]}: base origin audit failed: minUpM={stats["minUpM"]}')
    records.append({
        'id': asset['id'], 'source': asset['source'], 'sourceSha256': digest,
        'knobs': knobs, 'triangles': stats['triangles'],
        'triangleBudget': asset['triangleBudget'], 'materials': stats['materials'],
        'minUpM': stats['minUpM'],
    })
checks = {
    'checkedAt': '2026-11-02', 'kit': 'photo-video-studio',
    'totalAssets': len(INDEX['assets']), 'kitAssets': len(ASSETS),
    'passed': len(records), 'total': len(records),
    'catalogIndexSource': 'catalog/index.json',
    'verificationCommands': [
        'python3 artifacts/catalog-demos/photo-video-studio-wave-20261102/generate_photo_video_assets.py',
        'npx tsx scripts/buildAssetCatalog.ts', 'npx eslint catalog/',
        'npx vitest run tests/integration/catalog/',
    ],
    'auditScope': 'Each source builds to a non-empty one-material mesh within its indexed triangle budget, opens with exactly scale and color knobs, and has base origin.',
    'triangleRange': [min(a['stats']['triangles'] for a in ASSETS), max(a['stats']['triangles'] for a in ASSETS)],
    'assets': records,
}
(BUNDLE / 'asset-check-results.json').write_text(json.dumps(checks, indent=2) + '\n')
kit = next(kit for kit in INDEX['kits'] if kit['id'] == 'photo-video-studio')
lines = [
    '# Photo and video studio kit', '',
    'Forty original low-poly assets for camera, optics, photo lighting, camera support and production scenes. Sources are authored in kernelCAD in millimetres, Z up, with a base origin at z = 0. Every asset exposes editable `scale` and `color` controls and exports as one material under its triangle budget. These stylized scene props do not claim optical accuracy, lighting performance, camera operation or hardware acceptance.', '',
    'The [photo/video studio wave demo bundle](../../../artifacts/catalog-demos/photo-video-studio-wave-20261102/README.md) retains source, capture settings, local verification evidence and an inspected MP4.', '',
    '| id | asset | description | knobs | triangles |', '| --- | --- | --- | --- | ---: |',
]
for asset in ASSETS:
    lines.append(f'| `{asset["id"]}` | {asset["title"]} | {asset["description"]} | scale · color | {asset["stats"]["triangles"]} |')
lines += [
    '', '## Rebuild and verify', '', '```sh',
    'python3 artifacts/catalog-demos/photo-video-studio-wave-20261102/generate_photo_video_assets.py',
    'npx tsx scripts/buildAssetCatalog.ts', 'npx eslint catalog/',
    'npx vitest run tests/integration/catalog/',
    'python3 artifacts/catalog-demos/photo-video-studio-wave-20261102/render_photo_video_previews.py',
    'npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-photo-video-pages',
    'python3 artifacts/catalog-demos/photo-video-studio-wave-20261102/record_photo_video_checks.py',
    'python3 artifacts/catalog-demos/photo-video-studio-wave-20261102/verify_photo_video_pages.py /tmp/kernelcad-photo-video-pages',
    'python3 artifacts/catalog-demos/photo-video-studio-wave-20261102/capture_photo_video_demo.py',
    'python3 artifacts/catalog-demos/photo-video-studio-wave-20261102/inspect_photo_video_video.py --manual-inspection-passed',
    '```', '', '## Licence and provenance', '',
    'Every asset and any export from it are dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Geometry is modeled from scratch with kernelCAD primitives. No downloaded, traced, converted or decimated meshes, textures or palettes are included.', '',
]
(ROOT / 'catalog' / 'kits' / 'photo-video-studio' / 'README.md').write_text('\n'.join(lines))
print(f'recorded {len(records)}/{len(ASSETS)} checked kit assets; catalog total {len(INDEX["assets"])}')
