#!/usr/bin/env python3
"""Verify locally generated hub and detail pages for the new kit."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
OUT = Path('/tmp/kernelcad-beverage-bottling-catalog-pages')
index = json.loads((ROOT / 'catalog' / 'index.json').read_text())
assets = [asset for asset in index['assets'] if asset['kit'] == 'beverage-bottling-line']
hub = (OUT / 'catalog' / 'index.html').read_text()
failures = []
checked = []

if len(assets) != 50:
    failures.append(f'expected 50 kit rows, found {len(assets)}')
if 'Beverage bottling line' not in hub:
    failures.append('catalog hub does not include the kit title')
catalog_summary = f"{len(index['assets'])} free CC0 low-poly 3D models in {len(index['kits'])} kits"
if 'Search the catalog' not in hub or catalog_summary not in hub:
    failures.append('catalog hub does not include the finder and current model count')

for asset in assets:
    page_path = OUT / 'catalog' / asset['kit'] / asset['id'] / 'index.html'
    preview_path = OUT / 'catalog' / asset['kit'] / asset['id'] / 'preview.png'
    source_preview = ROOT / 'catalog' / 'kits' / asset['kit'] / 'previews' / f"{asset['id']}.png"
    if not page_path.is_file():
        failures.append(f'{asset["id"]}: generated detail page is missing')
        continue
    page = page_path.read_text()
    if asset['title'] not in page:
        failures.append(f'{asset["id"]}: title is missing from detail page')
    for knob in ('scale', 'body', 'accent'):
        if f'<code>{knob}</code>' not in page:
            failures.append(f'{asset["id"]}: {knob} knob is missing from detail page')
    if not preview_path.is_file() or not source_preview.is_file():
        failures.append(f'{asset["id"]}: detail preview copy is missing')
    elif hashlib.sha256(preview_path.read_bytes()).digest() != hashlib.sha256(source_preview.read_bytes()).digest():
        failures.append(f'{asset["id"]}: detail preview copy differs from source preview')
    checked.append(asset['id'])

result = {
    'generatedOutput': str(OUT),
    'catalogAssetsInIndex': len(index['assets']),
    'assetsInIndex': len(index['assets']),
    'kitPagesExpected': 50,
    'kitPagesChecked': len(checked),
    'previewCopiesChecked': len(checked),
    'pageAndPreviewPairs': len(checked),
    'hubHasKitAndFinder': not any('hub' in item for item in failures),
    'failures': failures,
}
(BUNDLE / 'catalog-pages-check.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
if failures:
    raise SystemExit(1)
