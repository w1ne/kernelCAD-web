#!/usr/bin/env python3
"""Audit the packed catalog sources, previews, exports, and product boundary."""
import hashlib
import json
import sys
import tarfile
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
tarball = Path(sys.argv[1]).resolve()
forbidden_path_parts = {
    'billing', 'checkout', 'entitlement', 'commission', 'supplier-quotes',
    'supplier-routing', 'commercial-orchestration', 'private-manufacturing-policy',
}
with tarfile.open(tarball, 'r:gz') as archive:
    names = [member.name for member in archive.getmembers()]
    package_json = json.load(archive.extractfile('package/package.json'))
kit_sources = [name for name in names if name.startswith('package/catalog/kits/archaeology-fieldwork/') and name.endswith('.kcad.ts')]
kit_previews = [name for name in names if name.startswith('package/catalog/kits/archaeology-fieldwork/previews/') and name.endswith('.png')]
forbidden = [name for name in names if any(part in name.lower().split('/') for part in forbidden_path_parts)]
export_keys = sorted(package_json.get('exports', {}).keys())
result = {
    'tarball': str(tarball),
    'sha256': hashlib.sha256(tarball.read_bytes()).hexdigest(),
    'packedFileCount': len(names),
    'archaeologySources': len(kit_sources),
    'archaeologyPreviews': len(kit_previews),
    'exports': package_json.get('exports'),
    'exportKeys': export_keys,
    'forbiddenProductPaths': forbidden,
    'passed': len(kit_sources) == 50 and len(kit_previews) == 50 and export_keys == ['./package.json'] and not forbidden,
}
(BUNDLE / 'npm-pack-contents-check.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
if not result['passed']:
    raise SystemExit(1)
