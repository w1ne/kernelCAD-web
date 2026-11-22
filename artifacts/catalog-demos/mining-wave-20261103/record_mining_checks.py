#!/usr/bin/env python3
"""Record source, preview, mesh, and integration evidence for the mining kit."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
index = json.loads((ROOT / 'catalog' / 'index.json').read_text())
rows = [asset for asset in index['assets'] if asset['kit'] == 'mining']
log = (BUNDLE / 'catalog-test-output.txt').read_text()
files_match = re.search(r'Test Files\s+(\d+) passed', log)
tests_match = re.search(r'Tests\s+(\d+) passed', log)
duration_match = re.search(r'Duration\s+([\d.]+)s', log)
if not (files_match and tests_match and duration_match):
    raise SystemExit('catalog integration summary missing from test output')

checks = []
for asset in rows:
    source = ROOT / asset['source']
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    preview_path = ROOT / 'catalog' / 'kits' / asset['kit'] / 'previews' / f"{asset['id']}.png"
    checks.append({
        'id': asset['id'],
        'triangles': asset['stats']['triangles'],
        'triangleBudget': asset['triangleBudget'],
        'materials': asset['stats']['materials'],
        'minUpM': asset['stats']['minUpM'],
        'knobs': [param['name'] for param in asset['params']],
        'preview': asset.get('preview'),
        'previewFileExists': preview_path.is_file(),
        'sourceSha256Matches': source_hash == asset['sourceSha256'],
        'passed': (
            source_hash == asset['sourceSha256']
            and asset.get('preview') == f"/assets/mining-{asset['id']}.png"
            and preview_path.is_file()
            and [param['name'] for param in asset['params']] == ['scale', 'color']
            and asset['stats']['materials'] == 1
            and asset['stats']['minUpM'] == 0
            and asset['stats']['triangles'] <= asset['triangleBudget']
        ),
    })

all_rows = index['assets']
preview_check = {
    'catalogTotal': len(all_rows),
    'assetsWithPreviewField': sum(bool(asset.get('preview')) for asset in all_rows),
    'assetsWithRenderedPreviewFile': sum(
        (ROOT / 'catalog' / 'kits' / asset['kit'] / 'previews' / f"{asset['id']}.png").is_file()
        for asset in all_rows
    ),
    'allAssetsPreviewBacked': all(bool(asset.get('preview')) for asset in all_rows),
    'allPreviewFilesExist': all(
        (ROOT / 'catalog' / 'kits' / asset['kit'] / 'previews' / f"{asset['id']}.png").is_file()
        for asset in all_rows
    ),
}
(BUNDLE / 'index-preview-check.json').write_text(json.dumps(preview_check, indent=2) + '\n')

lint = json.loads((BUNDLE / 'catalog-eslint.json').read_text())
pages = json.loads((BUNDLE / 'catalog-pages-check.json').read_text())
live = json.loads((BUNDLE / 'live-website-check.json').read_text())
package_boundary = json.loads((BUNDLE / 'npm-pack-contents-check.json').read_text())
numbers = [row['triangles'] for row in checks]
result = {
    'kit': 'mining',
    'added': len(rows),
    'catalogTotal': len(all_rows),
    'passed': sum(row['passed'] for row in checks),
    'total': len(rows),
    'triangleRange': [min(numbers), max(numbers)] if numbers else [],
    'allOneMaterial': all(row['materials'] == 1 for row in checks),
    'allWithinBudget': all(row['triangles'] <= row['triangleBudget'] for row in checks),
    'allBaseOrigin': all(row['minUpM'] == 0 for row in checks),
    'allKnobsExact': all(row['knobs'] == ['scale', 'color'] for row in checks),
    'allSourceHashesMatch': all(row['sourceSha256Matches'] for row in checks),
    'allPreviewPathsAndFilesPresent': all(row['previewFileExists'] and row['preview'] for row in checks),
    'allCatalogAssetsPreviewBacked': preview_check['allAssetsPreviewBacked'] and preview_check['allPreviewFilesExist'],
    'lint': lint,
    'pages': pages,
    'liveWebsiteSnapshot': {
        'homepageStatus': live['homepageStatus'],
        'livePreviewAssets': live['assetsWithPreview'],
        'branchDeployed': False,
    },
    'npmPackageBoundary': package_boundary,
    'integration': {
        'passed': True,
        'filesPassed': int(files_match.group(1)),
        'testsPassed': int(tests_match.group(1)),
        'durationSeconds': float(duration_match.group(1)),
    },
    'assets': checks,
}
(BUNDLE / 'asset-check-results.json').write_text(json.dumps(result, indent=2) + '\n')
(BUNDLE / 'catalog-tests.json').write_text(json.dumps({
    'command': 'npx vitest run tests/integration/catalog/',
    'status': 'passed',
    'filesPassed': result['integration']['filesPassed'],
    'testsPassed': result['integration']['testsPassed'],
    'durationSeconds': result['integration']['durationSeconds'],
}, indent=2) + '\n')
print(json.dumps({key: value for key, value in result.items() if key != 'assets'}, indent=2))
if not (
    result['added'] == 50
    and result['passed'] == 50
    and result['allCatalogAssetsPreviewBacked']
    and result['integration']['passed']
    and result['lint']['passed']
    and result['pages']['passed']
    and result['npmPackageBoundary']['passed']
):
    raise SystemExit(1)
