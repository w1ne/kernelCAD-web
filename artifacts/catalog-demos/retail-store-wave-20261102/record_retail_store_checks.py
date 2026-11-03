#!/usr/bin/env python3
"""Record source/index/mesh checks and the catalog integration test summary."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
index = json.loads((ROOT / 'catalog' / 'index.json').read_text())
assets = [asset for asset in index['assets'] if asset['kit'] == 'retail-store']
checks = []
for asset in assets:
    source = ROOT / asset['source']
    params = {param['name'] for param in asset['params']}
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    stats = asset.get('stats', {})
    reasons = []
    if source_hash != asset['sourceSha256']:
        reasons.append('sourceSha256 differs from index')
    if params != {'scale', 'color'}:
        reasons.append(f'expected scale+color knobs, got {sorted(params)}')
    if not stats.get('triangles') or stats['triangles'] > asset['triangleBudget']:
        reasons.append('triangle count missing or over budget')
    if stats.get('materials') != 1:
        reasons.append(f"expected one material, got {stats.get('materials')}")
    if stats.get('minUpM') is None or abs(stats['minUpM']) > 1e-6:
        reasons.append(f"expected floor origin minUpM=0, got {stats.get('minUpM')}")
    checks.append({
        'id': asset['id'], 'sourceSha256Matches': source_hash == asset['sourceSha256'],
        'knobs': sorted(params), 'triangles': stats.get('triangles'),
        'triangleBudget': asset['triangleBudget'], 'materials': stats.get('materials'),
        'minUpM': stats.get('minUpM'), 'sizeM': stats.get('sizeM'),
        'passed': not reasons, 'reasons': reasons,
    })

test_output = (BUNDLE / 'catalog-test-output.txt').read_text()
test_files = re.search(r'Test Files\s+(\d+) passed', test_output)
tests = re.search(r'Tests\s+(\d+) passed', test_output)
duration = re.search(r'Duration\s+([0-9.]+)s', test_output)
test_passed = bool(test_files and tests and 'FAIL' not in test_output)
if not test_passed:
    raise SystemExit('catalog-test-output.txt does not contain a passing Vitest summary')
test_result = {
    'checkedAt': '2026-11-02', 'command': 'npx vitest run tests/integration/catalog/',
    'status': 'passed', 'filesPassed': int(test_files.group(1)),
    'testsPassed': int(tests.group(1)), 'durationSeconds': float(duration.group(1)) if duration else None,
    'scope': 'All catalog assets build to a mesh inside triangle budget on one material, open in Studio with exactly indexed knobs, and the generated index is fresh.',
}
(BUNDLE / 'catalog-tests.json').write_text(json.dumps(test_result, indent=2) + '\n')
triangles = [item['triangles'] for item in checks if item['triangles'] is not None]
result = {
    'kit': 'retail-store', 'added': len(assets), 'catalogTotal': len(index['assets']),
    'passed': sum(1 for item in checks if item['passed']), 'total': len(checks),
    'triangleRange': [min(triangles), max(triangles)] if triangles else None,
    'allOneMaterial': all(item['materials'] == 1 for item in checks),
    'allWithinBudget': all(item['triangles'] is not None and item['triangles'] <= item['triangleBudget'] for item in checks),
    'allBaseOrigin': all(item['minUpM'] is not None and abs(item['minUpM']) <= 1e-6 for item in checks),
    'integration': {'passed': test_passed, 'filesPassed': int(test_files.group(1)), 'testsPassed': int(tests.group(1)), 'durationSeconds': test_result['durationSeconds']},
    'assets': checks,
}
(BUNDLE / 'asset-check-results.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({key: value for key, value in result.items() if key != 'assets'}, indent=2))
if result['passed'] != len(assets) or not result['allOneMaterial'] or not result['allWithinBudget'] or not result['allBaseOrigin']:
    raise SystemExit('one or more retail-store mesh checks failed')
