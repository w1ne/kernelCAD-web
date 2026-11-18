# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
#
# Compose the demo frames (1280 x 720) from the rendered stills and the
# recorded result.json, then encode demo.mp4 with ffmpeg.
#   python3 docs/demos/diff-geometry-faces/composeFrames.py
import json
import os
import subprocess
import sys
import tempfile
import textwrap

from PIL import Image, ImageDraw, ImageFont

DIR = os.path.dirname(os.path.abspath(__file__))
W, H = 1280, 720
BG = (24, 26, 30)
FG = (230, 232, 235)
DIM = (150, 155, 162)
GREEN = (46, 204, 113)
RED = (231, 76, 60)
AMBER = (241, 196, 15)
SANS = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
SANS_B = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
FOOTER = 'Local validation: kernelCAD diff_geometry run on this machine (not the hosted service, not a fabricated part).'


def font(path, size):
    return ImageFont.truetype(path, size)


def frame(title):
    img = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(img)
    d.text((40, 28), title, font=font(SANS_B, 30), fill=FG)
    d.text((40, H - 36), FOOTER, font=font(SANS, 15), fill=DIM)
    return img, d


def paste_fit(img, path, box):
    x, y, w, h = box
    still = Image.open(path).convert('RGB')
    still.thumbnail((w, h))
    img.paste(still, (x + (w - still.width) // 2, y + (h - still.height) // 2))


def frame_before_after():
    img, d = frame('Motor-mount plate: revision A -> revision B')
    paste_fit(img, os.path.join(DIR, 'stills/before/iso.png'), (40, 90, 580, 520))
    paste_fit(img, os.path.join(DIR, 'stills/after/iso.png'), (660, 90, 580, 520))
    d.text((60, 620), 'A: two M4 holes, r = 2 mm', font=font(SANS, 22), fill=FG)
    d.text((680, 620), 'B: holes r = 2.25 mm + 22 mm pilot bore', font=font(SANS, 22), fill=FG)
    return img


def frame_overlay():
    img, d = frame('diff_geometry({ render: true }) overlay')
    paste_fit(img, os.path.join(DIR, 'overlay/iso.png'), (40, 90, 640, 580))
    y = 140
    for color, line in [
        (RED, 'red: material removed (A - B)'),
        (GREEN, 'green: material added (B - A), none here'),
        (DIM, 'grey ghost: material on both sides'),
    ]:
        d.rectangle((720, y + 6, 740, y + 26), fill=color)
        d.text((755, y), line, font=font(SANS, 22), fill=FG)
        y += 50
    d.text((720, y + 30), 'The pilot disc and the two thin rings', font=font(SANS, 22), fill=FG)
    d.text((720, y + 62), 'around the mounting holes are the', font=font(SANS, 22), fill=FG)
    d.text((720, y + 94), 'removed material.', font=font(SANS, 22), fill=FG)
    return img


def frame_summary(result):
    img, d = frame('summary.text: which faces changed')
    mono = font(MONO, 21)
    y = 100
    d.text((40, y), '$ npx tsx docs/demos/diff-geometry-faces/demo.ts --render', font=mono, fill=GREEN)
    y += 44
    text = result['summary']['text']
    for para in text.replace('), ', '),\n').replace('; ', ';\n  ').split('\n'):
        for line in textwrap.wrap(para, 92, subsequent_indent='    ') or ['']:
            d.text((40, y), line, font=mono, fill=FG)
            y += 30
    y += 20
    f = result['faces']
    d.text((40, y), f"verdict: {result['verdict']}   faces added {f['addedCount']}, modified {f['modifiedCount']}, "
           f"removed {f['removedCount']}, unchanged {f['unchangedCount']}", font=mono, fill=AMBER)
    return img


def fmt(v):
    return f'{v:g}'


def frame_lists(result):
    img, d = frame('bodies[0].faces: per-face entries')
    mono = font(MONO, 19)
    y = 95
    f = result['faces']
    d.text((40, y), 'added', font=font(SANS_B, 22), fill=GREEN)
    y += 34
    for a in f['added']:
        d.text((60, y), f"{a['surfaceType']} r={fmt(a['radiusMm'])}  area {fmt(a['areaMm2'])} mm2  "
               f"center {a['center']}  axis {a['axis']}", font=mono, fill=FG)
        y += 28
    y += 14
    d.text((40, y), 'modified', font=font(SANS_B, 22), fill=AMBER)
    y += 34
    for m in f['modified']:
        b, a = m['before'], m['after']
        if 'radiusMm' in b:
            what = f"r {fmt(b['radiusMm'])} -> {fmt(a['radiusMm'])}"
        else:
            what = f"area {fmt(b['areaMm2'])} -> {fmt(a['areaMm2'])} mm2"
        ref = m.get('ref', '(unnamed face)')
        d.text((60, y), f"{m['change']:<8} {m['surfaceType']:<9} {what:<34} {m['matchedBy']:<9} {ref}",
               font=mono, fill=FG)
        y += 28
    y += 14
    d.text((40, y), f"unchanged: {f['unchangedCount']} (the four side planes)   removed: {f['removedCount']}   "
           f"truncated: {str(f['truncated']).lower()}", font=mono, fill=DIM)
    return img


def main():
    with open(os.path.join(DIR, 'result.json')) as fh:
        result = json.load(fh)
    frames = [frame_before_after(), frame_overlay(), frame_summary(result), frame_lists(result)]
    with tempfile.TemporaryDirectory() as tmp:
        for i, img in enumerate(frames, 1):
            img.save(os.path.join(tmp, f'frame-{i}.png'))
        subprocess.run([
            'ffmpeg', '-y', '-loglevel', 'error', '-framerate', '1/3.5', '-i', os.path.join(tmp, 'frame-%d.png'),
            '-vf', 'fps=24,format=yuv420p', '-c:v', 'libx264', '-movflags', '+faststart',
            os.path.join(DIR, 'demo.mp4'),
        ], check=True)
    print('wrote', os.path.join(DIR, 'demo.mp4'))


if __name__ == '__main__':
    sys.exit(main())
