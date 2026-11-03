#!/usr/bin/env python3
"""Verify that local static catalog pages include all EV kit previews."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
OUT = Path(sys.argv[1]).resolve()
index = json.loads((ROOT / 'catalog' / 'index.json').read_text())
assets = [row for row in index['assets'] if row['kit'] == 'ev-charging-infrastructure']
checks = []
for row in assets:
    page = OUT / 'catalog' / row['kit'] / row['id'] / 'index.html'
    preview = OUT / 'catalog' / row['kit'] / row['id'] / 'preview.png'
    html = page.read_text() if page.is_file() else ''
    checks.append({
        'id': row['id'],
        'pageExists': page.is_file(),
        'previewExists': preview.is_file(),
        'pageReferencesPreview': 'preview.png' in html,
        'pageMentionsParameters': all(param['name'] in html for param in row['params']),
    })
result = {
    'command': 'npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-ev-charging-pages',
    'kit': 'ev-charging-infrastructure',
    'assets': len(assets),
    'pagePreviewPairs': sum(item['pageExists'] and item['previewExists'] for item in checks),
    'allParametersListed': all(item['pageMentionsParameters'] for item in checks),
    'passed': bool(assets) and all(all(item[key] for key in ('pageExists', 'previewExists', 'pageReferencesPreview', 'pageMentionsParameters')) for item in checks),
    'checks': checks,
}
(BUNDLE / 'catalog-pages-check.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({key: value for key, value in result.items() if key != 'checks'}, indent=2))
if not result['passed']:
    raise SystemExit(1)
