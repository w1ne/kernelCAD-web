#!/usr/bin/env python3
"""Assemble the rendered key poses into demo.mp4 and a contact sheet.

Usage: make_demo.py <keyposeDir> <demoDir>
<keyposeDir> holds poses.json and pose-N/view.pose-225-25.png (see README).
"""
import json
import pathlib
import subprocess
import sys

src = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
poses = json.loads((src / 'poses.json').read_text())
inputs: list[str] = []
filters: list[str] = []
for pose in poses:
    i = pose['index']
    inputs += ['-loop', '1', '-t', '2', '-i', str(src / f'pose-{i}' / 'view.pose-225-25.png')]
    label = f"t = {pose['atMs'] / 1000:.1f} s   {pose['label']}".replace(',', '\\,')
    filters.append(
        f"[{i}:v]drawtext=text='{label}':x=40:y=40:fontsize=40:fontcolor=white"
        f":box=1:boxcolor=black@0.6:boxborderw=12,format=yuv420p[v{i}]")
filters.append(''.join(f"[v{pose['index']}]" for pose in poses) + f'concat=n={len(poses)}:v=1:a=0[out]')
subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(filters), '-map', '[out]',
                '-r', '10', '-c:v', 'libx264', '-crf', '23', str(out / 'demo.mp4')], check=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(out / 'demo.mp4'), '-vf',
                "select='not(mod(n,20))',scale=640:-1,tile=4x2", '-frames:v', '1',
                str(out / 'verification' / 'video-contact-sheet.png')], check=True)
