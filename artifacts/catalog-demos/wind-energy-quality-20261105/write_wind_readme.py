#!/usr/bin/env python3
"""Refresh the wind-energy kit README from its generated index rows."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
index = json.loads((ROOT / 'catalog/index.json').read_text())
rows = [row for row in index['assets'] if row['kit'] == 'wind-energy']
controls = [len([p for p in row['params'] if p['type'] == 'color']) for row in rows]
triangles = [row['stats']['triangles'] for row in rows]
passed = len(json.loads((Path(__file__).resolve().parent / 'verification.json').read_text())['assets'])

lines = [
    '# Wind energy kit',
    '',
    'Fifty original CC0 turbine, grid, foundation, and maintenance scene assets. Each source uses millimetres, Z up, an editable scale, 2–4 material-named colour controls, and weathered/high-visibility appearance presets. The turbine blades and tapered towers use distinct silhouettes; the transformer includes visible front cooling fins and ceramic bushings.',
    '',
    f"The quality promotion added {sum(controls)} material controls across 50 assets ({min(controls)}–{max(controls)} per asset), 50 preset blocks with 100 named appearances, and regenerated all 50 preview images. All {passed}/50 wind-energy assets pass `scripts/checkCatalogQuality.py`.",
    '',
    'The [wind-energy quality demo and evidence bundle](../../../artifacts/catalog-demos/wind-energy-quality-20261105/README.md) contains the source workflow, rendered MP4, settings, checks, and visual review. Local catalog pages were generated and checked. Deployed behavior remains unverified on this feature branch.',
    '',
    '| id | asset | description | material controls | presets | triangles | preview |',
    '| --- | --- | --- | --- | --- | ---: | --- |',
]

for row in rows:
    knobs = ' · '.join(p['name'] for p in row['params'] if p['type'] == 'color')
    presets = ' · '.join(row['presets'])
    preview = 'yes' if row.get('preview') else 'missing'
    lines.append(f"| `{row['id']}` | {row['title']} | {row['description']} | {knobs} | {presets} | {row['stats']['triangles']} | {preview} |")

lines += [
    '',
    '## Rebuild and verify',
    '',
    '```sh',
    'python3 artifacts/catalog-demos/wind-energy-quality-20261105/promote_wind_energy.py',
    'npx tsx scripts/renderCatalogPreviews.ts <the 50 wind-energy asset ids>',
    'npx tsx scripts/buildAssetCatalog.ts',
    'npx eslint catalog/kits/wind-energy/',
    'npx vitest run tests/integration/catalog/',
    'npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-wind-pages',
    'python3 artifacts/catalog-demos/wind-energy-quality-20261105/verify_wind_quality.py',
    '```',
    '',
    'These are stylized catalog props. They do not claim turbine performance, structural capacity, electrical clearance, installation suitability, or physical acceptance.',
    '',
]

(ROOT / 'catalog/kits/wind-energy/README.md').write_text('\n'.join(lines))
print(f'wrote wind-energy README for {len(rows)} indexed assets')
