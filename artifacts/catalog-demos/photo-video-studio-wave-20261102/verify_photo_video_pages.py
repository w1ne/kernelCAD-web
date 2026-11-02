#!/usr/bin/env python3
"""Verify generated local catalog pages and copied previews for this kit."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
OUT = Path(sys.argv[1]).resolve()
INDEX = json.loads((ROOT / 'catalog' / 'index.json').read_text())
ASSETS = [asset for asset in INDEX['assets'] if asset['kit'] == 'photo-video-studio']
rows = []
for asset in ASSETS:
    page_dir = OUT / 'catalog' / 'photo-video-studio' / asset['id']
    page, preview = page_dir / 'index.html', page_dir / 'preview.png'
    if not page.is_file() or not preview.is_file():
        raise SystemExit(f'{asset["id"]}: generated page or preview is missing')
    html = page.read_text()
    for required in (asset['title'], 'Knobs', 'scale', 'color', 'Open in Studio'):
        if required not in html:
            raise SystemExit(f'{asset["id"]}: missing {required!r} from generated page')
    rows.append({'id': asset['id'], 'path': str(page.relative_to(OUT)), 'previewBytes': preview.stat().st_size})
hub = (OUT / 'catalog' / 'index.html').read_text()
if 'Photo and video studio' not in hub or '40' not in hub:
    raise SystemExit('catalog hub does not list this kit and its count')
check = {
    'checkedAt': '2026-11-02', 'kit': 'photo-video-studio',
    'kitPages': len(rows), 'hubContainsKit': True, 'pages': rows,
    'localPageGenerator': 'scripts/buildCatalogPages.ts',
    'liveRouteStatus': 'unverified pending merge', 'deploymentVerified': False,
}
(BUNDLE / 'catalog-pages-check.json').write_text(json.dumps(check, indent=2) + '\n')
print(f'verified {len(rows)} local pages and previews; deployment unverified')
