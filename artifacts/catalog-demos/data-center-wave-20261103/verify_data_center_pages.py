#!/usr/bin/env python3
"""Verify generated local catalog pages and previews for the new kit."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
out = Path(sys.argv[1]).resolve()
index = json.loads((ROOT / 'catalog' / 'index.json').read_text())
rows = [asset for asset in index['assets'] if asset['kit'] == 'data-center-infrastructure']
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
if not hub.is_file() or 'data-center-infrastructure' not in hub.read_text():
    missing.append('hub does not list data-center-infrastructure')
result = {
    'command': 'npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-data-center-pages',
    'kitPages': len(rows),
    'assetsInIndex': len(index['assets']),
    'pageAndPreviewPairs': sum(
        (out / 'catalog' / asset['kit'] / asset['id'] / 'index.html').is_file()
        and (out / 'catalog' / asset['kit'] / asset['id'] / 'preview.png').is_file()
        for asset in rows
    ),
    'hubListsKit': hub.is_file() and 'data-center-infrastructure' in hub.read_text(),
    'missing': missing,
    'passed': not missing,
}
(BUNDLE / 'catalog-pages-check.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
if missing:
    raise SystemExit(1)
