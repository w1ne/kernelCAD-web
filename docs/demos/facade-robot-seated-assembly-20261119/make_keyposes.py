#!/usr/bin/env python3
"""Write one copy of the façade robot example per key pose.

Each copy differs from the source only in the param defaults named below.
Usage: make_keyposes.py <example.kcad.ts> <outDir>
"""
import json
import pathlib
import re
import sys

BASE = {'mastFoldAngle': 0, 'carriageHeight': 2.25, 'outriggerDeploy': 1, 'armReach': 1, 'armYawDeg': 18,
        'armPitchDeg': -14, 'wristTiltDeg': -8}
# (label, overrides); every value is inside the declared joint limits.
POSES = [
    ('working pose (defaults)', {}),
    ('carriage low, nozzle down', {'carriageHeight': 0.4, 'wristTiltDeg': -30}),
    ('carriage high, nozzle up', {'carriageHeight': 2.7, 'wristTiltDeg': 30}),
    ('service arms out and up', {'armYawDeg': 55, 'armPitchDeg': 20, 'armReach': 1.15}),
    ('service arms in and down', {'armYawDeg': -10, 'armPitchDeg': -35, 'armReach': 1.15}),
    ('outriggers tucked', {'outriggerDeploy': 0, 'carriageHeight': 0.4}),
    ('mast half folded', {'outriggerDeploy': 0, 'carriageHeight': 0.4, 'mastFoldAngle': 45}),
    ('folded for transport', {'outriggerDeploy': 0, 'carriageHeight': 0.4, 'mastFoldAngle': 90}),
]

source = pathlib.Path(sys.argv[1]).read_text()
out = pathlib.Path(sys.argv[2])
manifest = []
for index, (label, overrides) in enumerate(POSES):
    values = {**BASE, **overrides}
    text = source
    for name, value in values.items():
        text, count = re.subn(r"(param\('%s', )-?[\d.]+," % name, r"\g<1>%s," % value, text)
        assert count == 1, name
    pose_dir = out / f'pose-{index}'
    pose_dir.mkdir(parents=True, exist_ok=True)
    (pose_dir / 'kspray-facade-robot.kcad.ts').write_text(text)
    manifest.append({'index': index, 'label': label, 'params': values})
(out / 'poses.json').write_text(json.dumps(manifest, indent=1) + '\n')
