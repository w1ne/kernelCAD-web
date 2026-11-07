#!/usr/bin/env python3
"""Verify the locally generated static catalog pages for this kit."""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
OUT = Path(sys.argv[1]).resolve()
index = json.loads((ROOT / 'catalog' / 'index.json').read_text())
assets = [asset for asset in index['assets'] if asset['kit'] == 'retail-store']
hub = OUT / 'catalog' / 'index.html'
hub_text = hub.read_text() if hub.is_file() else ''
missing = []
for asset in assets:
    page = OUT / 'catalog' / 'retail-store' / asset['id'] / 'index.html'
    preview = OUT / 'catalog' / 'retail-store' / asset['id'] / 'preview.png'
    source_preview = ROOT / 'catalog' / 'kits' / 'retail-store' / 'previews' / f"{asset['id']}.png"
    text = page.read_text() if page.is_file() else ''
    if not page.is_file():
        missing.append(f'{asset["id"]}: page missing')
    if not preview.is_file():
        missing.append(f'{asset["id"]}: copied preview missing')
    if asset['title'] not in text or 'Open in Studio' not in text or 'scale' not in text or 'color' not in text:
        missing.append(f'{asset["id"]}: title, Studio link or parameter labels missing')
    if preview.is_file() and source_preview.is_file():
        if hashlib.sha256(preview.read_bytes()).hexdigest() != hashlib.sha256(source_preview.read_bytes()).hexdigest():
            missing.append(f'{asset["id"]}: page preview bytes differ from catalog preview')
if 'retail-store' not in hub_text:
    missing.append('catalog hub does not list retail-store')
result = {
    'command': 'npx tsx scripts/buildCatalogPages.ts /tmp/kernelcad-retail-store-pages',
    'kitPages': len(assets),
    'assetsInIndex': len(index['assets']),
    'pageAndPreviewPairs': sum(1 for asset in assets if (OUT / 'catalog' / 'retail-store' / asset['id'] / 'index.html').is_file() and (OUT / 'catalog' / 'retail-store' / asset['id'] / 'preview.png').is_file()),
    'hubListsKit': 'retail-store' in hub_text,
    'missing': missing,
    'passed': len(assets) == 48 and not missing,
}
(BUNDLE / 'catalog-pages-check.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
if not result['passed']:
    raise SystemExit(1)
