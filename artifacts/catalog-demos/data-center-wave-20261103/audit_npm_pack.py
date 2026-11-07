#!/usr/bin/env python3
"""Inspect the built npm tarball's catalog files and package boundary."""
import argparse
import hashlib
import json
import tarfile
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('tarball', type=Path)
tarball = parser.parse_args().tarball.resolve()
with tarfile.open(tarball, 'r:gz') as archive:
    names = {member.name.removeprefix('package/') for member in archive.getmembers()}
    manifest = json.load(archive.extractfile('package/package.json'))

sources = [name for name in names if name.startswith('catalog/kits/data-center-infrastructure/') and name.endswith('.kcad.ts')]
previews = [name for name in names if name.startswith('catalog/kits/data-center-infrastructure/previews/') and name.endswith('.png')]
private_prefixes = ('site/', 'src/server/', 'src/web/', 'src/billing/', 'src/checkout/', 'src/supplier-routing/', 'src/commissions/', 'src/manufacturing-policy/')
private_paths = sorted(name for name in names if name.startswith(private_prefixes))
result = {
    'command': 'npm pack --ignore-scripts --json --pack-destination /tmp/kernelcad-data-center-npm-pack',
    'tarball': str(tarball),
    'tarballBytes': tarball.stat().st_size,
    'tarballSha256': hashlib.sha256(tarball.read_bytes()).hexdigest(),
    'package': f"{manifest['name']}@{manifest['version']}",
    'packedFileCount': len(names),
    'catalogIndexIncluded': 'catalog/index.json' in names,
    'dataCenterSources': len(sources),
    'dataCenterPreviews': len(previews),
    'cliEntryIncluded': manifest.get('bin', {}).get('kernelcad') in names,
    'headlessPlayerIncluded': 'dist/headless-player/index.html' in names,
    'packageExports': manifest.get('exports'),
    'privateProductPaths': private_paths,
    'passed': (
        'catalog/index.json' in names
        and len(sources) == 50
        and len(previews) == 50
        and manifest.get('bin', {}).get('kernelcad') in names
        and 'dist/headless-player/index.html' in names
        and not private_paths
        and manifest.get('exports') == {'./package.json': './package.json'}
    ),
}
(BUNDLE / 'npm-pack-contents-check.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
if not result['passed']:
    raise SystemExit(1)
