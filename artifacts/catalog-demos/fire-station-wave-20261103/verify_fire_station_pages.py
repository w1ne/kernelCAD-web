#!/usr/bin/env python3
"""Check the generated local hub and every fire-station detail page."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
OUT = Path('/tmp/kernelcad-fire-station-catalog-pages')
index = json.loads((ROOT / 'catalog' / 'index.json').read_text())
assets = [row for row in index['assets'] if row['kit'] == 'fire-station']
hub_path = OUT / 'catalog' / 'index.html'
failures = []
checked = []

if not hub_path.is_file():
    failures.append('generated catalog hub is missing')
else:
    hub = hub_path.read_text()
    if 'fire-station' not in hub or 'Search the catalog' not in hub:
        failures.append('hub is missing the kit or searchable catalog finder')
    if f"{len(index['assets'])} free CC0 low-poly 3D models in {len(index['kits'])} kits" not in hub:
        failures.append('hub summary does not match the generated index')

if len(assets) != 70:
    failures.append(f'expected 70 kit rows, found {len(assets)}')
for asset in assets:
    page_path = OUT / 'catalog' / asset['kit'] / asset['id'] / 'index.html'
    preview_path = OUT / 'catalog' / asset['kit'] / asset['id'] / 'preview.png'
    source_preview = ROOT / 'catalog' / 'kits' / asset['kit'] / 'previews' / f"{asset['id']}.png"
    if not page_path.is_file():
        failures.append(f"{asset['id']}: generated detail page is missing")
        continue
    page = page_path.read_text()
    if asset['title'] not in page:
        failures.append(f"{asset['id']}: title is missing from detail page")
    for knob in ('scale', 'color'):
        if f'<code>{knob}</code>' not in page:
            failures.append(f"{asset['id']}: {knob} control is missing from detail page")
    if not preview_path.is_file() or not source_preview.is_file():
        failures.append(f"{asset['id']}: detail or source preview is missing")
    elif hashlib.sha256(preview_path.read_bytes()).digest() != hashlib.sha256(source_preview.read_bytes()).digest():
        failures.append(f"{asset['id']}: detail preview copy differs from source preview")
    checked.append(asset['id'])

result = {
    'generatedOutput': str(OUT),
    'assetsInIndex': len(index['assets']),
    'kitsInIndex': len(index['kits']),
    'kitPagesExpected': 70,
    'kitPagesChecked': len(checked),
    'previewCopiesChecked': len(checked),
    'hubHasKitAndFinder': not any('hub' in failure for failure in failures),
    'failures': failures,
}
(BUNDLE / 'catalog-pages-check.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
if failures:
    raise SystemExit(1)
