#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Verify the catalog index hashes and rendered previews after regeneration."""
from __future__ import annotations
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent

def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main() -> None:
    index = json.loads((ROOT / 'catalog/index.json').read_text(encoding='utf-8'))
    mismatched_sources, missing_previews = [], []
    rows = {(row['kit'], row['id']): row for row in index['assets']}
    for row in index['assets']:
        source = ROOT / row['source']
        preview = ROOT / 'catalog/kits' / row['kit'] / 'previews' / f"{row['id']}.png"
        if row.get('sourceSha256') != sha256(source): mismatched_sources.append(row['source'])
        if not row.get('preview') or not preview.is_file(): missing_previews.append(f"{row['kit']}/{row['id']}")
    if mismatched_sources or missing_previews:
        raise SystemExit(f'catalog mismatch: hashes={mismatched_sources[:8]}, previews={missing_previews[:8]}')
    row = rows[('beverage-bottling-line', 'cap-elevator')]
    preview = ROOT / 'catalog/kits/beverage-bottling-line/previews/cap-elevator.png'
    record = {
        'invocation': 'python3 artifacts/catalog-demos/beverage-cap-elevator-semantic-review-20261110/verify_asset_index.py',
        'catalogAssets': len(index['assets']), 'catalogKits': len(index['kits']),
        'allSourceHashesMatch': True, 'allPreviewsPresent': True,
        'refreshedKitPreviewCount': sum(row['kit'] == 'beverage-bottling-line' for row in index['assets']),
        'changedAsset': {
            'sourceSha256': sha256(ROOT / row['source']), 'previewSha256': sha256(preview),
            'indexedPreview': row['preview'], 'triangles': row['stats']['triangles'],
            'triangleBudget': row['triangleBudget'], 'params': [p['name'] for p in row['params']],
            'presets': sorted(row.get('presets', {})),
        },
    }
    (BUNDLE / 'index-verification.json').write_text(json.dumps(record, indent=2) + '\n', encoding='utf-8')
    print(f"Verified {len(index['assets'])} source hashes and previews; beverage kit has {record['refreshedKitPreviewCount']} indexed assets.")

if __name__ == '__main__': main()
