#!/usr/bin/env python3
"""Record the data-center source, mesh, preview, page, and package audit."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
index = json.loads((ROOT / 'catalog' / 'index.json').read_text())
rows = [asset for asset in index['assets'] if asset['kit'] == 'data-center-infrastructure']
test_log = (BUNDLE / 'catalog-test-output.txt').read_text()
files_match = re.search(r'Test Files\s+(\d+) passed', test_log)
tests_match = re.search(r'Tests\s+(\d+) passed', test_log)
duration_match = re.search(r'Duration\s+([\d.]+)s', test_log)
if not (files_match and tests_match and duration_match):
    raise SystemExit('catalog integration summary is missing')

checks = []
for asset in rows:
    source = ROOT / asset['source']
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    preview_file = ROOT / 'catalog' / 'kits' / asset['kit'] / 'previews' / f"{asset['id']}.png"
    knobs = [param['name'] for param in asset['params']]
    expected_preview = f"/assets/data-center-infrastructure-{asset['id']}.png"
    checks.append({
        'id': asset['id'],
        'triangles': asset['stats']['triangles'],
        'triangleBudget': asset['triangleBudget'],
        'materials': asset['stats']['materials'],
        'minUpM': asset['stats']['minUpM'],
        'knobs': knobs,
        'preview': asset.get('preview'),
        'previewFileExists': preview_file.is_file(),
        'sourceSha256Matches': digest == asset['sourceSha256'],
        'passed': (
            digest == asset['sourceSha256']
            and asset.get('preview') == expected_preview
            and preview_file.is_file()
            and knobs == ['scale', 'color']
            and asset['stats']['materials'] == 1
            and asset['stats']['minUpM'] == 0
            and asset['stats']['triangles'] <= asset['triangleBudget']
        ),
    })

all_assets = index['assets']
preview_check = {
    'catalogTotal': len(all_assets),
    'assetsWithPreviewField': sum(bool(asset.get('preview')) for asset in all_assets),
    'assetsWithRenderedPreviewFile': sum(
        (ROOT / 'catalog' / 'kits' / asset['kit'] / 'previews' / f"{asset['id']}.png").is_file()
        for asset in all_assets
    ),
    'allAssetsPreviewBacked': all(bool(asset.get('preview')) for asset in all_assets),
    'allPreviewFilesExist': all(
        (ROOT / 'catalog' / 'kits' / asset['kit'] / 'previews' / f"{asset['id']}.png").is_file()
        for asset in all_assets
    ),
}
(BUNDLE / 'index-preview-check.json').write_text(json.dumps(preview_check, indent=2) + '\n')
lint = json.loads((BUNDLE / 'catalog-eslint.json').read_text())
pages = json.loads((BUNDLE / 'catalog-pages-check.json').read_text())
live = json.loads((BUNDLE / 'live-website-check.json').read_text())
package_check = json.loads((BUNDLE / 'npm-pack-contents-check.json').read_text())
triangles = [asset['stats']['triangles'] for asset in rows]
result = {
    'kit': 'data-center-infrastructure',
    'added': len(rows),
    'catalogTotal': len(all_assets),
    'passed': sum(item['passed'] for item in checks),
    'total': len(rows),
    'triangleRange': [min(triangles), max(triangles)] if triangles else [],
    'allOneMaterial': all(item['materials'] == 1 for item in checks),
    'allWithinBudget': all(item['triangles'] <= item['triangleBudget'] for item in checks),
    'allBaseOrigin': all(item['minUpM'] == 0 for item in checks),
    'allKnobsExact': all(item['knobs'] == ['scale', 'color'] for item in checks),
    'allSourceHashesMatch': all(item['sourceSha256Matches'] for item in checks),
    'allPreviewPathsAndFilesPresent': all(item['previewFileExists'] and item['preview'] for item in checks),
    'allCatalogAssetsPreviewBacked': preview_check['allAssetsPreviewBacked'] and preview_check['allPreviewFilesExist'],
    'lint': lint,
    'pages': pages,
    'liveWebsiteSnapshot': {
        'homepageStatus': live['homepageStatus'],
        'livePreviewAssets': live['livePreviewAssets'],
        'branchDeployed': False,
    },
    'npmPackageBoundary': package_check,
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
