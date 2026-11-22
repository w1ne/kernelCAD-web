#!/usr/bin/env python3
"""Verify each locally generated music catalog page and its copied preview."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
OUT = Path(sys.argv[1]).resolve()
INDEX = json.loads((ROOT / 'catalog' / 'index.json').read_text())
assets = [asset for asset in INDEX['assets'] if asset['kit'] == 'music']
page_rows = []
for asset in assets:
    page_dir = OUT / 'catalog' / 'music' / asset['id']
    page = page_dir / 'index.html'
    preview = page_dir / 'preview.png'
    if not page.is_file() or not preview.is_file():
        raise SystemExit(f'missing generated page or preview for {asset["id"]}')
    html = page.read_text()
    for required in (asset['title'], 'Knobs', 'scale', 'color', 'Open in Studio'):
        if required not in html:
            raise SystemExit(f'{asset["id"]}: generated page is missing {required!r}')
    page_rows.append({'id': asset['id'], 'path': str(page.relative_to(OUT)), 'previewBytes': preview.stat().st_size})

hub = (OUT / 'catalog' / 'index.html').read_text()
if f'{len(assets)}' not in hub or 'Music instruments' not in hub:
    raise SystemExit('catalog hub does not list the music kit count and title')
check = {
    'checkedAt': '2026-11-02',
    'kit': 'music',
    'musicPages': len(page_rows),
    'hubContainsKit': True,
    'pages': page_rows,
    'localPageGenerator': 'scripts/buildCatalogPages.ts',
    'liveRouteStatus': 'unverified pending merge',
    'deploymentVerified': False,
}
(BUNDLE / 'catalog-pages-check.json').write_text(json.dumps(check, indent=2) + '\n')
print(f'verified {len(page_rows)} local music catalog pages and previews')
