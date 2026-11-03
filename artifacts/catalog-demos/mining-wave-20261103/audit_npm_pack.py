#!/usr/bin/env python3
"""Inspect the built npm tarball's file boundary and catalog payload."""
import argparse
import hashlib
import json
import tarfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('tarball', type=Path)
args = parser.parse_args()
tarball = args.tarball.resolve()
with tarfile.open(tarball, 'r:gz') as archive:
    names = {member.name.removeprefix('package/') for member in archive.getmembers()}
    manifest = json.load(archive.extractfile('package/package.json'))

sources = sorted(path for path in names if path.startswith('catalog/kits/mining/') and path.endswith('.kcad.ts'))
previews = sorted(path for path in names if path.startswith('catalog/kits/mining/previews/') and path.endswith('.png'))
product_prefixes = (
    'site/', 'src/server/', 'src/web/', 'src/billing/', 'src/checkout/',
    'src/supplier-routing/', 'src/commissions/', 'src/manufacturing-policy/',
)
product_paths = sorted(path for path in names if path.startswith(product_prefixes))
result = {
    'command': 'npm pack --ignore-scripts --json --pack-destination /tmp/kernelcad-mining-npm-pack',
    'tarball': str(tarball),
    'tarballBytes': tarball.stat().st_size,
    'tarballSha256': hashlib.sha256(tarball.read_bytes()).hexdigest(),
    'package': f"{manifest['name']}@{manifest['version']}",
    'packedFileCount': len(names),
    'catalogIndexIncluded': 'catalog/index.json' in names,
    'miningSources': len(sources),
    'miningPreviews': len(previews),
    'cliEntryIncluded': manifest.get('bin', {}).get('kernelcad') in names,
    'headlessPlayerIncluded': 'dist/headless-player/index.html' in names,
    'packageExports': manifest.get('exports'),
    'privateProductPaths': product_paths,
    'passed': (
        'catalog/index.json' in names
        and len(sources) == 50
        and len(previews) == 50
        and manifest.get('bin', {}).get('kernelcad') in names
        and 'dist/headless-player/index.html' in names
        and not product_paths
        and manifest.get('exports') == {'./package.json': './package.json'}
    ),
}
(BUNDLE / 'npm-pack-contents-check.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
if not result['passed']:
    raise SystemExit(1)
