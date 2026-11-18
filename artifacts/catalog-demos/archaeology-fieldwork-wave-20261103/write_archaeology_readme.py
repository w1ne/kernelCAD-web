#!/usr/bin/env python3
"""Write the archaeology kit reference table from the generated catalog index."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / 'catalog' / 'kits' / 'archaeology-fieldwork'
index = json.loads((ROOT / 'catalog' / 'index.json').read_text())
rows = sorted((row for row in index['assets'] if row['kit'] == 'archaeology-fieldwork'), key=lambda row: row['id'])
if len(rows) != 50 or not all(row.get('preview') for row in rows):
    raise SystemExit('expected 50 indexed archaeology fieldwork assets with previews')

lines = [
    '# Archaeology fieldwork kit',
    '',
    'Low-poly, single-material scene props for excavation layout, surveying, careful soil removal, screening, sample handling, site records, and field photography. Models are original kernelCAD sources at approximate real-world scale; each exposes overall scale and asset color controls.',
    '',
    '| id | asset | description | knobs | triangles | preview |',
    '| --- | --- | --- | --- | ---: | --- |',
]
for row in rows:
    description = row['description'].replace(' Knobs: overall scale and asset color.', '')
    lines.append(f"| `{row['id']}` | {row['title']} | {description} | scale, color | {row['stats']['triangles']} | [PNG](previews/{row['id']}.png) |")
lines.extend([
    '',
    '## License and source',
    '',
    'Every source in this kit is original generic geometry dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). No scanned, downloaded, or converted meshes are used. The models are scene props and are not archaeological protocol, calibrated survey instruments, historical reconstructions, or field equipment specifications.',
    '',
    '## Demo and evidence',
    '',
    'See the [archaeology fieldwork wave bundle](../../../artifacts/catalog-demos/archaeology-fieldwork-wave-20261103/README.md) for the MP4 walkthrough, retained source generator and settings, audit results, catalog pages, preview checks, package boundary review, and video inspection. Local checks do not establish deployed behavior or field acceptance.',
    '',
])
(KIT / 'README.md').write_text('\n'.join(lines))
print(f'wrote {KIT / "README.md"} ({len(rows)} assets)')
