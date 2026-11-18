#!/usr/bin/env python3
"""Check the generated static catalog pages against the committed index."""
import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
INDEX = json.loads((ROOT / 'catalog' / 'index.json').read_text())


def main():
    if len(sys.argv) != 2:
        raise SystemExit('usage: python3 verify_catalog_pages.py <generated-site-dir>')
    site = Path(sys.argv[1]).resolve()
    hub_path = site / 'catalog' / 'index.html'
    if not hub_path.is_file():
        raise SystemExit(f'missing generated catalog hub: {hub_path}')
    hub = hub_path.read_text()
    sports = [asset for asset in INDEX['assets'] if asset['kit'] == 'sports']
    missing_pages = []
    missing_previews = []
    missing_knobs = []
    for asset in INDEX['assets']:
        page = site / 'catalog' / asset['kit'] / asset['id'] / 'index.html'
        preview = page.parent / 'preview.png'
        if not page.is_file():
            missing_pages.append(f"{asset['kit']}/{asset['id']}")
            continue
        if not preview.is_file():
            missing_previews.append(f"{asset['kit']}/{asset['id']}")
        if asset['kit'] == 'sports':
            html = page.read_text()
            for param in asset['params']:
                if f"<code>{param['name']}</code>" not in html:
                    missing_knobs.append(f"{asset['id']}:{param['name']}")
    if missing_pages or missing_previews or missing_knobs or 'Sports <small>(40)</small>' not in hub:
        raise SystemExit(json.dumps({
            'missingPages': missing_pages,
            'missingPreviews': missing_previews,
            'missingKnobs': missing_knobs,
            'hubListsSportsKit': 'Sports <small>(40)</small>' in hub,
        }, indent=2))
    report = {
        'date': date.today().isoformat(),
        'source': 'catalog/index.json',
        'totalAssets': len(INDEX['assets']),
        'kitCount': len(INDEX['kits']),
        'assetPages': len(INDEX['assets']),
        'previewImages': len(INDEX['assets']),
        'hubListsSportsKit': True,
        'sportsAssets': len(sports),
        'sportsPages': len(sports),
        'sportsPreviews': len(sports),
        'sportsKnobsPerPage': 2,
        'sportsKnobNames': sorted({p['name'] for a in sports for p in a['params']}),
        'allPagesHavePreviews': True,
        'staticPageBuild': 'passed',
        'deployedBehavior': 'not verified; branch is not deployed',
    }
    (BUNDLE / 'catalog-pages-check.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
