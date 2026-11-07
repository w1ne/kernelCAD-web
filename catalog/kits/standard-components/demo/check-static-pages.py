#!/usr/bin/env python3
from pathlib import Path

asset = Path('site-build/catalog/standard-components/angle-bracket/index.html')
hub = Path('site-build/catalog/index.html')
page = asset.read_text()
hub_text = hub.read_text()
checks = {
    'asset page exists': asset.is_file(),
    'asset title': '<title>Angle bracket - free low-poly attachment model (CC0) | kernelCAD</title>' in page,
    'preview linked': 'preview.png' in page,
    'model-size knob': 'Model size' in page,
    'CC0 license': 'CC0 1.0' in page,
    'kit listed on hub': 'Standard Components' in hub_text,
    'angle bracket linked on hub': 'standard-components/angle-bracket/' in hub_text,
}
for name, passed in checks.items():
    print(f'{name}: {"PASS" if passed else "FAIL"}')
if not all(checks.values()):
    raise SystemExit(1)
