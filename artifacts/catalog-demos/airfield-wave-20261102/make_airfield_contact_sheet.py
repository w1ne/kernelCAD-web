#!/usr/bin/env python3
"""Assemble all rendered airfield previews for visual review."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
index = json.loads((ROOT / 'catalog/index.json').read_text())
assets = sorted((asset for asset in index['assets'] if asset['kit'] == 'airfield'), key=lambda asset: asset['id'])
cell_w, image_h, label_h = 240, 205, 34
columns = 5
rows = (len(assets) + columns - 1) // columns
sheet = Image.new('RGB', (columns * cell_w, 48 + rows * (image_h + label_h)), '#101923')
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
draw.text((18, 13), 'Airfield catalog previews · 40 generated meshes', fill='#e8eff6', font=font)
for i, asset in enumerate(assets):
    x = (i % columns) * cell_w
    y = 48 + (i // columns) * (image_h + label_h)
    path = ROOT / 'catalog' / 'kits' / 'airfield' / 'previews' / f"{asset['id']}.png"
    image = Image.open(path).convert('RGB')
    image.thumbnail((cell_w - 12, image_h - 8), Image.Resampling.LANCZOS)
    sheet.paste(image, (x + (cell_w - image.width) // 2, y + (image_h - image.height) // 2))
    title = asset['title']
    draw.text((x + 8, y + image_h + 3), title[:31], fill='#d6e0e9', font=font)
sheet.save(OUT / 'preview-contact-sheet.png', quality=92)
print(f'contact sheet includes {len(assets)} rendered previews')
