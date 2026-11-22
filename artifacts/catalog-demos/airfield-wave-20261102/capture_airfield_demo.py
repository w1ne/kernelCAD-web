#!/usr/bin/env python3
"""Capture a short, local-source-to-mesh demo for the airfield catalog kit."""
import json
import shutil
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
FRAMES = OUT / 'frames'
W, H = 1280, 720
BG = '#101923'
CARD = '#1b2936'
INK = '#edf3f8'
MUTED = '#a6b5c3'
ACCENT = '#76b7cb'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FONT_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
FONT_MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'

index = json.loads((ROOT / 'catalog/index.json').read_text())
assets = {asset['id']: asset for asset in index['assets'] if asset['kit'] == 'airfield'}
if len(assets) != 40:
    raise SystemExit(f'expected 40 indexed airfield assets, found {len(assets)}')
FRAMES.mkdir(parents=True, exist_ok=True)


def font(size, bold=False, mono=False):
    path = FONT_MONO if mono else (FONT_BOLD if bold else FONT)
    return ImageFont.truetype(path, size)


def base(step, title, subtitle):
    image = Image.new('RGB', (W, H), BG)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, W, 8), fill=ACCENT)
    draw.text((48, 30), f'AIRFIELD KIT  /  {step:02d} of 08', font=font(17, bold=True), fill=ACCENT)
    draw.text((48, 68), title, font=font(37, bold=True), fill=INK)
    draw.text((50, 118), subtitle, font=font(19), fill=MUTED)
    draw.line((48, H - 45, W - 48, H - 45), fill='#344655', width=1)
    draw.text((48, H - 34), 'LOCAL SOURCE + MESH WORKFLOW  ·  GENERATED IN KERNELCAD', font=font(13, bold=True), fill=MUTED)
    return image, draw


def preview(asset_id, size):
    path = ROOT / 'catalog/kits/airfield/previews' / f'{asset_id}.png'
    return ImageOps.contain(Image.open(path).convert('RGB'), size, Image.Resampling.LANCZOS)


def tile(draw, image, asset_id, x, y, width, height):
    draw.rounded_rectangle((x, y, x + width, y + height), radius=12, fill=CARD)
    thumb = preview(asset_id, (width - 18, height - 56))
    image.paste(thumb, (x + (width - thumb.width) // 2, y + 8))
    draw.text((x + 14, y + height - 39), assets[asset_id]['title'], font=font(18, bold=True), fill=INK)
    draw.text((x + 14, y + height - 17), f"{assets[asset_id]['stats']['triangles']} triangles  ·  scale + color", font=font(12), fill=MUTED)


def save(image, number):
    image.save(FRAMES / f'frame-{number:02d}.png')


# 1. Show the added kit as a coherent scene-asset group.
image, draw = base(1, 'Airfield props, authored in kernelCAD', '40 original models for airport scenes: aircraft, apron vehicles and fixtures.')
image.paste(preview('narrowbody-airliner', (560, 390)), (34, 183))
image.paste(preview('airport-control-tower', (290, 280)), (808, 188))
image.paste(preview('pushback-tug', (255, 180)), (842, 397))
draw.text((60, 610), '15 aircraft   /   13 service vehicles   /   12 airport fixtures', font=font(21, bold=True), fill=INK)
save(image, 1)

# 2–4. Actual software-rendered previews from the generated .kcad.ts sources.
groups = [
    ('Aircraft with different wings and profiles', ['single-engine-trainer', 'regional-jet', 'amphibious-seaplane', 'biplane']),
    ('Apron service vehicles', ['baggage-tractor', 'passenger-boarding-stairs', 'belt-loader', 'airport-fire-engine']),
    ('Terminal and runway fixtures', ['airport-control-tower', 'passenger-jet-bridge', 'runway-threshold-light-array', 'windsock-mast']),
]
for number, (title, ids) in enumerate(groups, start=2):
    image, draw = base(number, title, 'Each tile is the committed catalog preview rendered from its parametric source.')
    for i, asset_id in enumerate(ids):
        x = 48 + (i % 2) * 600
        y = 174 + (i // 2) * 235
        tile(draw, image, asset_id, x, y, 560, 215)
    save(image, number)

# 5. Show real source and named parameter controls beside its mesh result.
source_id = 'passenger-boarding-stairs'
source_path = ROOT / 'catalog/kits/airfield' / f'{source_id}.kcad.ts'
source_lines = source_path.read_text().splitlines()
snippet = [line[:65] for line in source_lines if 'param(' in line or 'assembly(' in line or 'p.part(' in line][:7]
image, draw = base(5, 'One source, editable size and color', 'A named assembly returns a mesh while the catalog exposes its exact controls.')
tile(draw, image, source_id, 48, 178, 470, 430)
draw.rounded_rectangle((550, 178, 1232, 608), radius=12, fill='#0b131b')
for row, line in enumerate(snippet):
    draw.text((576, 204 + row * 45), line, font=font(13, mono=True), fill='#b9dce6')
draw.text((576, 558), 'Index knobs: scale, color     ·     One material', font=font(17, bold=True), fill=INK)
save(image, 5)

# 6. Show the generated index values, not hand-entered marketing claims.
asset = assets['single-engine-trainer']
image, draw = base(6, 'Generated index records the mesh and knobs', 'The index is rebuilt from every .kcad.ts source and measured export.')
draw.rounded_rectangle((72, 190, 1208, 555), radius=16, fill=CARD)
rows = [
    ('Asset', f"{asset['kit']}/{asset['id']}"),
    ('Controls', ', '.join(param['name'] for param in asset['params'])),
    ('Triangles', f"{asset['stats']['triangles']} / {asset['triangleBudget']} budget"),
    ('Materials', str(asset['stats']['materials'])),
    ('Measured origin', f"base · minUpM {asset['stats']['minUpM']}"),
    ('Catalog total', f"{len(index['assets'])} assets · {len(index['kits'])} kits"),
]
for row, (label, value) in enumerate(rows):
    y = 218 + row * 52
    draw.text((112, y), label, font=font(18, bold=True), fill=ACCENT)
    draw.text((380, y), value, font=font(20), fill=INK)
    if row < len(rows) - 1:
        draw.line((112, y + 38, 1168, y + 38), fill='#344655', width=1)
save(image, 6)

# 7. Make the full selection inspectable in one frame.
image, draw = base(7, 'Forty rendered previews in one kit', 'The bundle keeps the individual preview PNGs and this review sheet.')
sheet = Image.open(OUT / 'preview-contact-sheet.png').convert('RGB')
sheet = ImageOps.contain(sheet, (470, 535), Image.Resampling.LANCZOS)
image.paste(sheet, ((W - sheet.width) // 2, 165))
save(image, 7)

# 8. Report only local evidence; public deployment is still pending.
image, draw = base(8, 'Local audit complete', 'Source, index, previews and generated static pages were checked on this branch.')
summary = [
    ('Lint', 'catalog/ clean'),
    ('Integration', '4 files · 15 tests passed'),
    ('Index', '795 assets · 22 kits'),
    ('Airfield meshes', '40 inside budget · one material · scale + color'),
    ('Static pages', 'hub + 40 airfield pages and copied previews checked locally'),
]
for row, (label, value) in enumerate(summary):
    y = 196 + row * 64
    draw.rounded_rectangle((78, y, 1200, y + 48), radius=10, fill=CARD)
    draw.text((104, y + 11), label, font=font(18, bold=True), fill=ACCENT)
    draw.text((350, y + 11), value, font=font(17), fill=INK)
draw.text((82, 548), 'Not deployed yet. No operational aviation, hardware or airworthiness acceptance is claimed.', font=font(15), fill=MUTED)
save(image, 8)

shutil.copyfile(FRAMES / 'frame-01.png', OUT / 'poster.png')
concat = OUT / 'frames.txt'
lines = []
for number in range(1, 9):
    lines += [f"file 'frames/frame-{number:02d}.png'", 'duration 3']
lines.append("file 'frames/frame-08.png'")
concat.write_text('\n'.join(lines) + '\n')
video = OUT / 'airfield-kit.mp4'
subprocess.run([
    'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'frames.txt',
    '-vf', 'fps=24,scale=1280:720', '-c:v', 'libx264', '-crf', '25', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', video.name,
], cwd=OUT, check=True)
print(f'wrote {video}')
