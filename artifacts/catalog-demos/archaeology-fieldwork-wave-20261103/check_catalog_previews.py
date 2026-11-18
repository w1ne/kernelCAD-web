#!/usr/bin/env python3
"""Check that every indexed asset has a catalog preview file."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
index = json.loads((ROOT / 'catalog' / 'index.json').read_text())
assets = index['assets']
missing_field = [asset['id'] for asset in assets if not asset.get('preview')]
missing_file = []
for asset in assets:
    source = ROOT / asset['source']
    preview = source.parent / 'previews' / f"{asset['id']}.png"
    if not preview.is_file():
        missing_file.append(str(preview.relative_to(ROOT)))
png_count = sum(1 for _ in (ROOT / 'catalog' / 'kits').glob('*/previews/*.png'))
result = {
    'indexedAssets': len(assets),
    'assetsWithPreviewField': len(assets) - len(missing_field),
    'previewPngFiles': png_count,
    'missingPreviewField': missing_field,
    'missingPreviewFiles': missing_file,
    'passed': not missing_field and not missing_file and png_count == len(assets),
}
(BUNDLE / 'catalog-wide-preview-check.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
if not result['passed']:
    raise SystemExit(1)
