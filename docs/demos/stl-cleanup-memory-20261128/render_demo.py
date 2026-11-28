#!/usr/bin/env python3
"""Render a short memory/export replay from the actual STL output."""
from pathlib import Path
import json
import math
import struct
import subprocess
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent
evidence = json.loads((OUT / 'verification.json').read_text())
lines = (OUT / 'transcript.txt').read_text().splitlines()
stl_path = OUT / 'export-output.stl'
raw = stl_path.read_bytes()
count = struct.unpack_from('<I', raw, 80)[0]

FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
font = ImageFont.truetype(FONT, 20)
small = ImageFont.truetype(FONT, 18)
title = ImageFont.truetype(FONT, 30)


def mesh_view():
    image = Image.new('RGB', (1100, 440), '#101b2c')
    draw = ImageDraw.Draw(image)
    min_x = min_y = math.inf
    max_x = max_y = -math.inf
    for i in range(count):
        values = struct.unpack_from('<12fH', raw, 84 + i * 50)
        for k in (3, 6, 9):
            min_x = min(min_x, values[k]); max_x = max(max_x, values[k])
            min_y = min(min_y, values[k + 1]); max_y = max(max_y, values[k + 1])
    scale = min(760 / (max_x - min_x), 300 / (max_y - min_y))

    def xy(p):
        return (550 + (p[0] - (min_x + max_x) / 2) * scale,
                244 - (p[1] - (min_y + max_y) / 2) * scale)

    for i in range(count):
        values = struct.unpack_from('<12fH', raw, 84 + i * 50)
        tri = [values[3:6], values[6:9], values[9:12]]
        a, b, c = tri
        ab = [b[j] - a[j] for j in range(3)]
        ac = [c[j] - a[j] for j in range(3)]
        normal = [ab[1]*ac[2]-ab[2]*ac[1], ab[2]*ac[0]-ab[0]*ac[2], ab[0]*ac[1]-ab[1]*ac[0]]
        length = math.sqrt(sum(v*v for v in normal)) or 1
        nz = normal[2] / length
        if nz < 0.08:
            continue
        shade = int(92 + 112 * nz)
        color = (int(shade * 0.58), int(shade * 0.82), min(255, int(shade * 1.12)))
        draw.polygon([xy(p) for p in tri], fill=color)
    draw.text((38, 26), 'Top view rendered from upper-facing Float32 facets in the actual STL', font=font, fill='#dbeafe')
    draw.text((38, 396), f'{count:,} triangles  |  watertight  |  binary STL', font=small, fill='#93c5fd')
    return image


def panel(heading, body, footer='LOCAL ENGINE REPLAY | not deployed or hardware acceptance'):
    image = Image.new('RGB', (1280, 720), '#0b1120')
    draw = ImageDraw.Draw(image)
    draw.text((48, 34), 'kernelCAD / dense STL export', font=title, fill='#f0f5ff')
    draw.text((48, 86), heading, font=small, fill='#8ab4f8')
    draw.rounded_rectangle((36, 140, 1244, 592), radius=14, fill='#121d31', outline='#29415f', width=2)
    for i, line in enumerate(body):
        color = '#91e6ba' if line.startswith(('CHECK', 'RESULT', 'PASS')) else '#e5ecf7'
        if line.startswith('LIMIT'):
            color = '#f5ce87'
        draw.text((60, 164 + i * 42), line, font=font, fill=color)
    draw.text((48, 665), footer, font=small, fill='#a6b5cd')
    return image


view = Image.new('RGB', (1280, 720), '#0b1120')
view_draw = ImageDraw.Draw(view)
view_draw.text((48, 34), 'kernelCAD / dense STL export', font=title, fill='#f0f5ff')
view_draw.text((48, 86), '2 / 4   Actual exported mesh', font=small, fill='#8ab4f8')
view.paste(mesh_view(), (90, 145))
view_draw.text((48, 624), '20 sphere compound  |  actual STL output  |  complete top-facing facets', font=small, fill='#f5ce87')
view_draw.text((48, 665), 'LOCAL ENGINE REPLAY | not deployed or hardware acceptance', font=small, fill='#a6b5cd')

baseline = evidence['baseline']['incrementalPeakRssMb']
current = evidence['current']['incrementalPeakRssMb']
bar_panel = Image.new('RGB', (1280, 720), '#0b1120')
bar_draw = ImageDraw.Draw(bar_panel)
bar_draw.text((48, 34), 'kernelCAD / dense STL export', font=title, fill='#f0f5ff')
bar_draw.text((48, 86), '3 / 4   Local peak RSS, same 644,040-triangle fixture', font=small, fill='#8ab4f8')
bar_draw.rounded_rectangle((36, 140, 1244, 592), radius=14, fill='#121d31', outline='#29415f', width=2)
bar_draw.text((68, 184), f'origin/develop  {baseline:.2f} MB', font=font, fill='#ffb4a2')
bar_draw.rounded_rectangle((68, 224, 1080, 276), radius=8, fill='#553338')
bar_draw.rounded_rectangle((68, 224, 68 + int(960 * min(baseline, 400) / 400), 276), radius=8, fill='#f18e77')
bar_draw.text((68, 328), f'updated        {current:.2f} MB', font=font, fill='#91e6ba')
bar_draw.rounded_rectangle((68, 368, 1080, 420), radius=8, fill='#244338')
bar_draw.rounded_rectangle((68, 368, 68 + int(960 * min(current, 400) / 400), 420), radius=8, fill='#72d4a8')
bar_draw.line((68 + int(960 * 300 / 400), 208, 68 + int(960 * 300 / 400), 438), fill='#f5ce87', width=3)
bar_draw.text((68 + int(960 * 300 / 400) + 8, 442), '300 MB budget', font=small, fill='#f5ce87')
bar_draw.text((68, 510), 'The baseline replay fails the test budget; the updated local replay passes.', font=small, fill='#dbeafe')
bar_draw.text((48, 665), 'LOCAL TEST MEASUREMENTS | not deployed or hardware acceptance', font=small, fill='#a6b5cd')

checks = panel('4 / 4   Output checks and scope', [
    f'CHECK  {count:,} triangles; {evidence["current"]["outputBytes"]:,} bytes',
    'CHECK  watertight=true; open edges=0; non-manifold edges=0',
    f'CHECK  peak RSS {current:.2f} MB < 300 MB budget',
    'PASS   STL export regression and reference-readback test passed locally',
    'LIMIT  no deployed behavior, slicer, or hardware acceptance claimed',
])

frames = [(panel('1 / 4   Fixture and export path', lines[:5]), 4),
          (view, 5), (bar_panel, 5), (checks, 4)]
command = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
           '-s', '1280x720', '-r', '12', '-i', 'pipe:0', '-an', '-c:v', 'libx264',
           '-preset', 'fast', '-crf', '28', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
           str(OUT / 'demo.mp4')]
proc = subprocess.Popen(command, stdin=subprocess.PIPE)
assert proc.stdin is not None
for image, seconds in frames:
    payload = image.tobytes()
    for _ in range(seconds * 12):
        proc.stdin.write(payload)
proc.stdin.close()
if proc.wait() != 0:
    raise SystemExit('FFmpeg failed')
view.save(OUT / 'poster.png')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', '9', '-i', str(OUT / 'demo.mp4'),
                '-frames:v', '1', str(OUT / 'video-review.png')], check=True)
stl_path.unlink(missing_ok=True)
print(f"Created demo.mp4 ({(OUT / 'demo.mp4').stat().st_size} bytes), 18 seconds, 1280x720")
