#!/usr/bin/env python3
"""Write one copy of the K-Lift example per animation key pose.

Each copy differs from the source only in the param defaults named below.
Usage: make_keyposes.py <example.kcad.ts> <outDir>
"""
import json
import pathlib
import re
import sys

BASE = {'lowerDeg': 70, 'upperRelDeg': -104, 'platformRelDeg': 34, 'carriageMm': 260, 'extX': 0, 'gripY': 664,
        'maskProgress': 0, 'tapeTopP': 0, 'tapeBottomP': 0, 'peelTopP': 0, 'peelBottomP': 0,
        'foamLowerP': 0, 'foamUpperP': 0}
# (atMs, label, overrides) read from the animationView tracks.
POSES = [
    (0, 'start, boom folded', {}),
    (2400, 'mask film sprayed', {'upperRelDeg': -40, 'platformRelDeg': -30, 'carriageMm': 550, 'maskProgress': 1}),
    (3600, 'top tape, half applied', {'upperRelDeg': -40, 'platformRelDeg': -30, 'carriageMm': 642, 'extX': 954,
                                      'gripY': 0, 'maskProgress': 1, 'tapeTopP': 0.5}),
    (6400, 'bottom tape, half applied', {'upperRelDeg': -83, 'platformRelDeg': 13, 'carriageMm': 297, 'extX': 715,
                                         'gripY': 0, 'maskProgress': 1, 'tapeTopP': 1, 'tapeBottomP': 0.5}),
    (11600, 'foam pass complete', {'upperRelDeg': -40, 'platformRelDeg': -30, 'carriageMm': 760, 'maskProgress': 1,
                                   'tapeTopP': 1, 'tapeBottomP': 1, 'foamLowerP': 1, 'foamUpperP': 1}),
    (12800, 'top tape, half peeled', {'upperRelDeg': -40, 'platformRelDeg': -30, 'carriageMm': 642, 'extX': 954,
                                      'gripY': 0, 'maskProgress': 1, 'tapeTopP': 1, 'tapeBottomP': 1,
                                      'peelTopP': 0.5, 'foamLowerP': 1, 'foamUpperP': 1}),
    (17800, 'end, tape peeled', {'maskProgress': 1, 'tapeTopP': 1, 'tapeBottomP': 1, 'peelTopP': 1, 'peelBottomP': 1,
                                 'foamLowerP': 1, 'foamUpperP': 1}),
]

source = pathlib.Path(sys.argv[1]).read_text()
out = pathlib.Path(sys.argv[2])
manifest = []
for index, (at_ms, label, overrides) in enumerate(POSES):
    values = {**BASE, **overrides}
    text = source
    for name, value in values.items():
        text, count = re.subn(r"(param\('%s', )-?[\d.]+," % name, r"\g<1>%s," % value, text)
        assert count == 1, name
    pose_dir = out / f'pose-{index}'
    pose_dir.mkdir(parents=True, exist_ok=True)
    (pose_dir / 'kspray-klift.kcad.ts').write_text(text)
    manifest.append({'index': index, 'atMs': at_ms, 'label': label, 'params': values})
(out / 'poses.json').write_text(json.dumps(manifest, indent=1) + '\n')
