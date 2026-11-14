#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Check the generated local page, controls, presets, and copied preview."""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
PAGE_DIR = ROOT / 'site-build/catalog/beverage-bottling-line/cap-elevator'
def sha256(path: Path) -> str: return hashlib.sha256(path.read_bytes()).hexdigest()
def main() -> None:
    page, preview = PAGE_DIR / 'index.html', PAGE_DIR / 'preview.png'
    if not page.is_file() or not preview.is_file(): raise SystemExit('local asset page or copied preview is missing')
    markup = page.read_text(encoding='utf-8')
    expected = ['stainlessSteel', 'powderCoat', 'foodPolymer', 'beltRubber', 'sanitaryLine', 'legacyPlant']
    missing = [token for token in expected if token not in markup]
    if missing: raise SystemExit(f'local page is missing expected controls/presets: {missing}')
    source_preview = ROOT / 'catalog/kits/beverage-bottling-line/previews/cap-elevator.png'
    if sha256(preview) != sha256(source_preview): raise SystemExit('local page preview hash does not match current catalog preview')
    record = {
        'invocation': 'python3 artifacts/catalog-demos/beverage-cap-elevator-semantic-review-20261110/verify_local_pages.py',
        'scope': 'generated local static page only; not deployed behavior', 'page': str(page.relative_to(ROOT)),
        'copiedPreviewSha256': sha256(preview), 'controlsAndPresets': expected,
        'studioLinkPresent': 'https://app.kernelcad.com/studio' in markup,
    }
    (BUNDLE / 'local-page-check.json').write_text(json.dumps(record, indent=2) + '\n', encoding='utf-8')
    print('Verified generated local cap-elevator page, four color controls, two presets, and matching preview hash.')
if __name__ == '__main__': main()
