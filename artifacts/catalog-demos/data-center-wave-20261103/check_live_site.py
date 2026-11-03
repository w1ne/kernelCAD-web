#!/usr/bin/env python3
"""Capture current live homepage/catalog status without claiming deployment."""
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

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
doc = json.loads(assets_body) if assets_status == 200 else {'assets': []}
assets = doc.get('assets', [])
result = {
    'checkedAt': datetime.now(timezone.utc).isoformat(),
    'command': 'curl -L --max-time 25 -sS -w "\\n%{http_code}"',
    'homepageStatus': homepage_status,
    'homepageContainsAssetRail': b'id="assets"' in homepage,
    'assetsJsonStatus': assets_status,
    'livePreviewAssets': sum(bool(asset.get('preview')) for asset in assets),
    'liveAssetsWithoutPreview': sum(not bool(asset.get('preview')) for asset in assets),
    'catalogStatus': catalog_status,
    'branchDeployed': False,
    'note': 'Current live-site snapshot; the new branch is not deployed.',
}
(BUNDLE / 'live-website-check.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
if homepage_status != 200 or assets_status != 200 or not result['homepageContainsAssetRail']:
    raise SystemExit(1)
