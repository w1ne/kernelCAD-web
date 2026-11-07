#!/usr/bin/env python3
"""Record source, mesh, parameter, and preview checks for the archaeology kit."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT_ID = 'archaeology-fieldwork'
index = json.loads((ROOT / 'catalog' / 'index.json').read_text())
rows = [row for row in index['assets'] if row['kit'] == KIT_ID]
missing = []
triangles = []
failed_ids = set()
for row in rows:
    source = ROOT / row['source']
    preview = ROOT / 'catalog' / 'kits' / KIT_ID / 'previews' / f"{row['id']}.png"
    if not source.is_file():
        missing.append(f"missing source: {row['source']}")
        failed_ids.add(row['id'])
    elif hashlib.sha256(source.read_bytes()).hexdigest() != row['sourceSha256']:
        missing.append(f"stale source hash: {row['id']}")
        failed_ids.add(row['id'])
    if not row.get('preview') or not preview.is_file():
        missing.append(f"missing indexed preview: {row['id']}")
        failed_ids.add(row['id'])
    count = row['stats']['triangles']
    triangles.append(count)
    if count > row['triangleBudget']:
        missing.append(f"triangle budget exceeded: {row['id']} ({count}/{row['triangleBudget']})")
        failed_ids.add(row['id'])
    if row['stats']['materials'] != 1:
        missing.append(f"material count is not one: {row['id']} ({row['stats']['materials']})")
        failed_ids.add(row['id'])
    if abs(row['stats']['minUpM']) > 0.0000005:
        missing.append(f"base is not at z=0: {row['id']} ({row['stats']['minUpM']} m)")
        failed_ids.add(row['id'])
    if [param['name'] for param in row['params']] != ['scale', 'color']:
        missing.append(f"unexpected parameter list: {row['id']}")
        failed_ids.add(row['id'])

preview_result = {
    'kit': KIT_ID,
    'assets': len(rows),
    'assetsWithPreviewField': sum(bool(row.get('preview')) for row in rows),
    'previewFiles': sum((ROOT / 'catalog' / 'kits' / KIT_ID / 'previews' / f"{row['id']}.png").is_file() for row in rows),
    'missing': missing,
    'passed': len(rows) == 50 and not missing,
}
mesh_result = {
    'kit': KIT_ID,
    'total': len(rows),
    'passed': len(rows) - len(failed_ids),
    'catalogTotal': len(index['assets']),
    'triangleRange': [min(triangles), max(triangles)] if triangles else [],
    'materialCounts': sorted({row['stats']['materials'] for row in rows}),
    'params': ['scale', 'color'],
    'sourceHashesFresh': not any('source' in entry and ('missing' in entry or 'stale' in entry) for entry in missing),
    'missing': missing,
    'passedAudit': len(rows) == 50 and not missing,
}
(BUNDLE / 'index-preview-check.json').write_text(json.dumps(preview_result, indent=2) + '\n')
(BUNDLE / 'asset-check-results.json').write_text(json.dumps(mesh_result, indent=2) + '\n')
print(json.dumps({'preview': preview_result, 'mesh': mesh_result}, indent=2))
if not preview_result['passed'] or not mesh_result['passedAudit']:
    raise SystemExit(1)
