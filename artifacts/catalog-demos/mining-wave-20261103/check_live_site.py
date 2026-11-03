#!/usr/bin/env python3
"""Capture the current live marketing-site state without claiming this branch."""
import json
from datetime import datetime, timezone
from pathlib import Path
import subprocess

BUNDLE = Path(__file__).resolve().parent
BASE = 'https://kernelcad.com'


def get(url):
    response = subprocess.run(
        ['curl', '-L', '--max-time', '25', '-sS', '-w', '\\n%{http_code}', url],
        check=True,
        capture_output=True,
    ).stdout
    body, status = response.rsplit(b'\n', 1)
    return int(status), body


homepage_status, homepage = get(f'{BASE}/')
assets_status, assets_body = get(f'{BASE}/assets.json')
catalog_status, _ = get(f'{BASE}/catalog/')
assets_doc = json.loads(assets_body) if assets_status == 200 else {'assets': []}
assets = assets_doc.get('assets', [])
result = {
    'checkedAt': datetime.now(timezone.utc).isoformat(),
    'command': 'curl -L --max-time 25 -sS -w "\\n%{http_code}"',
    'homepage': f'{BASE}/',
    'homepageStatus': homepage_status,
    'homepageContainsAssetRail': b'id="assets"' in homepage,
    'assetsJsonStatus': assets_status,
    'assetsWithPreview': sum(bool(asset.get('preview')) for asset in assets),
    'assetsWithoutPreview': sum(not bool(asset.get('preview')) for asset in assets),
    'previewPathsResolve': all(bool(asset.get('preview')) for asset in assets),
    'catalogStatus': catalog_status,
    'branchDeployed': False,
    'note': 'Snapshot of the current public site; this feature branch has not been deployed.',
}
(BUNDLE / 'live-website-check.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
if homepage_status != 200 or assets_status != 200 or not result['homepageContainsAssetRail']:
    raise SystemExit(1)
