#!/usr/bin/env python3
"""Write the public data-center kit handoff from the generated index."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
index = json.loads((ROOT / 'catalog' / 'index.json').read_text())
assets = [row for row in index['assets'] if row['kit'] == 'data-center-infrastructure']
if len(assets) != 50:
    raise SystemExit(f'expected 50 assets, found {len(assets)}')
for asset in assets:
    if asset.get('preview') != f"/assets/data-center-infrastructure-{asset['id']}.png":
        raise SystemExit(f"{asset['id']}: missing homepage preview URL")
    if [param['name'] for param in asset['params']] != ['scale', 'color']:
        raise SystemExit(f"{asset['id']}: unexpected knobs")
    if asset['origin'] != 'base' or asset['stats']['minUpM'] != 0:
        raise SystemExit(f"{asset['id']}: failed base-origin audit")
    if asset['stats']['materials'] != 1 or asset['stats']['triangles'] > asset['triangleBudget']:
        raise SystemExit(f"{asset['id']}: failed mesh audit")

triangles = [asset['stats']['triangles'] for asset in assets]
lines = [
    '# Data-center infrastructure kit',
    '',
    'Fifty original, generic low-poly props cover IT racks and chassis, raised-floor and containment parts, power distribution, cooling loops, monitoring, and room safety. Each model uses millimetres, Z up, a base origin at z = 0, one material, and editable `scale` and `color` controls. Audited exports range from '
    + f'{min(triangles)} to {max(triangles)} triangles, within the 2,200-triangle budgets.',
    '',
    'The generated index assigns each asset a homepage-rail preview URL. This branch is not deployed, so public visibility of these new assets remains unverified. The [data-center wave demo bundle](../../../artifacts/catalog-demos/data-center-wave-20261103/README.md) retains the generator, settings, audits, local page checks, and visually inspected MP4.',
    '',
    '| id | asset | description | knobs | triangles |',
    '| --- | --- | --- | --- | ---: |',
]
for asset in assets:
    knobs = ' · '.join(param['name'] for param in asset['params'])
    description = asset['description'].replace('|', '\\|')
    lines.append(f"| `{asset['id']}` | {asset['title']} | {description} | {knobs} | {asset['stats']['triangles']} |")
lines.extend([
    '',
    '## License and scope',
    '',
    'Every model is original geometry dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). These are generic scene props, not vendor product replicas, engineering designs, capacity guarantees, electrical or cooling plans, safety approvals, or physical-acceptance evidence.',
    '',
])
(ROOT / 'catalog' / 'kits' / 'data-center-infrastructure' / 'README.md').write_text('\n'.join(lines))
print(f'wrote README for {len(assets)} audited assets')
