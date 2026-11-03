#!/usr/bin/env python3
"""Snapshot the currently deployed homepage asset endpoint for comparison."""
from datetime import datetime, timezone
import json
import re
import subprocess
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
home_url = 'https://kernelcad.com/'
assets_url = 'https://kernelcad.com/assets.json'
homepage = subprocess.check_output(['curl', '-fsS', '--max-time', '20', home_url]).decode('utf-8')
payload = json.loads(subprocess.check_output(['curl', '-fsS', '--max-time', '20', assets_url]))
assets = payload.get('assets', []) if isinstance(payload, dict) else payload
preview_count = sum(bool(asset.get('preview')) for asset in assets if isinstance(asset, dict))
heading = re.search(r'<h1[^>]*>(.*?)</h1>', homepage, re.S)
result = {
    'checkedAtUTC': datetime.now(timezone.utc).isoformat(timespec='seconds'),
    'homepage': home_url,
    'assetsEndpoint': assets_url,
    'headlineHtml': heading.group(1).strip() if heading else None,
    'liveAssets': len(assets),
    'livePreviewAssets': preview_count,
    'generatedAt': payload.get('generatedAt') if isinstance(payload, dict) else None,
    'branchDeployment': 'not deployed; this is a current-live snapshot only',
    'passed': bool(heading) and len(assets) > 0 and preview_count == len(assets),
}
(BUNDLE / 'live-website-check.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
if not result['passed']:
    raise SystemExit(1)
