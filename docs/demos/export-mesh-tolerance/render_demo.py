#!/usr/bin/env python3
"""Render a short evidence replay and an isometric view of the generated STL."""
from pathlib import Path
import json
import math
import struct
import subprocess
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent
evidence = json.loads((OUT / 'verification.json').read_text())
lines = (OUT / 'transcript.txt').read_text().splitlines()
raw = (OUT / 'tolerance-plate.stl').read_bytes()
count = struct.unpack_from('<I', raw, 80)[0]
triangles = []
for i in range(count):
    values = struct.unpack_from('<12fH', raw, 84 + i * 50)
    triangles.append([values[3:6], values[6:9], values[9:12]])

FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
font = ImageFont.truetype(FONT, 20)
small = ImageFont.truetype(FONT, 18)
title = ImageFont.truetype(FONT, 30)

def mesh_view():
    image = Image.new('RGB', (1100, 440), '#101b2c')
    draw = ImageDraw.Draw(image)
    points = [p for tri in triangles for p in tri]
    # Top view keeps the through-holes legible; vertices are read from the
    # actual Float32 STL and only upward-facing surface facets are drawn.
    min_x = min(p[0] for p in points); max_x = max(p[0] for p in points)
    min_y = min(p[1] for p in points); max_y = max(p[1] for p in points)
    scale = min(820 / (max_x - min_x), 260 / (max_y - min_y))
    def xy(p):
        return (550 + (p[0] - (min_x + max_x) / 2) * scale,
                255 - (p[1] - (min_y + max_y) / 2) * scale)
    faces = []
    for tri in triangles:
        a, b, c = tri
        ab = [b[j] - a[j] for j in range(3)]
        ac = [c[j] - a[j] for j in range(3)]
        normal = [ab[1]*ac[2]-ab[2]*ac[1], ab[2]*ac[0]-ab[0]*ac[2], ab[0]*ac[1]-ab[1]*ac[0]]
        length = math.sqrt(sum(v*v for v in normal)) or 1
        nz = normal[2] / length
        if nz < 0.1:
            continue
        shade = int(92 + 112 * nz)
        color = (int(shade * 0.58), int(shade * 0.82), min(255, int(shade * 1.12)))
        faces.append((sum(p[2] for p in tri) / 3, tri, color))
    for _, tri, color in sorted(faces, key=lambda item: item[0]):
        draw.polygon([xy(p) for p in tri], fill=color)
    draw.text((38, 26), 'Top view rendered from exported STL surface triangles', font=font, fill='#dbeafe')
    draw.text((38, 396), f'{count:,} triangles  |  Float32 coordinates  |  requested tolerance 0.01 mm', font=small, fill='#93c5fd')
    return image

panels = [
    ('1 / 3   Native part and export request', lines[:5], 5),
    ('2 / 3   Actual exported mesh', [], 6),
    ('3 / 3   Sampled deviation report and limits', lines[5:], 7),
]
frames = []
for heading, panel, seconds in panels:
    image = Image.new('RGB', (1280, 720), '#0b1120')
    draw = ImageDraw.Draw(image)
    draw.text((48, 34), 'kernelCAD / mesh tolerance export', font=title, fill='#f0f5ff')
    draw.text((48, 86), heading, font=small, fill='#8ab4f8')
    if heading.startswith('2 / 3'):
        view = mesh_view()
        image.paste(view, (90, 154))
        draw.text((48, 632), evidence['scope'], font=small, fill='#f5ce87')
    else:
        draw.rounded_rectangle((36, 140, 1244, 592), radius=14, fill='#121d31', outline='#29415f', width=2)
        for i, line in enumerate(panel):
            color = '#91e6ba' if line.startswith(('CHECK', 'REPORT', 'RESULT')) else '#e5ecf7'
            if line.startswith('LIMIT'):
                color = '#f5ce87'
            draw.text((60, 164 + i * 34), line, font=font, fill=color)
        draw.text((48, 624), evidence['scope'], font=small, fill='#f5ce87')
    draw.text((48, 665), 'Local replay | public export output retained | no deployment or print acceptance', font=small, fill='#a6b5cd')
    frames.append((image, seconds))

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
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', '8', '-i', str(OUT / 'demo.mp4'),
                '-frames:v', '1', str(OUT / 'poster.png')], check=True)
print(f"Created demo.mp4 ({(OUT / 'demo.mp4').stat().st_size} bytes), 18 seconds, 1280x720")
