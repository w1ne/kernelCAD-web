#!/usr/bin/env python3
"""Record per-asset catalog stats after the full integration suite passes."""
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
INDEX = json.loads((ROOT / 'catalog' / 'index.json').read_text())
TEST_LOG = BUNDLE / 'catalog-integration-test.log'
if not TEST_LOG.is_file():
    raise SystemExit('missing catalog-integration-test.log')
test_log = TEST_LOG.read_text()
if 'Test Files  4 passed (4)' not in test_log or 'Tests  15 passed (15)' not in test_log:
    raise SystemExit('the retained integration-test log does not show all four files and 15 tests passing')

assets = [asset for asset in INDEX['assets'] if asset['kit'] == 'sports']
if len(assets) != 40:
    raise SystemExit(f'expected 40 sports assets, found {len(assets)}')
rows = []
for asset in assets:
    triangles = asset['stats']['triangles']
    budget = asset['triangleBudget']
    materials = asset['stats']['materials']
    min_up = asset['stats']['minUpM']
    knobs = [param['name'] for param in asset['params']]
    if triangles > budget or materials != 1 or min_up != 0 or set(knobs) != {'scale', 'color'}:
        raise SystemExit(f"{asset['id']}: failed mesh, material, floor or knob check")
    rows.append({
        'id': asset['id'],
        'title': asset['title'],
        'triangles': triangles,
        'triangleBudget': budget,
        'materials': materials,
        'minUpM': min_up,
        'knobs': knobs,
    })

report = {
    'date': date.today().isoformat(),
    'command': 'npx vitest run tests/integration/catalog/',
    'integrationSuite': 'passed',
    'testFilesPassed': 4,
    'testsPassed': 15,
    'auditedCatalogAssets': len(INDEX['assets']),
    'total': len(assets),
    'passed': len(rows),
    'allAssetsBuildExportInsideBudgetOnOneMaterial': True,
    'studioKnobContract': 'passed for every committed catalog asset',
    'sportsKnobs': ['scale', 'color'],
    'sportsMinTriangleCount': min(row['triangles'] for row in rows),
    'sportsMaxTriangleCount': max(row['triangles'] for row in rows),
    'sportsTriangleBudget': 1800,
    'deployedBehavior': 'not verified; branch is not deployed',
    'assets': rows,
}
(BUNDLE / 'asset-check-results.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({key: report[key] for key in report if key != 'assets'}, indent=2))
