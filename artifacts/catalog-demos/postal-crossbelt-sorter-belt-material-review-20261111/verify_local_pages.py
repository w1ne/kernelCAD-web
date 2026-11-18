#!/usr/bin/env python3
"""Check the generated local catalog detail page and copied preview."""

from __future__ import annotations

import hashlib
from pathlib import Path


PAGE = Path('/tmp/kernelcad-postal-crossbelt-material-review/catalog/postal-logistics/crossbelt-sorter-section/index.html')
PREVIEW = PAGE.parent / 'preview.png'
SOURCE_PREVIEW = Path('catalog/kits/postal-logistics/previews/crossbelt-sorter-section.png')

html = PAGE.read_text(encoding='utf-8')
checks = {
    'title': '<h1>Crossbelt sorter section</h1>' in html,
    'rubber control': 'beltRubber' in html and 'Conveyor-belt rubber' in html,
    'default color': '#30373b' in html,
    'weathered preset': '#3d3d39' in html,
    'high-visibility preset': '#252b2e' in html,
    'preview image copied': PREVIEW.is_file(),
}
source_sha = hashlib.sha256(SOURCE_PREVIEW.read_bytes()).hexdigest()
page_preview_sha = hashlib.sha256(PREVIEW.read_bytes()).hexdigest()
checks['preview hash matches source'] = source_sha == page_preview_sha
if not all(checks.values()):
    raise SystemExit(f'local catalog page verification failed: {checks}')
print('Local crossbelt detail page contains the rubber control, both preset values, and copied preview.')
print(f'Preview sha256: {page_preview_sha}')
print(f'Checks: {checks}')
