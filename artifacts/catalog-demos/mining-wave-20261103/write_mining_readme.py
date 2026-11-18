#!/usr/bin/env python3
"""Write the public mining kit handoff from the audited generated index."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
index = json.loads((ROOT / 'catalog' / 'index.json').read_text())
assets = [row for row in index['assets'] if row['kit'] == 'mining']
if len(assets) != 50:
    raise SystemExit(f'expected 50 mining assets, found {len(assets)}')
for asset in assets:
    if asset.get('preview') != f"/assets/mining-{asset['id']}.png":
        raise SystemExit(f"{asset['id']}: missing homepage preview path")
    if [param['name'] for param in asset['params']] != ['scale', 'color']:
        raise SystemExit(f"{asset['id']}: unexpected knobs {asset['params']}")
    if asset['stats']['materials'] != 1 or asset['stats']['triangles'] > asset['triangleBudget']:
        raise SystemExit(f"{asset['id']}: failed mesh audit")

triangles = [asset['stats']['triangles'] for asset in assets]
lines = [
    '# Mining and mineral-processing kit',
    '',
    'Fifty original low-poly props cover underground equipment, mine-site handling, and representative mineral-processing stages. Each model uses millimetres, Z up, a base origin at z = 0, one material, and editable `scale` and `color` controls. The audited exports range from '
    + f'{min(triangles)} to {max(triangles)} triangles and remain within their 1,800-triangle budgets.',
    '',
    'The generated index assigns every asset its homepage rail preview URL. This branch has not been deployed, so the public rail has not yet been checked with this kit. The [mining wave demo bundle](../../../artifacts/catalog-demos/mining-wave-20261103/README.md) retains the generator, settings, source and package audits, local page verification, and visually inspected MP4.',
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
    'Every asset is dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). These are stylized scene props. They make no claims about mining throughput, equipment performance, safety certification, structural suitability, installation, or physical acceptance.',
    '',
])
(ROOT / 'catalog' / 'kits' / 'mining' / 'README.md').write_text('\n'.join(lines))
print(f"wrote catalog/kits/mining/README.md for {len(assets)} audited assets")
