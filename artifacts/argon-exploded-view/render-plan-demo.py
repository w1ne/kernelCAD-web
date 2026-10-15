#!/usr/bin/env python3
"""Render a labeled schematic animation from explode_view's JSON plan."""
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import subprocess

ROOT = Path(__file__).resolve().parents[2]
BUNDLE = Path(__file__).resolve().parent
plan = json.loads((BUNDLE / 'plan.json').read_text())['plan']
handoff = json.loads((ROOT / 'tests/fixtures/argon/handoff-drawbot.json').read_text())
part_by_ref = {part['ref']: part for part in handoff['parts']}
colors = {'A1': '#357A9A', 'A2': '#D18A37', 'A3': '#59A374', 'M3': '#9C6485'}
W, H, FPS = 1600, 900, 30
DURATION = plan['durationMs'] / 1000
TOTAL = 3.4
font_path = '/System/Library/Fonts/Supplemental/Arial.ttf'
font = ImageFont.truetype(font_path, 28)
small = ImageFont.truetype(font_path, 22)
large = ImageFont.truetype(font_path, 40)

def value_at(track, t_ms):
    keys = track['keys']
    if t_ms <= keys[0]['atMs']:
        return keys[0]['value']
    for left, right in zip(keys, keys[1:]):
        if t_ms <= right['atMs']:
            if right.get('ease') == 'step':
                return left['value']
            span = max(1, right['atMs'] - left['atMs'])
            u = (t_ms - left['atMs']) / span
            if right.get('ease') == 'easeInOut':
                u = 3 * u * u - 2 * u * u * u
            return left['value'] + (right['value'] - left['value']) * u
    return keys[-1]['value']

def frame(index):
    t = min(index / FPS, DURATION)
    t_ms = t * 1000
    img = Image.new('RGB', (W, H), '#F5F7FA')
    draw = ImageDraw.Draw(img)
    draw.text((72, 46), 'Exploded view planner', font=large, fill='#17212B')
    draw.text((74, 102), 'LabWired handoff → ordered offsets → reversible animation tracks', font=font, fill='#405367')
    draw.rounded_rectangle((70, 160, 1530, 760), radius=24, fill='#FFFFFF', outline='#D8E0E8', width=2)
    draw.text((104, 186), 'Schematic bbox proxies · axis +Z · fixed camera', font=small, fill='#596B7B')
    draw.text((104, 222), 'Plan visualization only — not a CAD render or fit check', font=small, fill='#A44A3F')
    tracks = {track['part']: track for track in plan['tracks']}
    for ref in plan['order']:
        part = part_by_ref[ref]
        pos = part['position_mm']['value']
        size = part.get('physical', {}).get('bbox_mm') or part.get('bbox_mm', {}).get('value')
        track = tracks[ref]
        progress = value_at(track, t_ms)
        ox, oy, oz = track['offset']
        cx = 800 + (pos[0] - 35) * 7.2 - (pos[1] - 31) * 4.3 + ox * 7.2 - oy * 4.3
        cy = 490 + (pos[0] - 35) * 2.8 + (pos[1] - 31) * 3.2 - (oz * progress) * 2.2
        bw, bh = max(32, size[0] * 3.2), max(26, size[1] * 2.7)
        box = (cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2)
        draw.rounded_rectangle(box, radius=10, fill=colors.get(ref, '#708090'), outline='#263746', width=3)
        draw.line((box[0] + 10, box[1] + 13, box[2] - 10, box[1] + 13), fill='#FFFFFF', width=3)
        label = f'{ref}  ·  {part["catalog_id"]}'
        draw.text((box[0] + 8, box[3] + 8), label, font=small, fill='#253443')
        if progress > 0.03 and math.hypot(*track['offset']) > 0:
            draw.text((box[0] + 8, box[1] - 28), f'+{oz * progress:.1f} mm Z', font=small, fill='#34495A')
    elapsed = min(t_ms, plan['durationMs'])
    draw.rounded_rectangle((104, 680, 1496, 714), radius=14, fill='#E7EDF3')
    draw.rounded_rectangle((104, 680, 104 + 1392 * elapsed / plan['durationMs'], 714), radius=14, fill='#3F7897')
    draw.text((104, 724), f'Planner timeline {elapsed / 1000:.1f}s / {plan["durationMs"] / 1000:.1f}s', font=small, fill='#405367')
    draw.text((104, 808), 'LOCAL PLAN VISUALIZATION  •  animation capture server unavailable (EPERM)  •  no hardware acceptance', font=small, fill='#596B7B')
    return img

frames = int(TOTAL * FPS)
output = BUNDLE / 'explode-plan.mp4'
command = [
    'ffmpeg', '-y', '-f', 'rawvideo', '-pixel_format', 'rgb24',
    '-video_size', f'{W}x{H}', '-framerate', str(FPS), '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(output),
]
with subprocess.Popen(command, stdin=subprocess.PIPE) as encoder:
    assert encoder.stdin is not None
    for i in range(frames):
        encoder.stdin.write(frame(i).tobytes())
    encoder.stdin.close()
    if encoder.wait() != 0:
        raise SystemExit('ffmpeg failed while encoding the planner visualization')
print(f'Wrote {frames} RGB frames to {output}')
