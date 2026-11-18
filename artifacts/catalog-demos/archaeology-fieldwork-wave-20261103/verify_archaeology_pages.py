#!/usr/bin/env python3
"""Verify generated local catalog detail pages for archaeology assets."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
out = Path(sys.argv[1]).resolve()
index = json.loads((ROOT / 'catalog' / 'index.json').read_text())
rows = [asset for asset in index['assets'] if asset['kit'] == 'archaeology-fieldwork']
missing = []
for asset in rows:
    base = out / 'catalog' / asset['kit'] / asset['id']
    for path in (base / 'index.html', base / 'preview.png'):
        if not path.is_file():
            missing.append(str(path))
    if (base / 'index.html').is_file():
        html = (base / 'index.html').read_text()
        for token in (asset['title'], *(param['name'] for param in asset['params'])):
            if token not in html:
                missing.append(f'{base}: missing {token}')
hub = out / 'catalog' / 'index.html'
if not hub.is_file() or 'archaeology-fieldwork' not in hub.read_text():
    missing.append('hub does not list archaeology-fieldwork')
result = {
    'command': 'npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-archaeology-fieldwork-pages',
    'kitPages': len(rows),
    'assetsInIndex': len(index['assets']),
    'pageAndPreviewPairs': sum(
        (out / 'catalog' / asset['kit'] / asset['id'] / 'index.html').is_file()
        and (out / 'catalog' / asset['kit'] / asset['id'] / 'preview.png').is_file()
        for asset in rows
    ),
    'hubListsKit': hub.is_file() and 'archaeology-fieldwork' in hub.read_text(),
    'missing': missing,
    'passed': len(rows) == 50 and not missing,
}
(BUNDLE / 'catalog-pages-check.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
if not result['passed']:
    raise SystemExit(1)
