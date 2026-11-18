#!/usr/bin/env python3
"""Write the public kit overview from the generated catalog index."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT_ID = 'alpine-expedition'
index = json.loads((ROOT / 'catalog' / 'index.json').read_text())
rows = sorted((row for row in index['assets'] if row['kit'] == KIT_ID), key=lambda row: row['id'])
if len(rows) != 50 or not all(row.get('preview') for row in rows):
    raise SystemExit('expected 50 indexed alpine expedition assets with preview paths')

lines = [
    '# Alpine expedition',
    '',
    'Original low-poly scene props for alpine shelters, climbing, snow travel,',
    'avalanche safety, rescue, navigation, and backcountry utilities. Sources',
    'are CC0 1.0 kernelCAD `.kcad.ts` models in millimetres with Z up. Each',
    'asset exposes overall scale and asset color controls and has a generated',
    'catalog preview.',
    '',
    '| id | asset | details | knobs | triangles | preview |',
    '| --- | --- | --- | --- | ---: | --- |',
]
for row in rows:
    description = row['description'].split(' Knobs:')[0].replace('|', '\\|')
    knobs = ', '.join(param['name'] for param in row['params'])
    lines.append(
        f"| [{row['id']}]({row['id']}.kcad.ts) | {row['title']} | {description} | {knobs} | "
        f"{row['stats']['triangles']} | [PNG](previews/{row['id']}.png) |"
    )
lines.extend([
    '',
    '## License and source',
    '',
    'Every source is original kernelCAD geometry dedicated to the public domain',
    'under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). No',
    'downloaded, traced, or converted meshes, brand marks, or textures are used.',
    '',
    '## Demo and evidence',
    '',
    'See the [alpine expedition wave bundle](../../../artifacts/catalog-demos/alpine-expedition-wave-20261103/README.md)',
    'for the MP4 demo, source generator, settings, local audit, preview, page,',
    'package, and video inspection evidence. Local checks do not establish',
    'deployed behavior or physical acceptance.',
    '',
])
(ROOT / 'catalog' / 'kits' / KIT_ID / 'README.md').write_text('\n'.join(lines))
print(f'wrote README for {len(rows)} indexed assets')
