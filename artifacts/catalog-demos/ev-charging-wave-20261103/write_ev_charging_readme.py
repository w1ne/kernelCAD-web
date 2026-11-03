#!/usr/bin/env python3
"""Generate the public EV charging kit handoff from its audited index rows."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / 'catalog' / 'kits' / 'ev-charging-infrastructure'
index = json.loads((ROOT / 'catalog' / 'index.json').read_text())
assets = sorted((row for row in index['assets'] if row['kit'] == 'ev-charging-infrastructure'), key=lambda row: row['id'])
if len(assets) != 50 or not all(row.get('preview') for row in assets):
    raise SystemExit('write the kit handoff only after all 50 indexed preview paths exist')
triangles = [row['stats']['triangles'] for row in assets]
lines = [
    '# EV charging infrastructure kit',
    '',
    'Fifty original, generic low-poly props cover AC and DC charging equipment, generic connector forms, cable routing, site electrical cabinets and controls, parking fixtures, canopies, and fleet equipment. Each source is an editable `.kcad.ts` model in millimetres with Z up and a base origin. The `scale` knob ranges from 0.70 to 1.30; `color` sets the single material. Audited exports range from '
    f"{min(triangles)} to {max(triangles)} triangles, under the 2,400-triangle budget.",
    '',
    'Every indexed asset has a generated preview path for the homepage asset rail. This branch is not deployed, so public visibility of this kit remains unverified. The [EV charging wave demo bundle](../../../artifacts/catalog-demos/ev-charging-wave-20261103/README.md) retains the generator, settings, audits, local page checks, and visually inspected MP4.',
    '',
    '| id | asset | description | knobs | triangles |',
    '| --- | --- | --- | --- | ---: |',
]
for row in assets:
    short = row['description'].replace('|', '\\|')
    lines.append(f"| `{row['id']}` | {row['title']} | {short} | scale · color | {row['stats']['triangles']} |")
lines += [
    '',
    '## License and scope',
    '',
    'Every model is original geometry dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). These are generic scene props, not vendor product replicas, electrical designs, charging-performance guarantees, installation plans, safety approvals, or physical-acceptance evidence.',
    '',
]
(KIT / 'README.md').write_text('\n'.join(lines))
print(f'wrote {KIT / "README.md"} with {len(assets)} assets')
