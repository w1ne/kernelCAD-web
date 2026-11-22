#!/usr/bin/env python3
"""Check the generated local catalog hub and every airfield asset page."""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
if len(sys.argv) != 2:
    raise SystemExit('usage: verify_airfield_pages.py <catalog-page-output-dir>')
page_root = Path(sys.argv[1]).resolve()
index = json.loads((ROOT / 'catalog/index.json').read_text())
assets = sorted((asset for asset in index['assets'] if asset['kit'] == 'airfield'), key=lambda asset: asset['id'])
hub = (page_root / 'catalog/index.html').read_text()
if 'Airfield' not in hub or '(40)' not in hub:
    raise SystemExit('local catalog hub is missing the airfield kit or its 40-entry count')
rows = []
for asset in assets:
    folder = page_root / 'catalog' / 'airfield' / asset['id']
    html = (folder / 'index.html').read_text()
    preview = folder / 'preview.png'
    expected_preview = ROOT / 'catalog/kits/airfield/previews' / f"{asset['id']}.png"
    preview_hash = hashlib.sha256(preview.read_bytes()).hexdigest()
    expected_hash = hashlib.sha256(expected_preview.read_bytes()).hexdigest()
    labels = [param.get('label', param['name']) for param in asset['params']]
    if asset['title'] not in html or 'Open in Studio' not in html or 'Knobs' not in html:
        raise SystemExit(f"{asset['id']} page is missing title, Studio link or knob section")
    if any(label not in html for label in labels):
        raise SystemExit(f"{asset['id']} page does not display every knob label")
    if preview_hash != expected_hash:
        raise SystemExit(f"{asset['id']} copied preview does not match the committed catalog image")
    rows.append({
        'id': asset['id'],
        'titlePresent': True,
        'studioLinkPresent': True,
        'knobLabels': labels,
        'previewSha256': preview_hash,
        'pageSha256': hashlib.sha256(html.encode()).hexdigest(),
    })
(OUT / 'catalog-pages-check.json').write_text(json.dumps({
    'kit': 'airfield',
    'assetCount': len(rows),
    'catalogTotal': len(index['assets']),
    'hubKitCountPresent': True,
    'localOutput': str(page_root),
    'liveDeploymentChecked': False,
    'pages': rows,
}, indent=2) + '\n')
print(f"verified local airfield hub and {len(rows)} pages; copied previews match; deployment not checked")
