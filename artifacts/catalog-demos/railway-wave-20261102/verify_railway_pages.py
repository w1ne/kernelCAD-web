#!/usr/bin/env python3
"""Verify generated local pages and copied previews for the railway kit."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
OUT = Path(sys.argv[1]).resolve()
INDEX = json.loads((ROOT / 'catalog' / 'index.json').read_text())
ASSETS = [a for a in INDEX['assets'] if a['kit'] == 'railway']
rows = []
for asset in ASSETS:
    page_dir = OUT / 'catalog' / 'railway' / asset['id']
    page, preview = page_dir / 'index.html', page_dir / 'preview.png'
    if not page.is_file() or not preview.is_file():
        raise SystemExit(f'{asset["id"]}: missing generated page or preview')
    html = page.read_text()
    for required in (asset['title'], 'Knobs', 'scale', 'color', 'Open in Studio'):
        if required not in html:
            raise SystemExit(f'{asset["id"]}: missing {required!r}')
    rows.append({'id': asset['id'], 'path': str(page.relative_to(OUT)), 'previewBytes': preview.stat().st_size})
hub = (OUT / 'catalog' / 'index.html').read_text()
if 'Railway' not in hub or '40' not in hub:
    raise SystemExit('catalog hub omits railway kit or count')
report = {
    'checkedAt': '2026-11-02', 'kit': 'railway', 'kitPages': len(rows),
    'hubContainsKit': True, 'pages': rows,
    'localPageGenerator': 'scripts/buildCatalogPages.ts',
    'liveRouteStatus': 'unverified pending merge', 'deploymentVerified': False,
}
(BUNDLE / 'catalog-pages-check.json').write_text(json.dumps(report, indent=2) + '\n')
print(f'verified {len(rows)} local railway pages and previews; deployment unverified')
